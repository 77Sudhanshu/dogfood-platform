import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const pairwiseSchema = z.object({
  projectAId: z.string().min(1),
  projectBId: z.string().min(1),
  winnerProjectId: z.string().nullable(),
  comment: z.string().max(5000).optional(),
});

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const auth = await requireRole(request, ["JUDGE"]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: auth.status },
      );
    }

    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
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
      },
    });

    if (!judge) {
      return NextResponse.json(
        {
          error: "You are not registered as a judge for this event",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const result = pairwiseSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid pairwise comparison data",
          details: result.error.flatten(),
        },
        { status: 400 },
      );
    }

    const {
      projectAId,
      projectBId,
      winnerProjectId,
      comment,
    } = result.data;

    const normalizedA = projectAId.trim();
    const normalizedB = projectBId.trim();
    const normalizedWinner = winnerProjectId?.trim() ?? null;

    if (normalizedA === normalizedB) {
      return NextResponse.json(
        {
          error: "A project cannot be compared against itself",
        },
        { status: 400 },
      );
    }

    if (
      normalizedWinner !== null &&
      normalizedWinner !== normalizedA &&
      normalizedWinner !== normalizedB
    ) {
      return NextResponse.json(
        {
          error: "Winner must be one of the compared projects or null for a tie",
        },
        { status: 400 },
      );
    }

    const projects = await prisma.project.findMany({
      where: {
        id: {
          in: [normalizedA, normalizedB],
        },
      },
      select: {
        id: true,
        name: true,
        eventId: true,
        status: true,
      },
    });

    if (projects.length !== 2) {
      return NextResponse.json(
        { error: "Both projects must exist" },
        { status: 404 },
      );
    }

    const projectA = projects.find(
      (project) => project.id === normalizedA,
    )!;
    const projectB = projects.find(
      (project) => project.id === normalizedB,
    )!;

    if (
      projectA.eventId !== event.id ||
      projectB.eventId !== event.id
    ) {
      return NextResponse.json(
        {
          error: "Both projects must belong to this event",
        },
        { status: 403 },
      );
    }

    if (
      projectA.status !== "SUBMITTED" ||
      projectB.status !== "SUBMITTED"
    ) {
      return NextResponse.json(
        {
          error: "Only submitted projects can be compared",
        },
        { status: 400 },
      );
    }

    const [assignmentA, assignmentB] = await Promise.all([
      prisma.judgeAssignment.findUnique({
        where: {
          judgeId_projectId: {
            judgeId: judge.id,
            projectId: projectA.id,
          },
        },
      }),
      prisma.judgeAssignment.findUnique({
        where: {
          judgeId_projectId: {
            judgeId: judge.id,
            projectId: projectB.id,
          },
        },
      }),
    ]);

    if (!assignmentA || !assignmentB) {
      return NextResponse.json(
        {
          error:
            "You must be assigned to both projects before comparing them",
        },
        { status: 403 },
      );
    }

    // Canonicalize the pair so A/B and B/A are treated as the same comparison.
    const [canonicalA, canonicalB] =
      normalizedA < normalizedB
        ? [normalizedA, normalizedB]
        : [normalizedB, normalizedA];

    const canonicalWinner =
      normalizedWinner === null
        ? null
        : normalizedWinner;

    const existing = await prisma.pairwiseComparison.findFirst({
      where: {
        judgeId: judge.id,
        OR: [
          {
            projectAId: canonicalA,
            projectBId: canonicalB,
          },
          {
            projectAId: canonicalB,
            projectBId: canonicalA,
          },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: "You have already compared these two projects",
          comparisonId: existing.id,
        },
        { status: 409 },
      );
    }

    const comparison = await prisma.$transaction(async (tx) => {
      const created = await tx.pairwiseComparison.create({
        data: {
          judgeId: judge.id,
          projectAId: canonicalA,
          projectBId: canonicalB,
          winnerProjectId: canonicalWinner,
          comment,
        },
      });

      await tx.auditLog.create({
        data: {
          action: "PAIRWISE_COMPARISON_SUBMITTED",
          entity: "PairwiseComparison",
          entityId: created.id,
          actorId: auth.user.id,
          eventId: event.id,
          metadata: {
            projectAId: canonicalA,
            projectBId: canonicalB,
            winnerProjectId: canonicalWinner,
            judgeId: judge.id,
          },
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        message: "Pairwise comparison submitted successfully",
        comparison,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Submit pairwise comparison error:", error);

    return NextResponse.json(
      {
        error: "Failed to submit pairwise comparison",
      },
      { status: 500 },
    );
  }
}
export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
    const auth = await requireRole(request, ["JUDGE"]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: auth.status },
      );
    }

    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 },
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
      },
    });

    if (!judge) {
      return NextResponse.json(
        {
          error: "You are not registered as a judge for this event",
        },
        { status: 403 },
      );
    }

    const comparisons = await prisma.pairwiseComparison.findMany({
      where: {
        judgeId: judge.id,
        projectA: {
          eventId: event.id,
        },
        projectB: {
          eventId: event.id,
        },
      },
      select: {
        id: true,
        projectAId: true,
        projectBId: true,
        winnerProjectId: true,
        comment: true,
        createdAt: true,
        projectA: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        projectB: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      event,
      judge,
      comparisons,
    });
  } catch (error) {
    console.error("Get pairwise comparisons error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch pairwise comparisons",
      },
      { status: 500 },
    );
  }
}