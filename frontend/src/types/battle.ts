import { Character, Ability } from './character';
import { AIStrategy, AIDifficulty, AIDecision } from './ai';

export type BattleMode = 'pve' | 'pvp' | 'ai_vs_ai' | 'practice';

export interface StatusEffect {
  id: string;
  name: string;
  type: 'burn' | 'bleed' | 'stun' | 'buff' | 'shield' | 'poison';
  duration: number; // turns remaining
  value: number; // damage or boost
  description: string;
}

export interface BattleFighter {
  character: Character;
  currentHp: number;
  maxHp: number;
  currentChakra: number;
  maxChakra: number;
  shield: number;
  statusEffects: StatusEffect[];
  cooldowns: Record<string, number>; // abilityId -> turns left
  isAI: boolean;
  aiStrategy?: AIStrategy;
  aiDifficulty?: AIDifficulty;
}

export interface BattleLogEntry {
  id: string;
  round: number;
  turn: number;
  actor: 'player1' | 'player2';
  actorName: string;
  actionName: string;
  text: string;
  type: 'attack' | 'heal' | 'critical' | 'status' | 'system' | 'ultimate' | 'shield';
  damage?: number;
  heal?: number;
  shield?: number;
  timestamp: string;
}

export interface DamagePopupEvent {
  id: string;
  target: 'player1' | 'player2';
  amount: number;
  type: 'damage' | 'critical' | 'heal' | 'shield' | 'miss';
  text?: string;
}

export type BattleOutcome = 'ongoing' | 'player1_won' | 'player2_won' | 'draw';

export interface BattleState {
  id: string;
  mode: BattleMode;
  round: number;
  turn: number;
  currentTurn: 'player1' | 'player2';
  player1: BattleFighter;
  player2: BattleFighter;
  status: BattleOutcome;
  logs: BattleLogEntry[];
  lastDecision?: AIDecision;
  createdAt: string;
  winner?: 'player1' | 'player2' | null;
}

export interface BattleConfig {
  mode: BattleMode;
  player1CharacterId: string;
  player2CharacterId: string;
  player1IsAI?: boolean;
  player1Strategy?: AIStrategy;
  player2Strategy?: AIStrategy;
  difficulty?: AIDifficulty;
  searchDepth?: number;
}
