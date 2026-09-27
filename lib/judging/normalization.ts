export type RawJudgeResult = {
  evaluationId: string;
  projectId: string;
  projectName: string;
  judgeId: string;
  judgeName: string;
  rawScore: number;
};

export type JudgeStatistics = {
  mean: number;
  standardDeviation: number;
  sampleSize: number;
};

export type NormalizedJudgeResult = RawJudgeResult & {
  normalizedScore: number;
  zScore: number | null;
  normalizationApplied: boolean;
  judgeStatistics: JudgeStatistics;
};

export function calculateJudgeNormalization(
  rawResults: RawJudgeResult[],
): NormalizedJudgeResult[] {
  const scoresByJudge = new Map<string, number[]>();

  for (const result of rawResults) {
    const scores = scoresByJudge.get(result.judgeId) ?? [];
    scores.push(result.rawScore);
    scoresByJudge.set(result.judgeId, scores);
  }

  const judgeStatistics = new Map<string, JudgeStatistics>();

  for (const [judgeId, scores] of scoresByJudge.entries()) {
    const mean =
      scores.reduce((sum, score) => sum + score, 0) /
      scores.length;

    const variance =
      scores.reduce(
        (sum, score) => sum + Math.pow(score - mean, 2),
        0,
      ) / scores.length;

    const standardDeviation = Math.sqrt(variance);

    judgeStatistics.set(judgeId, {
      mean,
      standardDeviation,
      sampleSize: scores.length,
    });
  }

  return rawResults.map((result) => {
    const stats = judgeStatistics.get(result.judgeId)!;

    let zScore: number | null = null;
    let normalizedScore = result.rawScore;
    let normalizationApplied = false;

    if (
      stats.sampleSize > 1 &&
      stats.standardDeviation > 0
    ) {
      zScore =
        (result.rawScore - stats.mean) /
        stats.standardDeviation;

      normalizedScore = 50 + zScore * 10;

      normalizedScore = Math.max(
        0,
        Math.min(100, normalizedScore),
      );

      normalizedScore = Number(
        normalizedScore.toFixed(2),
      );

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
      judgeStatistics: {
        ...stats,
        mean: Number(stats.mean.toFixed(2)),
        standardDeviation: Number(
          stats.standardDeviation.toFixed(2),
        ),
      },
    };
  });
}