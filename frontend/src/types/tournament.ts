import { AIStrategy } from './ai';

export interface TournamentContender {
  id: string;
  name: string;
  characterId: string;
  strategy: AIStrategy;
  avatarSymbol: string;
  wins: number;
  losses: number;
  damageDealt: number;
}

export interface TournamentMatch {
  id: string;
  roundNumber: number; // 1 = Quarterfinals, 2 = Semifinals, 3 = Finals
  matchIndex: number;
  contender1: TournamentContender;
  contender2: TournamentContender;
  winner?: TournamentContender;
  status: 'pending' | 'active' | 'completed';
  battleId?: string;
  roundSummary?: string;
}

export interface TournamentState {
  id: string;
  title: string;
  size: 8;
  status: 'setup' | 'running' | 'completed';
  currentMatchIndex: number;
  matches: TournamentMatch[];
  champion?: TournamentContender;
}
