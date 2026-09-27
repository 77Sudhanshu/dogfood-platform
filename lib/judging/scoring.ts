export type CriterionScore = {
  score: number;
  maxScore: number;
  weight: number;
};

export function calculateWeightedScore(
  scores: CriterionScore[],
): number {
  let weightedScore = 0;
  let totalWeight = 0;

  for (const item of scores) {
    const normalizedScore =
      item.maxScore === 0
        ? 0
        : item.score / item.maxScore;

    weightedScore += normalizedScore * item.weight;
    totalWeight += item.weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Number(
    ((weightedScore / totalWeight) * 100).toFixed(2),
  );
}