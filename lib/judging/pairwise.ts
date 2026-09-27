export type PairwiseResult = {
  judgeId: string;
  projectAId: string;
  projectBId: string;
  winnerProjectId: string | null;
};

export type PairwiseProjectStats = {
  projectId: string;
  comparisons: number;
  wins: number;
  losses: number;
  ties: number;
};

export function calculatePairwiseStats(
  results: PairwiseResult[],
): PairwiseProjectStats[] {
  const stats = new Map<string, PairwiseProjectStats>();

  const getStats = (projectId: string) => {
    if (!stats.has(projectId)) {
      stats.set(projectId, {
        projectId,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
      });
    }

    return stats.get(projectId)!;
  };

  for (const result of results) {
    const a = getStats(result.projectAId);
    const b = getStats(result.projectBId);

    a.comparisons++;
    b.comparisons++;

    if (result.winnerProjectId === null) {
      a.ties++;
      b.ties++;
    } else if (result.winnerProjectId === result.projectAId) {
      a.wins++;
      b.losses++;
    } else if (result.winnerProjectId === result.projectBId) {
      b.wins++;
      a.losses++;
    }
  }

  return Array.from(stats.values());
}