import { BattleState, BattleFighter } from '../types/battle';
import { Ability } from '../types/character';
import { AIStrategy, AIDecision, AIAlternative } from '../types/ai';
import {
  MAX_HEAL_USES,
  PASSIVE_CHAKRA_REGEN,
  MEDITATE_ABILITY,
  getChakraRestore,
  hasUnlimitedChakra,
  getLegalAbilities,
  isHealingMove,
} from './aiEngine';

/* ---------------------------------------------------------------------------
   ADVANCED AI ALGORITHMS
   1. Expectimax                      (adversarial search with chance nodes)
   2. Monte Carlo Tree Search (UCT)   (sampling based, open-loop)
   3. Rolling Horizon Evolutionary    (evolutionary action-sequence search)

   All three play on a compact forward model of the real battle rules
   (same damage / shield / heal / chakra / cooldown maths as executeBattleAction),
   so the moves they pick are genuinely based on look-ahead simulation.
   --------------------------------------------------------------------------- */

export const ADVANCED_STRATEGIES: AIStrategy[] = ['expectimax', 'mcts', 'evolutionary'];

export function isAdvancedStrategy(s: AIStrategy): boolean {
  return ADVANCED_STRATEGIES.includes(s);
}

// ---------------------------------------------------------------------------
// Compact simulation model
// ---------------------------------------------------------------------------
interface SimFighter {
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  shield: number;
  healsUsed: number;
  defense: number;
  cooldowns: Record<string, number>;
  abilities: Ability[];
}

interface SimState {
  f: [SimFighter, SimFighter];
  turn: 0 | 1; // index of the fighter who acts next
  unlimited: boolean;
}

function toSimFighter(f: BattleFighter): SimFighter {
  return {
    hp: f.currentHp,
    maxHp: f.maxHp,
    chakra: f.currentChakra,
    maxChakra: f.maxChakra,
    shield: f.shield || 0,
    healsUsed: f.healsUsed || 0,
    defense: f.character.stats.defense,
    cooldowns: { ...f.cooldowns },
    abilities: f.character.abilities,
  };
}

function toSimState(battle: BattleState, actingKey: 'player1' | 'player2'): SimState {
  return {
    f: [toSimFighter(battle.player1), toSimFighter(battle.player2)],
    turn: actingKey === 'player1' ? 0 : 1,
    unlimited: hasUnlimitedChakra(battle),
  };
}

function cloneFighter(f: SimFighter): SimFighter {
  return { ...f, cooldowns: { ...f.cooldowns } };
}

function cloneState(s: SimState): SimState {
  return { f: [cloneFighter(s.f[0]), cloneFighter(s.f[1])], turn: s.turn, unlimited: s.unlimited };
}

function isTerminal(s: SimState): boolean {
  return s.f[0].hp <= 0 || s.f[1].hp <= 0;
}

function legalMoves(s: SimState, idx: 0 | 1): Ability[] {
  const f = s.f[idx];
  const moves = f.abilities.filter((a) => {
    const cd = f.cooldowns[a.id] || 0;
    const chakraOk = s.unlimited || f.chakra >= a.chakraCost;
    const healOk = !isHealingMove(a) || f.healsUsed < MAX_HEAL_USES;
    return cd === 0 && chakraOk && healOk;
  });
  return moves.length > 0 ? moves : [MEDITATE_ABILITY];
}

/**
 * Applies one move on a COPY of the state.
 * stochastic = false -> expected damage (crit chance folded in as an average)
 * stochastic = true  -> sampled crit + +/-10% variance, exactly like the real engine
 */
