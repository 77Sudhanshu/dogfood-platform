import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const assignmentSchema = z.object({
  judgeId: z.string(),
  projectId: z.string(),
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
  try {
    const auth = await requireRole(request, [
      "ORGANIZER",
      "ADMIN",
    ]);

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
      },
    });

    console.log("ASSIGNMENT EVENT DEBUG:", { slug, event });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

console.log("ASSIGNMENT BODY DEBUG:", body);
console.log("ASSIGNMENT BODY TYPES:", {
  judgeId: typeof body?.judgeId,
  projectId: typeof body?.projectId,
});

const result = assignmentSchema.safeParse(body);

console.log("ASSIGNMENT VALIDATION DEBUG:", result);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid assignment data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { judgeId, projectId } = result.data;
    console.log("ASSIGNMENT IDs:", { judgeId, projectId });

const judge = await prisma.judge.findUnique({
  where: {
    id: judgeId,
  },
  include: {
    user: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
  },
});

console.log("JUDGE DIRECT DEBUG:", judge);
console.log("EXPECTED EVENT ID:", event.id);
console.log("ASSIGNMENT JUDGE DEBUG:", {
  judgeId,
  eventId: event.id,
  judge,
});

    if (!judge) {
      return NextResponse.json(
        {
          error: "Judge is not registered for this event",
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        name: true,
        eventId: true,
        status: true,
      },
    });
    
    console.log("ASSIGNMENT PROJECT DEBUG:", { projectId, project });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.eventId !== event.id) {
      return NextResponse.json(
        {
          error: "Project does not belong to this event",
        },
        { status: 400 }
      );
    }

    if (project.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: "Only submitted projects can be assigned to judges",
        },
        { status: 400 }
      );
    }

    const existingAssignment =
      await prisma.judgeAssignment.findUnique({
        where: {
          judgeId_projectId: {
            judgeId: judge.id,
            projectId: project.id,
          },
        },
      });

    if (existingAssignment) {
      return NextResponse.json(
        {
          error: "Judge is already assigned to this project",
        },
        { status: 409 }
      );
    }

    const assignment = await prisma.judgeAssignment.create({
      data: {
        judgeId: judge.id,
        projectId: project.id,
      },
      include: {
        judge: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
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

    return NextResponse.json(
      {
        message: "Judge assigned successfully",
        assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Judge assignment error:", error);

    return NextResponse.json(
      {
        error: "Failed to assign judge",
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
    const auth = await requireRole(request, ["JUDGE", "ORGANIZER", "ADMIN"]);

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
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const url = new URL(request.url);
    const requestedJudgeId = url.searchParams.get("judgeId");

    let judgeId = requestedJudgeId;

    // Judges can only request their own assignments.
    if (auth.user.role === "JUDGE") {
      const judge = await prisma.judge.findFirst({
        where: {
          userId: auth.user.id,
          eventId: event.id,
        },
        select: {
          id: true,
        },
      });

      if (!judge) {
        return NextResponse.json(
          { error: "Judge is not registered for this event" },
          { status: 400 }
        );
      }

      judgeId = judge.id;
    }

    const assignments = await prisma.judgeAssignment.findMany({
      where: {
        judgeId: judgeId || undefined,
        judge: {
          eventId: event.id,
        },
      },
      include: {
        judge: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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

    return NextResponse.json({
      event,
      assignments,
    });
  } catch (error) {
    console.error("Get assignments error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch assignments",
      },
      { status: 500 }
    );
  }
}