import { create } from 'zustand';
import { TournamentState, TournamentMatch, TournamentContender } from '../types/tournament';
import { CHARACTERS } from '../api/mockData';
import { AIStrategy } from '../types/ai';

interface TournamentStore {
  tournament: TournamentState | null;
  isRunning: boolean;
  activeMatch: TournamentMatch | null;

  initTournament: () => void;
  simulateMatch: (matchId: string) => Promise<void>;
  simulateFullTournament: () => Promise<void>;
  resetTournament: () => void;
}

const defaultStrategies: AIStrategy[] = [
  'alpha_beta',
  'minimax',
  'mcts',
  'q_learning',
  'expectiminimax',
  'greedy',
  'alpha_beta',
  'minimax',
];

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournament: null,
  isRunning: false,
  activeMatch: null,

  initTournament: () => {
    const contenders: TournamentContender[] = CHARACTERS.slice(0, 8).map((c, i) => ({
      id: `c-${c.id}`,
      name: c.name,
      characterId: c.id,
      strategy: defaultStrategies[i] || 'minimax',
      avatarSymbol: c.symbol,
      wins: 0,
      losses: 0,
      damageDealt: 0,
    }));

    // Round 1: Quarterfinals (4 matches)
    const matches: TournamentMatch[] = [
      { id: 'm-1', roundNumber: 1, matchIndex: 0, contender1: contenders[0], contender2: contenders[1], status: 'pending' },
      { id: 'm-2', roundNumber: 1, matchIndex: 1, contender1: contenders[2], contender2: contenders[3], status: 'pending' },
      { id: 'm-3', roundNumber: 1, matchIndex: 2, contender1: contenders[4], contender2: contenders[5], status: 'pending' },
      { id: 'm-4', roundNumber: 1, matchIndex: 3, contender1: contenders[6], contender2: contenders[7], status: 'pending' },
    ];

    set({
      tournament: {
        id: `tourney-${Date.now()}`,
        title: 'Chūnin Exams Grand Tournament',
        size: 8,
        status: 'setup',
        currentMatchIndex: 0,
        matches,
      },
      isRunning: false,
      activeMatch: null,
    });
  },

  simulateMatch: async (matchId: string) => {
    const { tournament } = get();
    if (!tournament) return;

    const matchIndex = tournament.matches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;

    const match = tournament.matches[matchIndex];
    if (match.status === 'completed') return;

    set({ activeMatch: match, isRunning: true });

    // Realistic match resolution weighted by AI strategy strength
    await new Promise((resolve) => setTimeout(resolve, 600));

    const stratWeights: Record<AIStrategy, number> = {
      alpha_beta: 75,
      minimax: 70,
      mcts: 68,
      q_learning: 65,
      expectiminimax: 64,
      greedy: 50,
      random: 20,
    };

    const w1 = stratWeights[match.contender1.strategy] || 50;
    const w2 = stratWeights[match.contender2.strategy] || 50;
    const totalW = w1 + w2;
    const roll = Math.random() * totalW;

    const winner = roll < w1 ? match.contender1 : match.contender2;
    const loser = winner === match.contender1 ? match.contender2 : match.contender1;

    winner.wins += 1;
    winner.damageDealt += Math.floor(Math.random() * 600) + 900;
    loser.losses += 1;
    loser.damageDealt += Math.floor(Math.random() * 500) + 600;

    const updatedMatch: TournamentMatch = {
      ...match,
      status: 'completed',
      winner,
      roundSummary: `${winner.name} (${winner.strategy}) overcame ${loser.name} with decisive tactical advantage.`,
    };

    const newMatches = [...tournament.matches];
    newMatches[matchIndex] = updatedMatch;

    // Check if current round completed and spawn next round
    const r1Matches = newMatches.filter((m) => m.roundNumber === 1);
    const r2Matches = newMatches.filter((m) => m.roundNumber === 2);
    const r3Matches = newMatches.filter((m) => m.roundNumber === 3);

    // If all R1 completed and R2 doesn't exist, spawn Semifinals
    if (r1Matches.every((m) => m.status === 'completed') && r2Matches.length === 0) {
      const semi1: TournamentMatch = {
        id: 'm-semi-1',
        roundNumber: 2,
        matchIndex: 0,
        contender1: r1Matches[0].winner!,
        contender2: r1Matches[1].winner!,
        status: 'pending',
      };
      const semi2: TournamentMatch = {
        id: 'm-semi-2',
        roundNumber: 2,
        matchIndex: 1,
        contender1: r1Matches[2].winner!,
        contender2: r1Matches[3].winner!,
        status: 'pending',
      };
      newMatches.push(semi1, semi2);
    }

    // If all R2 completed and R3 doesn't exist, spawn Finals
    if (r2Matches.length === 2 && r2Matches.every((m) => m.status === 'completed') && r3Matches.length === 0) {
      const finals: TournamentMatch = {
        id: 'm-finals',
        roundNumber: 3,
        matchIndex: 0,
        contender1: r2Matches[0].winner!,
        contender2: r2Matches[1].winner!,
        status: 'pending',
      };
      newMatches.push(finals);
    }

    // Check if Finals completed
    let champion: TournamentContender | undefined = tournament.champion;
    let tourneyStatus = tournament.status;

    const finalMatch = newMatches.find((m) => m.roundNumber === 3);
    if (finalMatch && finalMatch.status === 'completed') {
      champion = finalMatch.winner;
      tourneyStatus = 'completed';
    } else {
      tourneyStatus = 'running';
    }

    set({
      tournament: {
        ...tournament,
        status: tourneyStatus,
        matches: newMatches,
        champion,
      },
      isRunning: false,
      activeMatch: null,
    });
  },

  simulateFullTournament: async () => {
    let current = get().tournament;
    if (!current) {
      get().initTournament();
      current = get().tournament;
    }
    if (!current) return;

    set({ isRunning: true });

    // Loop until tournament complete
    while (true) {
      const tourney = get().tournament;
      if (!tourney || tourney.status === 'completed') break;

      const pendingMatch = tourney.matches.find((m) => m.status === 'pending');
      if (!pendingMatch) break;

      await get().simulateMatch(pendingMatch.id);
      await new Promise((r) => setTimeout(r, 200));
    }

    set({ isRunning: false });
  },

  resetTournament: () => {
    get().initTournament();
  },
}));
