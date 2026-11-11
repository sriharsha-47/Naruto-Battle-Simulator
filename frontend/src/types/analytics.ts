export interface AIWinRateStat {
  strategy: string;
  winRate: number;
  totalBattles: number;
  wins: number;
  losses: number;
  color: string;
}

export interface DecisionTimeStat {
  strategy: string;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
}

export interface NodesExploredStat {
  strategy: string;
  avgNodes: number;
  peakNodes: number;
}

export interface BattleDurationStat {
  rounds: string;
  count: number;
}

export interface CharacterDamageEfficiency {
  subject: string;
  attackEfficiency: number;
  chakraEfficiency: number;
  defenseRate: number;
  versatility: number;
  winRate: number;
}

export interface DepthVsPerformanceStat {
  depth: number;
  winRate: number;
  nodesPerTurn: number;
  decisionTimeMs: number;
}

export interface AnalyticsSummary {
  totalBattles: number;
  overallWinRate: number;
  fastestVictoryRounds: number;
  mostPopularCharacter: string;
  topStrategy: string;
  totalTurnsSimulated: number;
}
