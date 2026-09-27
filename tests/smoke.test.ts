import { describe, expect, it } from "vitest";
import { calculateJudgeNormalization } from "../lib/judging/normalization";
import { calculateWeightedScore } from "../lib/judging/scoring";
import { validateEvaluationScores } from "../lib/judging/evaluation-validation";
import { generateBalancedAssignments } from "../lib/judging/assignment";
import { calculatePairwiseStats } from "@/lib/judging/pairwise";

describe("Judge score normalization", () => {
  it("calculates z-score normalization across evaluations", () => {
    const results = calculateJudgeNormalization([
      {
        evaluationId: "e1",
        projectId: "p1",
        projectName: "Project A",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 60,
      },
      {
        evaluationId: "e2",
        projectId: "p2",
        projectName: "Project B",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 80,
      },
      {
        evaluationId: "e3",
        projectId: "p3",
        projectName: "Project C",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 100,
      },
    ]);

    expect(results).toHaveLength(3);

    expect(results[0].normalizationApplied).toBe(true);
    expect(results[1].normalizationApplied).toBe(true);
    expect(results[2].normalizationApplied).toBe(true);

    expect(results[1].normalizedScore).toBe(50);

    expect(results[0].normalizedScore).toBeCloseTo(37.75, 2);
    expect(results[2].normalizedScore).toBeCloseTo(62.25, 2);
  });

  it("does not normalize when a judge has only one evaluation", () => {
    const results = calculateJudgeNormalization([
      {
        evaluationId: "e1",
        projectId: "p1",
        projectName: "Project A",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 86,
      },
    ]);

    expect(results[0].normalizedScore).toBe(86);
    expect(results[0].zScore).toBeNull();
    expect(results[0].normalizationApplied).toBe(false);
  });

  it("does not normalize when all scores are identical", () => {
    const results = calculateJudgeNormalization([
      {
        evaluationId: "e1",
        projectId: "p1",
        projectName: "Project A",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 80,
      },
      {
        evaluationId: "e2",
        projectId: "p2",
        projectName: "Project B",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 80,
      },
    ]);

    expect(results[0].normalizedScore).toBe(80);
    expect(results[1].normalizedScore).toBe(80);

    expect(results[0].normalizationApplied).toBe(false);
    expect(results[1].normalizationApplied).toBe(false);
  });

  it("normalizes judges independently", () => {
    const results = calculateJudgeNormalization([
      {
        evaluationId: "e1",
        projectId: "p1",
        projectName: "Project A",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 60,
      },
      {
        evaluationId: "e2",
        projectId: "p2",
        projectName: "Project B",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 80,
      },
      {
        evaluationId: "e3",
        projectId: "p3",
        projectName: "Project C",
        judgeId: "j2",
        judgeName: "Judge 2",
        rawScore: 80,
      },
      {
        evaluationId: "e4",
        projectId: "p4",
        projectName: "Project D",
        judgeId: "j2",
        judgeName: "Judge 2",
        rawScore: 100,
      },
    ]);

    expect(results).toHaveLength(4);

    expect(results[0].judgeStatistics.sampleSize).toBe(2);
    expect(results[2].judgeStatistics.sampleSize).toBe(2);

    expect(results[0].normalizedScore).toBe(40);
    expect(results[1].normalizedScore).toBe(60);

    expect(results[2].normalizedScore).toBe(40);
    expect(results[3].normalizedScore).toBe(60);
  });

  it("keeps normalized scores within 0 to 100", () => {
    const results = calculateJudgeNormalization([
      {
        evaluationId: "e1",
        projectId: "p1",
        projectName: "Project A",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 0,
      },
      {
        evaluationId: "e2",
        projectId: "p2",
        projectName: "Project B",
        judgeId: "j1",
        judgeName: "Judge 1",
        rawScore: 100,
      },
    ]);

    for (const result of results) {
      expect(result.normalizedScore).toBeGreaterThanOrEqual(0);
      expect(result.normalizedScore).toBeLessThanOrEqual(100);
    }
  });
});
describe("Weighted rubric scoring", () => {
  it("calculates a weighted score correctly", () => {
    const score = calculateWeightedScore([
      {
        score: 8,
        maxScore: 10,
        weight: 25,
      },
      {
        score: 9,
        maxScore: 10,
        weight: 25,
      },
      {
        score: 8,
        maxScore: 10,
        weight: 25,
      },
      {
        score: 9,
        maxScore: 10,
        weight: 15,
      },
      {
        score: 8,
        maxScore: 10,
        weight: 10,
      },
    ]);

    expect(score).toBe(84);
  });

  it("returns zero when total weight is zero", () => {
    const score = calculateWeightedScore([
      {
        score: 10,
        maxScore: 10,
        weight: 0,
      },
    ]);

    expect(score).toBe(0);
  });

  it("handles a zero maximum score safely", () => {
    const score = calculateWeightedScore([
      {
        score: 10,
        maxScore: 0,
        weight: 100,
      },
    ]);

    expect(score).toBe(0);
  });

  it("supports different maximum scores", () => {
    const score = calculateWeightedScore([
      {
        score: 5,
        maxScore: 5,
        weight: 50,
      },
      {
        score: 7,
        maxScore: 10,
        weight: 50,
      },
    ]);

    expect(score).toBe(85);
  });
});
describe("Evaluation score validation", () => {
  const criteria = [
    {
      id: "innovation",
      name: "Innovation",
      maxScore: 10,
    },
    {
      id: "technical",
      name: "Technical Quality",
      maxScore: 10,
    },
    {
      id: "impact",
      name: "Impact & Usefulness",
      maxScore: 10,
    },
  ];

  it("accepts a complete valid evaluation", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "innovation", score: 8 },
      { criterionId: "technical", score: 9 },
      { criterionId: "impact", score: 8 },
    ]);

    expect(result.valid).toBe(true);
  });

  it("rejects a score above the maximum", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "innovation", score: 11 },
      { criterionId: "technical", score: 9 },
      { criterionId: "impact", score: 8 },
    ]);

    expect(result.valid).toBe(false);

