export type AIStrategy = 
  | 'random' 
  | 'greedy' 
  | 'minimax' 
  | 'alpha_beta';

// The only algorithms this project exposes. Anything else that shows up
// (old localStorage data, an API response) is mapped back to a valid one.
export const ALLOWED_STRATEGIES: AIStrategy[] = ['random', 'greedy', 'minimax', 'alpha_beta'];

export function isAllowedStrategy(value: unknown): value is AIStrategy {
  return ALLOWED_STRATEGIES.includes(value as AIStrategy);
}

export function sanitizeStrategy(value: unknown, fallback: AIStrategy = 'alpha_beta'): AIStrategy {
  return isAllowedStrategy(value) ? value : fallback;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'master';

export interface AIEvalBreakdown {
  hpAdvantage: number;
  chakraEfficiency: number;
  lethalThreat: number;
  defensiveSafety: number;
  cooldownAdvantage: number;
}

export interface AIAlternative {
  abilityId: string;
  abilityName: string;
  score: number;
  explanation: string;
  pruned?: boolean;
}

export interface AIDecision {
  chosenAbilityId: string;
  chosenAbilityName: string;
  strategy: AIStrategy;
  timeMs: number;
  nodesExplored: number;
  evaluationScore: number;
  searchDepth?: number;
  alternatives: AIAlternative[];
  breakdown: AIEvalBreakdown;
  rationale: string;
}

export interface GameTreeNode {
  id: string;
  name: string;
  abilityId?: string;
  depth: number;
  type: 'max' | 'min' | 'chance';
  score?: number;
  alpha?: number;
  beta?: number;
  isPruned?: boolean;
  isBestPath?: boolean;
  details?: string;
  children?: GameTreeNode[];
}

export interface StrategyInfo {
  id: AIStrategy;
  name: string;
  tagline: string;
  description: string;
  complexity: string;
  strengths: string[];
  weaknesses: string[];
  timeComplexity: string;
  spaceComplexity: string;
  color: string;
}