function applyMove(s: SimState, ability: Ability, stochastic: boolean): SimState {
  const n = cloneState(s);
  const me = n.f[n.turn];
  const foe = n.f[n.turn === 0 ? 1 : 0];

  if (!n.unlimited) me.chakra = Math.max(0, me.chakra - ability.chakraCost);
  if (ability.cooldown > 0) me.cooldowns[ability.id] = ability.cooldown + 1;

  if (ability.target === 'enemy' && ability.damage) {
    const critRate = ability.criticalChance || 0.15;
    let dmg: number;
    if (stochastic) {
      const crit = Math.random() < critRate;
      const variance = Math.random() * 0.2 - 0.1;
      dmg = ability.damage * (crit ? 1.5 : 1) * (1 + variance);
    } else {
      dmg = ability.damage * (1 + critRate * 0.5); // E[crit multiplier]
    }
    const eff = Math.round(dmg * Math.max(0.4, 1 - foe.defense / 250));
    if (foe.shield >= eff) {
      foe.shield -= eff;
    } else {
      foe.hp = Math.max(0, foe.hp - (eff - foe.shield));
      foe.shield = 0;
    }
  }
  if (ability.heal) {
    me.healsUsed += 1;
    me.hp = Math.min(me.maxHp, me.hp + ability.heal);
  }
  if (ability.shield) me.shield += ability.shield;

  if (!n.unlimited) {
    const restore = getChakraRestore(ability);
    if (restore > 0) me.chakra = Math.min(me.maxChakra, me.chakra + restore);
    me.chakra = Math.min(me.maxChakra, me.chakra + PASSIVE_CHAKRA_REGEN);
  } else {
    n.f[0].chakra = n.f[0].maxChakra;
    n.f[1].chakra = n.f[1].maxChakra;
  }

  for (const k of Object.keys(me.cooldowns)) {
    if (me.cooldowns[k] > 0) me.cooldowns[k] -= 1;
  }

  n.turn = n.turn === 0 ? 1 : 0;
  return n;
}

// ---------------------------------------------------------------------------
// Evaluation (from the point of view of fighter `me`), range roughly [-100, 100]
// ---------------------------------------------------------------------------
function evaluate(s: SimState, me: 0 | 1): number {
  const a = s.f[me];
  const b = s.f[me === 0 ? 1 : 0];
  if (a.hp <= 0 && b.hp <= 0) return 0;
  if (b.hp <= 0) return 100;
  if (a.hp <= 0) return -100;

  const hpA = (a.hp + a.shield * 0.7) / a.maxHp;
  const hpB = (b.hp + b.shield * 0.7) / b.maxHp;
  const chA = s.unlimited ? 1 : a.chakra / Math.max(1, a.maxChakra);
  const chB = s.unlimited ? 1 : b.chakra / Math.max(1, b.maxChakra);

  const score = 80 * (hpA - hpB) + 12 * (chA - chB);
  return Math.max(-99, Math.min(99, score));
}

// Cheap one-ply "what would a sensible player do" score used by opponent models & rollouts
function quickScore(a: Ability, me: SimFighter, foe: SimFighter): number {
  const dmg = (a.damage || 0) * (1 + (a.criticalChance || 0.15) * 0.5);
  const lethal = dmg >= foe.hp + foe.shield ? 600 : 0;
  const lowHp = me.hp < me.maxHp * 0.35;
  const heal = (a.heal || 0) * (lowHp ? 2.0 : 0.5);
  const shield = (a.shield || 0) * (lowHp ? 1.0 : 0.4);
  return dmg + heal + shield + lethal - a.chakraCost * 0.15;
}

function greedyMove(s: SimState, idx: 0 | 1): Ability {
  const moves = legalMoves(s, idx);
  const me = s.f[idx];
  const foe = s.f[idx === 0 ? 1 : 0];
  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const sc = quickScore(m, me, foe);
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }
  return best;
}

interface RawResult {
  scores: Map<string, number>; // abilityId -> score (-100..100 scale)
  best: Ability;
  nodes: number;
  depth: number;
  notes: Record<string, string>;
  extra: string;
}