if (result.valid) {
  return;
}

expect(result.error).toContain("cannot exceed 10");
  });

  it("rejects an invalid criterion", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "unknown", score: 8 },
      { criterionId: "technical", score: 9 },
      { criterionId: "impact", score: 8 },
    ]);

    expect(result.valid).toBe(false);

if (result.valid) {
  return;
}

expect(result.error).toContain("Invalid criterion");
  });

  it("rejects duplicate criteria", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "innovation", score: 8 },
      { criterionId: "innovation", score: 9 },
      { criterionId: "impact", score: 8 },
    ]);

    expect(result.valid).toBe(false);

if (result.valid) {
  return;
}

expect(result.error).toContain(
  "cannot be scored more than once",
);
  });

  it("rejects incomplete evaluations", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "innovation", score: 8 },
      { criterionId: "technical", score: 9 },
    ]);

    expect(result.valid).toBe(false);

if (result.valid) {
  return;
}

expect(result.error).toContain("All rubric criteria must be scored");
  });

  it("rejects negative scores", () => {
    const result = validateEvaluationScores(criteria, [
      { criterionId: "innovation", score: -1 },
      { criterionId: "technical", score: 9 },
      { criterionId: "impact", score: 8 },
    ]);

    expect(result.valid).toBe(false);

if (result.valid) {
  return;
}

expect(result.error).toContain("cannot be negative");
  });
});
describe("Balanced judge assignment", () => {
  it("assigns the requested number of judges to every project", () => {
    const assignments = generateBalancedAssignments(
      ["J1", "J2", "J3"],
      ["P1", "P2", "P3"],
      2,
    );

    expect(assignments).toHaveLength(6);

    for (const projectId of ["P1", "P2", "P3"]) {
      const projectAssignments = assignments.filter(
        (assignment) => assignment.projectId === projectId,
      );

      expect(projectAssignments).toHaveLength(2);
    }
  });

  it("does not assign the same judge twice to one project", () => {
    const assignments = generateBalancedAssignments(
      ["J1", "J2", "J3"],
      ["P1", "P2", "P3"],
      2,
    );

    for (const projectId of ["P1", "P2", "P3"]) {
      const judges = assignments
        .filter(
          (assignment) =>
            assignment.projectId === projectId,
        )
        .map((assignment) => assignment.judgeId);

      expect(new Set(judges).size).toBe(judges.length);
    }
  });

  it("balances assignments across judges", () => {
    const assignments = generateBalancedAssignments(
      ["J1", "J2", "J3"],
      ["P1", "P2", "P3", "P4", "P5", "P6"],
      2,
    );

    const counts = new Map<string, number>();

    for (const assignment of assignments) {
      counts.set(
        assignment.judgeId,
        (counts.get(assignment.judgeId) ?? 0) + 1,
      );
    }

    expect(counts.get("J1")).toBe(4);
    expect(counts.get("J2")).toBe(4);
    expect(counts.get("J3")).toBe(4);
  });

  it("handles fewer judges than requested", () => {
    const assignments = generateBalancedAssignments(
      ["J1"],
      ["P1", "P2"],
      3,
    );

    expect(assignments).toHaveLength(2);

    expect(assignments).toEqual([
      { judgeId: "J1", projectId: "P1" },
      { judgeId: "J1", projectId: "P2" },
    ]);
  });

  it("returns no assignments when there are no judges or projects", () => {
    expect(
      generateBalancedAssignments([], ["P1"], 2),
    ).toEqual([]);

    expect(
      generateBalancedAssignments(["J1"], [], 2),
    ).toEqual([]);
  });
});
describe("Pairwise judging", () => {
  it("calculates wins and losses correctly", () => {
    const results = [
      {
        judgeId: "judge-1",
        projectAId: "project-a",
        projectBId: "project-b",
        winnerProjectId: "project-a",
      },
    ];

    expect(calculatePairwiseStats(results)).toEqual([
      {
        projectId: "project-a",
        comparisons: 1,
        wins: 1,
        losses: 0,
        ties: 0,
      },
      {
        projectId: "project-b",
        comparisons: 1,
        wins: 0,
        losses: 1,
        ties: 0,
      },
    ]);
  });

  it("handles ties", () => {
    const results = [
      {
        judgeId: "judge-1",
        projectAId: "project-a",
        projectBId: "project-b",
        winnerProjectId: null,
      },
    ];

    expect(calculatePairwiseStats(results)).toEqual([
      {
        projectId: "project-a",
        comparisons: 1,
        wins: 0,
        losses: 0,
        ties: 1,
      },
      {
        projectId: "project-b",
        comparisons: 1,
        wins: 0,
        losses: 0,
        ties: 1,
      },
    ]);
  });
});