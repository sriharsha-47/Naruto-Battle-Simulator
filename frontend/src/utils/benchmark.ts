import { BattleState, BattleFighter } from '../types/battle';
import { Character } from '../types/character';
import { AIStrategy, isAllowedStrategy } from '../types/ai';
import { CHARACTERS } from '../api/mockData';
import { computeAIDecision, executeBattleAction } from './aiEngine';

/* ---------------------------------------------------------------------------
   AI BENCHMARK ENGINE
   Plays REAL battles through the same engine the arena uses
   (computeAIDecision + executeBattleAction) and counts the results.
   --------------------------------------------------------------------------- */

export const ALL_STRATEGIES: AIStrategy[] = [
  'random',
  'greedy',
  'minimax',
  'alpha_beta',
];

export interface BenchmarkResult {
  strategy: AIStrategy;
  opponent: AIStrategy;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // percentage 0-100, one decimal
  avgTurns: number; // average actions per battle
  totalTurns: number; // total jutsu executed during the benchmark
  ranAt: string;
}

const MAX_TURNS = 120; // safety cap: anything longer is scored as a draw
const STORAGE_KEY = 'naruto.benchmark.v1';

function makeFighter(char: Character, strategy: AIStrategy): BattleFighter {
  return {
    character: char,
    currentHp: char.stats.hp,
    maxHp: char.stats.maxHp,
    currentChakra: char.stats.chakra,
    maxChakra: char.stats.maxChakra,
    shield: 0,
    statusEffects: [],
    cooldowns: {},
    isAI: true,
    aiStrategy: strategy,
    aiDifficulty: 'hard',
  };
}

/** Plays one complete AI-vs-AI battle and returns the final state. */
export function simulateBattle(
  char1: Character,
  strategy1: AIStrategy,
  char2: Character,
  strategy2: AIStrategy
): BattleState {
  let battle: BattleState = {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    mode: 'ai_vs_ai',
    round: 1,
    turn: 1,
    currentTurn: 'player1',
    createdAt: new Date().toISOString(),
    player1: makeFighter(char1, strategy1),
    player2: makeFighter(char2, strategy2),
    status: 'ongoing',
    winner: null,
    logs: [],
  };

  while (battle.status === 'ongoing' && battle.turn <= MAX_TURNS) {
    const actor = battle.currentTurn;
    const strategy = actor === 'player1' ? strategy1 : strategy2;
    const decision = computeAIDecision(battle, actor, strategy, 3);
    battle = executeBattleAction(battle, actor, decision.chosenAbilityId).nextBattle;
  }

  // Hit the turn cap without a winner -> draw
  if (battle.status === 'ongoing') {
    battle = { ...battle, status: 'draw', winner: null };
  }
  return battle;
}

const wait = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Benchmarks one strategy against an opponent (Greedy by default).
 * Fairness: 25 random character pairs x 4 variants = 100 games, where each pair
 * is replayed with the characters swapped AND the move order swapped, so neither
 * a strong character nor going first can inflate the result.
 */
export async function runBenchmark(
  strategy: AIStrategy,
  games = 100,
  opponent: AIStrategy = 'greedy',
  onProgress?: (done: number, total: number) => void
): Promise<BenchmarkResult> {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalTurns = 0;
  let played = 0;

  const pairCount = Math.ceil(games / 4);
  for (let p = 0; p < pairCount && played < games; p++) {
    const i = Math.floor(Math.random() * CHARACTERS.length);
    let j = Math.floor(Math.random() * (CHARACTERS.length - 1));
    if (j >= i) j += 1;
    const A = CHARACTERS[i];
    const B = CHARACTERS[j];

    // [strategy's character, opponent's character, strategy moves first?]
    const variants: [Character, Character, boolean][] = [
      [A, B, true],
      [A, B, false],
      [B, A, true],
      [B, A, false],
    ];

    for (const [mine, theirs, first] of variants) {
      if (played >= games) break;
      const result = first
        ? simulateBattle(mine, strategy, theirs, opponent)
        : simulateBattle(theirs, opponent, mine, strategy);

      const myKey = first ? 'player1' : 'player2';
      if (result.status === 'draw') draws++;
      else if (result.winner === myKey) wins++;
      else losses++;

      totalTurns += result.turn - 1;
      played++;
    }

    onProgress?.(played, games);
    await wait(); // keep the UI responsive
  }

  return {
    strategy,
    opponent,
    games: played,
    wins,
    losses,
    draws,
    winRate: Math.round((wins / Math.max(1, played)) * 1000) / 10,
    avgTurns: Math.round((totalTurns / Math.max(1, played)) * 10) / 10,
    totalTurns,
    ranAt: new Date().toISOString(),
  };
}

/** Benchmarks every algorithm against Greedy. */
export async function runAllBenchmarks(
  games = 100,
  onProgress?: (strategy: AIStrategy, done: number, total: number) => void
): Promise<Record<string, BenchmarkResult>> {
  const out: Record<string, BenchmarkResult> = {};
  for (const s of ALL_STRATEGIES) {
    out[s] = await runBenchmark(s, games, 'greedy', (d, t) => onProgress?.(s, d, t));
  }
  saveBenchmarks(out);
  return out;
}

/* ------------------------- tiny persistence layer ------------------------- */
export function loadBenchmarks(): Record<string, BenchmarkResult> {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed: Record<string, BenchmarkResult> = raw ? JSON.parse(raw) : {};
    // drop cached results of algorithms that are no longer offered
    return Object.fromEntries(Object.entries(parsed).filter(([key]) => isAllowedStrategy(key)));
  } catch {
    return {};
  }
}

export function saveBenchmarks(data: Record<string, BenchmarkResult>): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable - results simply won't persist */
  }
}

export function saveBenchmark(result: BenchmarkResult): void {
  const all = loadBenchmarks();
  all[result.strategy] = result;
  saveBenchmarks(all);
}

/** Returns benchmarks for all algorithms, running only the ones not yet cached. */
export async function ensureAllBenchmarks(games = 100): Promise<Record<string, BenchmarkResult>> {
  const all = loadBenchmarks();
  for (const s of ALL_STRATEGIES) {
    if (!all[s]) {
      all[s] = await runBenchmark(s, games, 'greedy');
      saveBenchmarks(all);
    }
  }
  return all;
}
