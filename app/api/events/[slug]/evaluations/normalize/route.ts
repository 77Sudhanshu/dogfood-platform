import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";
import { calculateJudgeNormalization } from "@/lib/judging/normalization";
import { calculateWeightedScore } from "@/lib/judging/scoring";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

type RawResult = {
  evaluationId: string;
  projectId: string;
  projectName: string;
  judgeId: string;
  judgeName: string;
  rawScore: number;
};

export async function GET(
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
        name: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const evaluations = await prisma.evaluation.findMany({
      where: {
        project: {
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
        scores: {
          include: {
            criterion: true,
          },
        },
      },
      orderBy: {
        submittedAt: "asc",
      },
    });

    // Step 1: Calculate weighted raw score for every evaluation.
    const rawResults: RawResult[] = evaluations.map(
      (evaluation) => {
        const rawScore = calculateWeightedScore(
  evaluation.scores.map((score) => ({
    score: Number(score.score),
    maxScore: Number(score.criterion.maxScore),
    weight: Number(score.criterion.weight),
  })),
);

        return {
          evaluationId: evaluation.id,
          projectId: evaluation.projectId,
          projectName: evaluation.project.name,
          judgeId: evaluation.judgeId,
          judgeName: evaluation.judge.user.name,
          rawScore: Number(rawScore.toFixed(2)),
        };
      }
    );

    const results = calculateJudgeNormalization(rawResults);

    return NextResponse.json({
      event,
      method: "judge-z-score",
      explanation:
        "Raw weighted scores are standardized within each judge using the judge mean and standard deviation. Judges with insufficient score variance retain their raw score.",
      results,
    });
  } catch (error) {
    console.error(
      "Normalization error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to calculate normalized scores",
      },
      { status: 500 }
    );
  }
}