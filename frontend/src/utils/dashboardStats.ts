import { BattleState } from '../types/battle';
import { Character } from '../types/character';
import { BenchmarkResult } from './benchmark';
import { AIStrategy, isAllowedStrategy } from '../types/ai';

export interface DashboardStats {
  totalBattles: number;
  completed: number;
  inProgress: number;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  shinobiWinRate: number | null; // Player 1 wins / completed battles (%)
  totalJutsu: number;
  avgJutsuPerBattle: number;
  topCharacter: Character | null;
  topCharacterPicks: number;
  topAI: { strategy: AIStrategy; winRate: number } | null;
}

/** Every number on the dashboard is derived from real battle history + real benchmark results. */
export function computeDashboardStats(
  history: BattleState[],
  benchmarks: Record<string, BenchmarkResult>
): DashboardStats {
  const done = history.filter((b) => b.status !== 'ongoing');
  const p1Wins = done.filter((b) => b.status === 'player1_won').length;
  const p2Wins = done.filter((b) => b.status === 'player2_won').length;
  const draws = done.filter((b) => b.status === 'draw').length;

  // `turn` starts at 1 and increases once per jutsu executed
  const totalJutsu = history.reduce((sum, b) => sum + Math.max(0, b.turn - 1), 0);

  const picks = new Map<string, { character: Character; count: number }>();
  history.forEach((b) => {
    [b.player1.character, b.player2.character].forEach((c) => {
      const e = picks.get(c.id);
      if (e) e.count++;
      else picks.set(c.id, { character: c, count: 1 });
    });
  });
  const top = [...picks.values()].sort((a, b) => b.count - a.count)[0];

  // Greedy is the reference opponent, so it is not eligible for "Top AI"
  const ranked = Object.values(benchmarks)
    .filter((r) => isAllowedStrategy(r.strategy) && r.strategy !== 'greedy')
    .sort((a, b) => b.winRate - a.winRate);

  return {
    totalBattles: history.length,
    completed: done.length,
    inProgress: history.length - done.length,
    p1Wins,
    p2Wins,
    draws,
    shinobiWinRate: done.length ? Math.round((p1Wins / done.length) * 1000) / 10 : null,
    totalJutsu,
    avgJutsuPerBattle: history.length ? Math.round((totalJutsu / history.length) * 10) / 10 : 0,
    topCharacter: top ? top.character : null,
    topCharacterPicks: top ? top.count : 0,
    topAI: ranked[0] ? { strategy: ranked[0].strategy, winRate: ranked[0].winRate } : null,
  };
}
