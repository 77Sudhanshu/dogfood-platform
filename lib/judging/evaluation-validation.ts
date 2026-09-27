export type EvaluationCriterion = {
  id: string;
  name: string;
  maxScore: number;
};

export type SubmittedEvaluationScore = {
  criterionId: string;
  score: number;
};

export type ValidationResult =
  | {
      valid: true;
    }
  | {
      valid: false;
      error: string;
    };

export function validateEvaluationScores(
  criteria: EvaluationCriterion[],
  scores: SubmittedEvaluationScore[],
): ValidationResult {
  if (scores.length === 0) {
    return {
      valid: false,
      error: "At least one criterion must be scored",
    };
  }

  const criterionMap = new Map(
    criteria.map((criterion) => [criterion.id, criterion]),
  );

  const submittedCriterionIds = scores.map(
    (score) => score.criterionId,
  );

  const uniqueCriterionIds = new Set(
    submittedCriterionIds,
  );

  if (
    uniqueCriterionIds.size !==
    submittedCriterionIds.length
  ) {
    return {
      valid: false,
      error: "A criterion cannot be scored more than once",
    };
  }

  for (const submittedScore of scores) {
    const criterion = criterionMap.get(
      submittedScore.criterionId,
    );

    if (!criterion) {
      return {
        valid: false,
        error: `Invalid criterion: ${submittedScore.criterionId}`,
      };
    }

    if (submittedScore.score > criterion.maxScore) {
      return {
        valid: false,
        error: `Score for "${criterion.name}" cannot exceed ${criterion.maxScore}`,
      };
    }

    if (submittedScore.score < 0) {
      return {
        valid: false,
        error: `Score for "${criterion.name}" cannot be negative`,
      };
    }
  }

  if (uniqueCriterionIds.size !== criteria.length) {
    return {
      valid: false,
      error: "All rubric criteria must be scored",
    };
  }

  return {
    valid: true,
  };
}