// ===========================================================================
// 1. EXPECTIMAX
//    MAX nodes  : our move (take the best child)
//    CHANCE nodes: the opponent's move, modelled as a Boltzmann (soft-max) player
//                  instead of a perfect adversary. Crit / damage variance is
//                  integrated analytically through expected damage.
// ===========================================================================
function expectimax(root: SimState, me: 0 | 1, depth: number): RawResult {
  let nodes = 0;
  const NODE_BUDGET = 60000;
  const TEMPERATURE = 10; // opponent rationality: lower = closer to minimax

  const value = (s: SimState, d: number): number => {
    nodes++;
    if (d === 0 || isTerminal(s) || nodes > NODE_BUDGET) return evaluate(s, me);

    const mover = s.turn;
    const moves = legalMoves(s, mover);

    if (mover === me) {
      let best = -Infinity;
      for (const m of moves) {
        const v = value(applyMove(s, m, false), d - 1);
        if (v > best) best = v;
      }
      return best;
    }

    // CHANCE node: opponent picks according to a soft-max over its own 1-ply evaluation
    const opp = mover;
    const qs = moves.map((m) => evaluate(applyMove(s, m, false), opp));
    const qMax = Math.max(...qs);
    const exps = qs.map((q) => Math.exp((q - qMax) / TEMPERATURE));
    const z = exps.reduce((a, b) => a + b, 0);
    let ev = 0;
    for (let i = 0; i < moves.length; i++) {
      ev += (exps[i] / z) * value(applyMove(s, moves[i], false), d - 1);
    }
    return ev;
  };

  const moves = legalMoves(root, me);
  const scores = new Map<string, number>();
  const notes: Record<string, string> = {};
  let best = moves[0];
  let bestV = -Infinity;
  for (const m of moves) {
    nodes++;
    const v = value(applyMove(root, m, false), depth - 1);
    scores.set(m.id, v);
    notes[m.id] = `Expected value ${v.toFixed(1)} over ${depth} plies (opponent replies weighted by soft-max probabilities).`;
    if (v > bestV) {
      bestV = v;
      best = m;
    }
  }
  return {
    scores,
    best,
    nodes,
    depth,
    notes,
    extra: `Expectimax over ${depth} plies: MAX nodes for my moves, chance nodes for the opponent's replies (soft-max opponent model).`,
  };
}

// ===========================================================================
// 2. MONTE CARLO TREE SEARCH (UCT, open-loop)
//    Selection (UCB1) -> Expansion -> Rollout (biased random playout) -> Backprop.
//    Open-loop = every iteration re-simulates from the real root state, so crits /
//    damage variance are handled by sampling instead of being baked into the tree.
// ===========================================================================
interface MctsNode {
  visits: number;
  total: number; // sum of rewards for fighter `me` (0..1)
  children: Map<string, MctsNode>;
}

function mcts(root: SimState, me: 0 | 1, iterations: number, timeLimitMs: number): RawResult {
  const C = 1.2; // exploration constant
  const ROLLOUT_DEPTH = 10;
  const rootNode: MctsNode = { visits: 0, total: 0, children: new Map() };
  let nodes = 1;
  let maxDepth = 0;
  const started = performance.now();

  const reward = (s: SimState): number => {
    if (isTerminal(s)) {
      const v = evaluate(s, me);
      return v > 0 ? 1 : v < 0 ? 0 : 0.5;
    }
    // non-terminal cut-off: squash heuristic into (0,1)
    return 1 / (1 + Math.exp(-evaluate(s, me) / 25));
  };

  const rolloutPolicy = (s: SimState): Ability => {
    const moves = legalMoves(s, s.turn);
    if (Math.random() < 0.6) return greedyMove(s, s.turn);
    return moves[Math.floor(Math.random() * moves.length)];
  };

  let done = 0;
  for (; done < iterations; done++) {
    if ((done & 15) === 0 && performance.now() - started > timeLimitMs) break;

    let state = root;
    let node = rootNode;
    const path: MctsNode[] = [node];
    let depth = 0;

    // --- Selection & Expansion
    while (!isTerminal(state)) {
      const moves = legalMoves(state, state.turn);
      const untried = moves.filter((m) => !node.children.has(m.id));

      if (untried.length > 0) {
        const m = untried[Math.floor(Math.random() * untried.length)];
        const child: MctsNode = { visits: 0, total: 0, children: new Map() };
        node.children.set(m.id, child);
        nodes++;
        state = applyMove(state, m, true);
        node = child;
        path.push(node);
        depth++;
        break;
      }

      // UCB1 among children (maximise for me, minimise for the opponent)
      const maximise = state.turn === me;
      let bestMove = moves[0];
      let bestUcb = -Infinity;
      const logN = Math.log(Math.max(1, node.visits));
      for (const m of moves) {
        const ch = node.children.get(m.id)!;
        const q = ch.total / Math.max(1, ch.visits);
        const exploit = maximise ? q : 1 - q;
        const ucb = exploit + C * Math.sqrt(logN / Math.max(1, ch.visits));
        if (ucb > bestUcb) {
          bestUcb = ucb;
          bestMove = m;
        }
      }
      state = applyMove(state, bestMove, true);
      node = node.children.get(bestMove.id)!;
      path.push(node);
      depth++;
    }
    if (depth > maxDepth) maxDepth = depth;

    // --- Rollout
    let steps = 0;
    while (!isTerminal(state) && steps < ROLLOUT_DEPTH) {
      state = applyMove(state, rolloutPolicy(state), true);
      steps++;
    }

    // --- Backpropagation
    const r = reward(state);
    for (const n of path) {
      n.visits += 1;
      n.total += r;
    }
  }

  const moves = legalMoves(root, me);
  const scores = new Map<string, number>();
  const notes: Record<string, string> = {};
  let best = moves[0];
  let bestVisits = -1;
  for (const m of moves) {
    const ch = rootNode.children.get(m.id);
    const visits = ch ? ch.visits : 0;
    const winRate = ch && ch.visits > 0 ? ch.total / ch.visits : 0.5;
    scores.set(m.id, (winRate - 0.5) * 200); // map win-rate to the -100..100 scale
    notes[m.id] = `${visits} simulations, estimated win-rate ${(winRate * 100).toFixed(0)}%.`;
    if (visits > bestVisits) {
      bestVisits = visits;
      best = m;
    }
  }
  return {
    scores,
    best,
    nodes,
    depth: maxDepth,
    notes,
    extra: `MCTS (UCT) ran ${done} simulations and chose the most-visited move.`,
  };
}

