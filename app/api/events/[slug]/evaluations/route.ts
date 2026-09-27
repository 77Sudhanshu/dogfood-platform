import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";
import { validateEvaluationScores } from "@/lib/judging/evaluation-validation";

const scoreSchema = z.object({
  criterionId: z.string(),
  score: z.number().min(0),
});

const evaluationSchema = z.object({
  projectId: z.string(),
  comment: z.string().max(5000).optional(),
  scores: z.array(scoreSchema).min(1),
});

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try 
  {
    // Only judges can submit evaluations
    const auth = await requireRole(request, ["JUDGE"]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: auth.status }
      );
    }

    const { slug } = await context.params;

    // Find the event
    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });
   

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get the judge record for the logged-in user
    const judge = await prisma.judge.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: auth.user.id,
        },
      },
    });

    if (!judge) {
      return NextResponse.json(
        {
          error: "You are not registered as a judge for this event",
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    const result = evaluationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid evaluation data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { projectId, comment, scores } = result.data;
    const project = await prisma.project.findUnique({
  where: {
    id: projectId.trim(),
  },
  select: {
    id: true,
    name: true,
    eventId: true,
    status: true,
  },
});

    if (!project) {
  return NextResponse.json(
    {
      error: "Project not found",
    },
    { status: 404 }
  );
}

if (project.eventId !== event.id) {
  return NextResponse.json(
    {
      error: "Project does not belong to this event",
    },
    { status: 403 }
  );
}

    // Only submitted projects can be judged
    if (project.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: "Only submitted projects can be evaluated",
        },
        { status: 400 }
      );
    }

    // Check that this judge is actually assigned to this project
    const assignment = await prisma.judgeAssignment.findUnique({
      where: {
        judgeId_projectId: {
          judgeId: judge.id,
          projectId: project.id,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        {
          error: "You are not assigned to judge this project",
        },
        { status: 403 }
      );
    }

    // Prevent duplicate evaluation
    const existingEvaluation = await prisma.evaluation.findUnique({
      where: {
        judgeId_projectId: {
          judgeId: judge.id,
          projectId: project.id,
        },
      },
    });

    if (existingEvaluation) {
      return NextResponse.json(
        {
          error: "You have already evaluated this project",
          evaluationId: existingEvaluation.id,
        },
        { status: 409 }
      );
    }

    // Get all rubric criteria for this event
    const rubric = await prisma.rubric.findFirst({
  where: {
    eventId: event.id,
    name: "Final Judging Rubric",
  },
  select: {
    id: true,
    name: true,
  },
});

if (!rubric) {
  return NextResponse.json(
    {
      error: "Final judging rubric has not been configured for this event",
    },
    { status: 400 }
  );
}

const criteria = await prisma.rubricCriterion.findMany({
  where: {
    rubricId: rubric.id,
  },
  select: {
    id: true,
    name: true,
    description: true,
    maxScore: true,
    weight: true,
  },
});

    if (criteria.length === 0) {
      return NextResponse.json(
        {
          error: "No rubric criteria have been configured for this event",
        },
        { status: 400 }
      );
    }

    const validation = validateEvaluationScores(
  criteria.map((criterion) => ({
    id: criterion.id,
    name: criterion.name,
    maxScore: criterion.maxScore,
  })),
  scores.map((score) => ({
    criterionId: score.criterionId,
    score: score.score,
  })),
);

if (!validation.valid) {
  return NextResponse.json(
    {
      error: validation.error,
    },
    { status: 400 },
  );
}


    // Create evaluation and all scores atomically
    const evaluation = await prisma.$transaction(async (tx) => {
      const createdEvaluation = await tx.evaluation.create({
        data: {
          judgeId: judge.id,
          projectId: project.id,
          comment,
          submittedAt: new Date(),
        },
      });

      await tx.evaluationScore.createMany({
        data: scores.map((score) => ({
          evaluationId: createdEvaluation.id,
          criterionId: score.criterionId,
          score: score.score,
        })),
      });

      await tx.auditLog.create({
  data: {
    action: "EVALUATION_SUBMITTED",
    entity: "Evaluation",
    entityId: createdEvaluation.id,
    actorId: auth.user.id,
    metadata: {
      projectId: project.id,
      judgeId: judge.id,
      scoreCount: scores.length,
    },
  },
});

      return tx.evaluation.findUnique({
        where: {
          id: createdEvaluation.id,
        },
        include: {
          scores: {
            include: {
              criterion: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: "Evaluation submitted successfully",
        evaluation,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit evaluation error:", error);

    return NextResponse.json(
      {
        error: "Failed to submit evaluation",
      },
      { status: 500 }
    );
  }
}
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireRole(request, ["JUDGE"]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: auth.status }
      );
    }

    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const judge = await prisma.judge.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!judge) {
      return NextResponse.json(
        {
          error: "You are not registered as a judge for this event",
        },
        { status: 403 }
      );
    }

    const assignments = await prisma.judgeAssignment.findMany({
      where: {
        judgeId: judge.id,
      },
      select: {
        id: true,
        assignedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            githubUrl: true,
            demoUrl: true,
            videoUrl: true,
            technologies: true,
            status: true,
            submittedAt: true,
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: "asc",
      },
    });

    const rubric = await prisma.rubric.findFirst({
  where: {
    eventId: event.id,
    name: "Final Judging Rubric",
  },
  select: {
    id: true,
    name: true,
  },
});

if (!rubric) {
  return NextResponse.json(
    {
      error: "Final judging rubric has not been configured for this event",
    },
    { status: 400 }
  );
}

const criteria = await prisma.rubricCriterion.findMany({
  where: {
    rubricId: rubric.id,
  },
  select: {
    id: true,
    name: true,
    description: true,
    weight: true,
    maxScore: true,
  },
  orderBy: {
    id: "asc",
  },
});

    const evaluations = await prisma.evaluation.findMany({
      where: {
        judgeId: judge.id,
      },
      select: {
        id: true,
        projectId: true,
        submittedAt: true,
        comment: true,
        scores: {
          select: {
            criterionId: true,
            score: true,
          },
        },
      },
    });

    return NextResponse.json({
  event,
  judge,
  rubric,
  assignments,
  criteria,
  evaluations,
});
  } catch (error) {
    console.error("Get judge evaluation data error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch evaluation data",
      },
      { status: 500 }
    );
  }
}