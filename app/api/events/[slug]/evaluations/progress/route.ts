import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

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
        projectId: true,
        assignedAt: true,
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
      orderBy: {
        assignedAt: "asc",
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
      },
    });

    const evaluatedProjectIds = new Set(
      evaluations.map((evaluation) => evaluation.projectId)
    );

    const completed = assignments.filter((assignment) =>
      evaluatedProjectIds.has(assignment.projectId)
    );

    const remaining = assignments.filter(
      (assignment) =>
        !evaluatedProjectIds.has(assignment.projectId)
    );

    const total = assignments.length;

    const progress =
      total === 0
        ? 0
        : Math.round((completed.length / total) * 100);

    return NextResponse.json({
      event,
      judge,
      summary: {
        total,
        completed: completed.length,
        remaining: remaining.length,
        progress,
      },
      completed,
      remaining,
    });
  } catch (error) {
    console.error("Judge progress error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch judge progress",
      },
      { status: 500 }
    );
  }
}