// ===========================================================================
// 3. ROLLING HORIZON EVOLUTIONARY ALGORITHM (RHEA)
//    Genome  = a plan of H of my future moves.
//    Fitness = average evaluation after simulating the plan against a greedy
//              opponent model. Tournament selection + uniform crossover +
//              mutation + elitism. Only the first gene of the best plan is played.
// ===========================================================================
function rhea(
  root: SimState,
  me: 0 | 1,
  horizon: number,
  population: number,
  generations: number
): RawResult {
  const opp: 0 | 1 = me === 0 ? 1 : 0;
  const SAMPLES = 2;
  let evals = 0;

  type Genome = number[]; // each gene in [0,1) -> index into the legal-move list at that step

  const simulate = (g: Genome): { fitness: number; firstId: string } => {
    let total = 0;
    let firstId = '';
    for (let k = 0; k < SAMPLES; k++) {
      let s = root;
      for (let step = 0; step < g.length && !isTerminal(s); step++) {
        const moves = legalMoves(s, me);
        const m = moves[Math.min(moves.length - 1, Math.floor(g[step] * moves.length))];
        if (step === 0) firstId = m.id;
        s = applyMove(s, m, true);
        if (isTerminal(s)) break;
        s = applyMove(s, greedyMove(s, opp), true); // opponent model
      }
      total += evaluate(s, me);
      evals++;
    }
    return { fitness: total / SAMPLES, firstId };
  };

  const randomGenome = (): Genome => Array.from({ length: horizon }, () => Math.random());

  type Ind = { g: Genome; fit: number };
  const bestPerFirstMove = new Map<string, number>();
  const evaluateInd = (g: Genome): Ind => {
    const { fitness, firstId } = simulate(g);
    const prev = bestPerFirstMove.get(firstId);
    if (prev === undefined || fitness > prev) bestPerFirstMove.set(firstId, fitness);
    return { g, fit: fitness };
  };

  // Seed the population with one plan per legal first move so every option is considered
  const rootMoves = legalMoves(root, me);
  let pop: Ind[] = [];
  rootMoves.forEach((_, i) => {
    const g = randomGenome();
    g[0] = (i + 0.5) / rootMoves.length;
    pop.push(evaluateInd(g));
  });
  while (pop.length < population) pop.push(evaluateInd(randomGenome()));

  const tournament = (): Ind => {
    const a = pop[Math.floor(Math.random() * pop.length)];
    const b = pop[Math.floor(Math.random() * pop.length)];
    return a.fit >= b.fit ? a : b;
  };

  for (let gen = 0; gen < generations; gen++) {
    pop.sort((x, y) => y.fit - x.fit);
    const next: Ind[] = [pop[0], pop[1]].filter(Boolean); // elitism
    while (next.length < population) {
      const p1 = tournament();
      const p2 = tournament();
      const child: Genome = p1.g.map((gene, i) => (Math.random() < 0.5 ? gene : p2.g[i]));
      for (let i = 0; i < child.length; i++) {
        if (Math.random() < 1 / horizon) child[i] = Math.random(); // mutation
      }
      next.push(evaluateInd(child));
    }
    pop = next;
  }

  pop.sort((x, y) => y.fit - x.fit);
  const champion = pop[0];
  const moves = legalMoves(root, me);
  const bestMove = moves[Math.min(moves.length - 1, Math.floor(champion.g[0] * moves.length))];

  const scores = new Map<string, number>();
  const notes: Record<string, string> = {};
  for (const m of moves) {
    const v = bestPerFirstMove.get(m.id);
    scores.set(m.id, v === undefined ? -100 : v);
    notes[m.id] = v === undefined
      ? 'Never survived selection: weak opening move.'
      : `Best evolved ${horizon}-move plan starting here scored ${v.toFixed(1)}.`;
  }
  return {
    scores,
    best: bestMove,
    nodes: evals,
    depth: horizon * 2,
    notes,
    extra: `Evolved ${population} plans of ${horizon} moves for ${generations} generations (${evals} simulated rollouts).`,
  };
}

