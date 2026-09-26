import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

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
        let weightedScore = 0;
        let totalWeight = 0;

        for (const score of evaluation.scores) {
          const scoreValue = Number(score.score);
          const maxScore = Number(score.criterion.maxScore);
          const weight = Number(score.criterion.weight);

          const normalizedScore =
            maxScore === 0
              ? 0
              : scoreValue / maxScore;

          weightedScore +=
            normalizedScore * weight;

          totalWeight += weight;
        }

        const rawScore =
          totalWeight === 0
            ? 0
            : (weightedScore / totalWeight) * 100;

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

    // Step 2: Group scores by judge.
    const scoresByJudge = new Map<
      string,
      number[]
    >();

    for (const result of rawResults) {
      const scores =
        scoresByJudge.get(result.judgeId) ?? [];

      scores.push(result.rawScore);

      scoresByJudge.set(
        result.judgeId,
        scores
      );
    }

    // Step 3: Calculate mean and standard deviation
    // for each judge.
    const judgeStatistics = new Map<
      string,
      {
        mean: number;
        standardDeviation: number;
        sampleSize: number;
      }
    >();

    for (const [
      judgeId,
      scores,
    ] of scoresByJudge.entries()) {
      const mean =
        scores.reduce(
          (sum, score) => sum + score,
          0
        ) / scores.length;

      const variance =
        scores.reduce(
          (sum, score) =>
            sum + Math.pow(score - mean, 2),
          0
        ) / scores.length;

      const standardDeviation =
        Math.sqrt(variance);

      judgeStatistics.set(judgeId, {
        mean: Number(mean.toFixed(2)),
        standardDeviation:
          Number(standardDeviation.toFixed(2)),
        sampleSize: scores.length,
      });
    }

    // Step 4: Calculate cross-judge normalized scores.
    const results = rawResults.map((result) => {
      const stats =
        judgeStatistics.get(result.judgeId)!;

      let zScore: number | null = null;
      let normalizedScore = result.rawScore;
      let normalizationApplied = false;

      // A single evaluation or zero standard deviation
      // does not provide enough information for z-score
      // normalization.
      if (
        stats.sampleSize > 1 &&
        stats.standardDeviation > 0
      ) {
        zScore =
          (result.rawScore - stats.mean) /
          stats.standardDeviation;

        // Convert z-score to a readable 0-100 scale.
        normalizedScore =
          50 + zScore * 10;

        // Keep the public score inside 0-100.
        normalizedScore = Math.max(
          0,
          Math.min(100, normalizedScore)
        );

        normalizedScore =
          Number(normalizedScore.toFixed(2));

        normalizationApplied = true;
      }

      return {
        ...result,
        normalizedScore,
        zScore:
          zScore === null
            ? null
            : Number(zScore.toFixed(4)),
        normalizationApplied,
        judgeStatistics: stats,
      };
    });

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