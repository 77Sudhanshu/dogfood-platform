export type JudgeAssignmentPair = {
  judgeId: string;
  projectId: string;
};

export function generateBalancedAssignments(
  judgeIds: string[],
  projectIds: string[],
  judgesPerProject = 2,
): JudgeAssignmentPair[] {
  if (judgeIds.length === 0 || projectIds.length === 0) {
    return [];
  }

  if (judgesPerProject < 1) {
    return [];
  }

  const target = Math.min(judgesPerProject, judgeIds.length);

  const assignments: JudgeAssignmentPair[] = [];

  for (let projectIndex = 0; projectIndex < projectIds.length; projectIndex++) {
    const projectId = projectIds[projectIndex];

    for (let offset = 0; offset < target; offset++) {
      const judgeIndex =
        (projectIndex + offset) % judgeIds.length;

      assignments.push({
        judgeId: judgeIds[judgeIndex],
        projectId,
      });
    }
  }

  return assignments;
}