// ---------------------------------------------------------------------------
// Public entry point used by computeAIDecision()
// ---------------------------------------------------------------------------
export function computeAdvancedDecision(
  battle: BattleState,
  actingPlayerKey: 'player1' | 'player2',
  strategy: AIStrategy,
  searchDepth: number
): AIDecision {
  const actor = actingPlayerKey === 'player1' ? battle.player1 : battle.player2;
  const opponent = actingPlayerKey === 'player1' ? battle.player2 : battle.player1;
  const me: 0 | 1 = actingPlayerKey === 'player1' ? 0 : 1;
  const root = toSimState(battle, actingPlayerKey);

  // Same safety net as the other strategies: nothing castable -> meditate
  const castable = getLegalAbilities(actor, hasUnlimitedChakra(battle));
  const started = performance.now();

  let raw: RawResult;
  if (castable.length === 0) {
    raw = {
      scores: new Map([[MEDITATE_ABILITY.id, 0]]),
      best: MEDITATE_ABILITY,
      nodes: 1,
      depth: 1,
      notes: { [MEDITATE_ABILITY.id]: 'No jutsu available: recover chakra.' },
      extra: 'Forced meditation.',
    };
  } else if (strategy === 'expectimax') {
    raw = expectimax(root, me, Math.max(4, searchDepth));
  } else if (strategy === 'mcts') {
    raw = mcts(root, me, 600, 120);
  } else {
    raw = rhea(root, me, 3, 10, 8);
  }

  const timeMs = Math.max(1, Math.round(performance.now() - started));
  const pool: Ability[] = castable.length > 0 ? castable : [MEDITATE_ABILITY];

  const alternatives: AIAlternative[] = pool
    .map((a) => ({
      abilityId: a.id,
      abilityName: a.name,
      score: Math.round((raw.scores.get(a.id) ?? 0) * 10) / 10,
      explanation: raw.notes[a.id] || '',
    }))
    .sort((x, y) => y.score - x.score);

  const chosen = pool.find((a) => a.id === raw.best.id) || pool[0];
  const bestScore = alternatives.find((a) => a.abilityId === chosen.id)?.score ?? alternatives[0].score;

  const foeTotal = Math.max(1, opponent.currentHp + opponent.shield);
  const dmg = chosen.damage || 0;
  const breakdown = {
    hpAdvantage: Math.min(100, Math.round(((chosen.damage || 0) + (chosen.heal || 0)) / 4)),
    chakraEfficiency: Math.min(100, Math.round(100 - (chosen.chakraCost / (actor.maxChakra || 1000)) * 100)),
    lethalThreat: dmg >= foeTotal ? 100 : Math.min(90, Math.round((dmg / Math.max(1, opponent.currentHp)) * 100)),
    defensiveSafety: Math.min(100, Math.round((actor.currentHp / actor.maxHp) * 80 + (chosen.shield || 0) / 3)),
    cooldownAdvantage: chosen.cooldown === 0 ? 90 : Math.max(20, 100 - chosen.cooldown * 20),
  };

  return {
    chosenAbilityId: chosen.id,
    chosenAbilityName: chosen.name,
    strategy,
    timeMs,
    nodesExplored: raw.nodes,
    evaluationScore: bestScore,
    searchDepth: raw.depth,
    alternatives,
    breakdown,
    rationale: `Selected ${chosen.name} (score ${bestScore}). ${raw.extra}`,
  };
}
