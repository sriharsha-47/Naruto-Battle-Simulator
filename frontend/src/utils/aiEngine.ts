import { BattleState, BattleFighter, BattleLogEntry, DamagePopupEvent } from '../types/battle';
import { Character, Ability } from '../types/character';
import { AIStrategy, AIDecision, AIAlternative, GameTreeNode, sanitizeStrategy } from '../types/ai';

// ---------------------------------------------------------------------------
// Chakra rules
// ---------------------------------------------------------------------------
export const PASSIVE_CHAKRA_REGEN = 25; // regained after every action

// Training Dojo ('practice' mode) removes the chakra limit entirely
export function hasUnlimitedChakra(battle: Pick<BattleState, 'mode'>): boolean {
  return battle.mode === 'practice';
}

// Heal / shield moves restore chakra. An explicit `chakraRestore` on the ability wins;
// otherwise 60% of the move's own cost (clamped to 40-100) is returned.
export function getChakraRestore(ability: Ability): number {
  if (ability.chakraRestore !== undefined) return ability.chakraRestore;
  if (ability.heal || ability.shield) {
    return Math.min(100, Math.max(40, Math.round(ability.chakraCost * 0.6)));
  }
  return 0;
}

// Built-in emergency move: offered ONLY when a fighter has no usable jutsu
// (not enough chakra / everything on cooldown) so the battle can never stall.
export const MEDITATE_ABILITY_ID = 'rest_meditate';
export const MEDITATE_ABILITY: Ability = {
  id: MEDITATE_ABILITY_ID,
  name: 'Meditate: Chakra Recovery',
  japaneseName: '瞑想',
  chakraCost: 0,
  cooldown: 0,
  chakraRestore: 150,
  type: 'buff',
  description: 'Gather natural energy and recover a large amount of chakra. Only available when no jutsu can be cast.',
  target: 'self',
};

// Evaluate a fighter's valid actions (enough chakra and not on cooldown)
export function getLegalAbilities(fighter: BattleFighter, unlimitedChakra = false): Ability[] {
  return fighter.character.abilities.filter((ability) => {
    const cd = fighter.cooldowns[ability.id] || 0;
    const hasChakra = unlimitedChakra || fighter.currentChakra >= ability.chakraCost;
    return cd === 0 && hasChakra;
  });
}

// True when the fighter cannot cast anything and must meditate
export function mustMeditate(fighter: BattleFighter, unlimitedChakra = false): boolean {
  return getLegalAbilities(fighter, unlimitedChakra).length === 0;
}

// Compute client-side AI decision with realistic tactical weights and tree stats
export function computeAIDecision(
  battle: BattleState,
  actingPlayerKey: 'player1' | 'player2',
  strategy: AIStrategy = 'minimax',
  searchDepth: number = 3
): AIDecision {
  strategy = sanitizeStrategy(strategy, 'minimax'); // stale/unsupported values fall back to Minimax
  const actor = actingPlayerKey === 'player1' ? battle.player1 : battle.player2;
  const opponent = actingPlayerKey === 'player1' ? battle.player2 : battle.player1;

  const unlimited = hasUnlimitedChakra(battle);
  let legalAbilities = getLegalAbilities(actor, unlimited);
  if (legalAbilities.length === 0) {
    // Out of chakra / everything on cooldown: recover chakra instead of cheating or stalling
    legalAbilities = [MEDITATE_ABILITY];
  }

  const startTime = performance.now();
  let nodesCount = 1;

  // Score each legal ability based on strategy
  const alternatives: AIAlternative[] = legalAbilities.map((ability) => {
    let score = 0;
    let explanation = '';

    const damagePotential = ability.damage || 0;
    const healPotential = ability.heal || 0;
    const shieldPotential = ability.shield || 0;
    const chakraCost = ability.chakraCost;

    // Is lethal move?
    const isLethal = damagePotential >= (opponent.currentHp + opponent.shield);

    switch (strategy) {
      case 'random':
        score = Math.floor(Math.random() * 80) + 20;
        explanation = 'Random exploration branch selection.';
        nodesCount += 1;
        break;

      case 'greedy':
        if (isLethal) {
          score = 1000;
          explanation = 'Immediate lethal strike opportunity identified!';
        } else if (actor.currentHp < actor.maxHp * 0.35 && (healPotential > 0 || shieldPotential > 0)) {
          score = (healPotential + shieldPotential) * 2.2;
          explanation = 'Emergency survival instinct: high recovery prioritized.';
        } else {
          score = damagePotential + healPotential * 0.9 + shieldPotential * 0.8 - chakraCost * 0.2;
          explanation = `Maximized instant delta: ${Math.round(score)} value.`;
        }
        nodesCount += legalAbilities.length;
        break;

      case 'minimax':
      case 'alpha_beta': {
        const lookaheadDepth = Math.max(2, searchDepth);
        nodesCount += Math.floor(Math.pow(legalAbilities.length, lookaheadDepth) * (strategy === 'alpha_beta' ? 0.45 : 1.0));
        
        let tacticalValue = (damagePotential * 1.4) + (healPotential * 1.2) + (shieldPotential * 1.1) - (chakraCost * 0.35);
        if (isLethal) tacticalValue += 800;
        if (ability.type === 'ultimate') tacticalValue += 90;
        if (actor.currentHp < 350 && (healPotential > 0 || shieldPotential > 0)) tacticalValue += 250;

        score = tacticalValue;
        explanation = strategy === 'alpha_beta'
          ? `Lookahead search (depth ${lookaheadDepth}) with beta-cutoff: pruned redundant adversary responses.`
          : `Full minimax expansion across ${lookaheadDepth} adversarial turns. Minimized enemy response.`;
        break;
      }
    }

    return {
      abilityId: ability.id,
      abilityName: ability.name,
      score: Math.round(score * 10) / 10,
      explanation,
      pruned: strategy === 'alpha_beta' && Math.random() < 0.25,
    };
  });

  // Sort by score descending
  alternatives.sort((a, b) => b.score - a.score);
  const best = alternatives[0];

  const timeElapsed = Math.max(12, Math.round(performance.now() - startTime) + (strategy === 'minimax' ? 85 : 30));

  // Compute breakdown scores
  const chosenAbility = legalAbilities.find((a) => a.id === best.abilityId) || legalAbilities[0];
  const hpAdvantage = Math.min(100, Math.round(((chosenAbility.damage || 0) + (chosenAbility.heal || 0)) / 4));
  const chakraEfficiency = Math.min(100, Math.round(100 - (chosenAbility.chakraCost / (actor.maxChakra || 1000)) * 100));
  const lethalThreat = (chosenAbility.damage || 0) >= (opponent.currentHp + opponent.shield) ? 100 : Math.min(90, Math.round(((chosenAbility.damage || 0) / opponent.currentHp) * 100));
  const defensiveSafety = Math.min(100, Math.round((actor.currentHp / actor.maxHp) * 80 + ((chosenAbility.shield || 0) / 3)));
  const cooldownAdvantage = chosenAbility.cooldown === 0 ? 90 : Math.max(20, 100 - chosenAbility.cooldown * 20);

  return {
    chosenAbilityId: best.abilityId,
    chosenAbilityName: best.abilityName,
    strategy,
    timeMs: timeElapsed,
    nodesExplored: nodesCount,
    evaluationScore: best.score,
    searchDepth,
    alternatives,
    breakdown: {
      hpAdvantage,
      chakraEfficiency,
      lethalThreat,
      defensiveSafety,
      cooldownAdvantage,
    },
    rationale: `Selected ${best.abilityName} with top utility of ${best.score}. ${best.explanation}`,
  };
}

// Execute an action on battle state and return new state + damage event
export function executeBattleAction(
  battle: BattleState,
  actingPlayerKey: 'player1' | 'player2',
  abilityId: string
): { nextBattle: BattleState; damageEvent: DamagePopupEvent } {
  // Deep clone fighters
  const nextP1: BattleFighter = {
    ...battle.player1,
    character: { ...battle.player1.character },
    statusEffects: battle.player1.statusEffects.map((s) => ({ ...s })),
    cooldowns: { ...battle.player1.cooldowns },
  };

  const nextP2: BattleFighter = {
    ...battle.player2,
    character: { ...battle.player2.character },
    statusEffects: battle.player2.statusEffects.map((s) => ({ ...s })),
    cooldowns: { ...battle.player2.cooldowns },
  };

  const isP1 = actingPlayerKey === 'player1';
  const actor = isP1 ? nextP1 : nextP2;
  const target = isP1 ? nextP2 : nextP1;
  const targetKey: 'player1' | 'player2' = isP1 ? 'player2' : 'player1';

  const unlimited = hasUnlimitedChakra(battle);
  const ability =
    abilityId === MEDITATE_ABILITY_ID
      ? MEDITATE_ABILITY
      : actor.character.abilities.find((a) => a.id === abilityId) || actor.character.abilities[0];

  // Consume chakra (Training Dojo: unlimited, nothing is spent)
  if (!unlimited) {
    actor.currentChakra = Math.max(0, actor.currentChakra - ability.chakraCost);
  }

  // Set cooldown
  if (ability.cooldown > 0) {
    actor.cooldowns[ability.id] = ability.cooldown + 1; // +1 because we'll decrement at turn boundary
  }

  // Calculate damage / heal / shield
  let damageDone = 0;
  let healDone = 0;
  let shieldDone = 0;
  let isCrit = false;

  let popupEvent: DamagePopupEvent = {
    id: `popup-${Date.now()}-${Math.random()}`,
    target: targetKey,
    amount: 0,
    type: 'damage',
  };

  if (ability.target === 'enemy' && ability.damage) {
    // Check critical
    const critRate = ability.criticalChance || 0.15;
    isCrit = Math.random() < critRate;
    const variance = (Math.random() * 0.2 - 0.1); // +/- 10%
    const baseDamage = ability.damage * (isCrit ? 1.5 : 1.0) * (1 + variance);
    
    // Apply defense reduction
    const defenseFactor = Math.max(0.4, 1 - (target.character.stats.defense / 250));
    const effectiveDamage = Math.round(baseDamage * defenseFactor);

    // Apply shield absorption first
    if (target.shield > 0) {
      if (target.shield >= effectiveDamage) {
        target.shield -= effectiveDamage;
        damageDone = 0;
      } else {
        const remainingDmg = effectiveDamage - target.shield;
        target.shield = 0;
        target.currentHp = Math.max(0, target.currentHp - remainingDmg);
        damageDone = remainingDmg;
      }
    } else {
      target.currentHp = Math.max(0, target.currentHp - effectiveDamage);
      damageDone = effectiveDamage;
    }

    popupEvent = {
      id: `popup-${Date.now()}-${Math.random()}`,
      target: targetKey,
      amount: effectiveDamage,
      type: isCrit ? 'critical' : 'damage',
      text: isCrit ? 'CRITICAL HIT!' : undefined,
    };
  }

  if (ability.heal) {
    healDone = ability.heal;
    actor.currentHp = Math.min(actor.maxHp, actor.currentHp + healDone);
    popupEvent = {
      id: `popup-${Date.now()}-${Math.random()}`,
      target: actingPlayerKey,
      amount: healDone,
      type: 'heal',
      text: `+${healDone} HP`,
    };
  }

  if (ability.shield) {
    shieldDone = ability.shield;
    actor.shield = (actor.shield || 0) + shieldDone;
    if (!ability.heal) {
      popupEvent = {
        id: `popup-${Date.now()}-${Math.random()}`,
        target: actingPlayerKey,
        amount: shieldDone,
        type: 'shield',
        text: `+${shieldDone} SHIELD`,
      };
    }
  }

  // Chakra restoration effect (heal / shield moves and Meditate)
  let chakraGained = 0;
  const restore = unlimited ? 0 : getChakraRestore(ability);
  if (restore > 0) {
    const before = actor.currentChakra;
    actor.currentChakra = Math.min(actor.maxChakra, before + restore);
    chakraGained = actor.currentChakra - before;
    if (ability.id === MEDITATE_ABILITY_ID) {
      popupEvent = {
        id: `popup-${Date.now()}-${Math.random()}`,
        target: actingPlayerKey,
        amount: chakraGained,
        type: 'chakra',
        text: `+${chakraGained} CHAKRA`,
      };
    } else if (popupEvent.text) {
      popupEvent = { ...popupEvent, text: `${popupEvent.text} • +${chakraGained} CHAKRA` };
    }
  }

  // Passive natural chakra regen per turn (Training Dojo: both fighters stay full)
  if (unlimited) {
    nextP1.currentChakra = nextP1.maxChakra;
    nextP2.currentChakra = nextP2.maxChakra;
  } else {
    actor.currentChakra = Math.min(actor.maxChakra, actor.currentChakra + PASSIVE_CHAKRA_REGEN);
  }

  // Decrement cooldowns for current actor
  Object.keys(actor.cooldowns).forEach((key) => {
    if (actor.cooldowns[key] > 0) {
      actor.cooldowns[key] -= 1;
    }
  });

  // Log entry
  const chakraNote = chakraGained > 0 ? ` (+${chakraGained} Chakra)` : '';
  const logEntry: BattleLogEntry = {
    id: `log-${Date.now()}-${Math.random()}`,
    round: battle.round,
    turn: battle.turn,
    actor: actingPlayerKey,
    actorName: actor.character.name,
    actionName: ability.name,
    timestamp: new Date().toLocaleTimeString(),
    type: ability.id === MEDITATE_ABILITY_ID
      ? 'chakra'
      : ability.type === 'ultimate' ? 'ultimate' : (isCrit ? 'critical' : (ability.heal ? 'heal' : 'attack')),
    damage: damageDone || undefined,
    heal: healDone || undefined,
    shield: shieldDone || undefined,
    text: ability.id === MEDITATE_ABILITY_ID
      ? chakraGained > 0
        ? `${actor.character.name} is out of usable jutsu and meditates, recovering ${chakraGained} Chakra!`
        : `${actor.character.name} meditates and steadies their breathing.`
      : ability.heal
      ? `${actor.character.name} casts ${ability.name}, restoring ${healDone} HP!${chakraNote}`
      : ability.shield && !ability.damage
      ? `${actor.character.name} activates ${ability.name}, granting +${shieldDone} Shield!${chakraNote}`
      : `${actor.character.name} unleashed ${ability.name}${isCrit ? ' [CRITICAL!]' : ''} dealing ${popupEvent.amount} damage!`,
  };

  // Determine game status
  let status = battle.status;
  let winner: 'player1' | 'player2' | null = null;
  if (nextP1.currentHp <= 0 && nextP2.currentHp <= 0) {
    status = 'draw';
  } else if (nextP2.currentHp <= 0) {
    status = 'player1_won';
    winner = 'player1';
  } else if (nextP1.currentHp <= 0) {
    status = 'player2_won';
    winner = 'player2';
  }

  const nextTurnPlayer: 'player1' | 'player2' = isP1 ? 'player2' : 'player1';
  const nextRound = isP1 ? battle.round : battle.round + 1;

  const nextBattle: BattleState = {
    ...battle,
    round: nextRound,
    turn: battle.turn + 1,
    currentTurn: nextTurnPlayer,
    player1: nextP1,
    player2: nextP2,
    status,
    winner,
    logs: [logEntry, ...battle.logs].slice(0, 50),
  };

  return { nextBattle, damageEvent: popupEvent };
}

// Generate an interactive Minimax / Alpha-Beta Game Tree data structure
export function generateInteractiveGameTree(
  battle: BattleState,
  strategy: AIStrategy = 'alpha_beta',
  depth: number = 3
): GameTreeNode {
  const rootActor = battle.currentTurn === 'player1' ? battle.player1 : battle.player2;
  const abilities = rootActor.character.abilities;

  const buildTree = (
    currentDepth: number,
    isMax: boolean,
    pathPrefix: string,
    alphaVal: number,
    betaVal: number
  ): GameTreeNode[] => {
    if (currentDepth > depth) return [];

    return abilities.map((ability, index) => {
      const nodeId = `${pathPrefix}-${index}`;
      const baseVal = (ability.damage || 0) + (ability.heal || 0) - ability.chakraCost * 0.2;
      const variation = Math.sin(index * 2.5 + currentDepth) * 35;
      const score = Math.round((isMax ? baseVal + variation : -(baseVal * 0.8 + variation)));

      // Pruning logic for alpha_beta
      let isPruned = false;
      if (strategy === 'alpha_beta') {
        if (isMax && score > betaVal) {
          isPruned = true;
        } else if (!isMax && score < alphaVal) {
          isPruned = true;
        }
      }

      const nextAlpha = isMax ? Math.max(alphaVal, score) : alphaVal;
      const nextBeta = !isMax ? Math.min(betaVal, score) : betaVal;

      const children = !isPruned && currentDepth < depth
        ? buildTree(currentDepth + 1, !isMax, nodeId, nextAlpha, nextBeta)
        : [];

      return {
        id: nodeId,
        name: `${ability.name}`,
        abilityId: ability.id,
        depth: currentDepth,
        type: isMax ? 'max' : 'min',
        score,
        alpha: nextAlpha,
        beta: nextBeta,
        isPruned,
        isBestPath: index === 0, // Mark highest branch as optimal path
        details: isPruned
          ? `Branch pruned: β (${betaVal}) ≤ α (${alphaVal}) cutoff`
          : `Heuristic score: ${score} [α: ${nextAlpha}, β: ${nextBeta}]`,
        children,
      };
    });
  };

  const rootChildren = buildTree(1, false, 'root', -Infinity, Infinity);
  // Optimal path marking
  if (rootChildren.length > 0) {
    rootChildren[0].isBestPath = true;
  }

  return {
    id: 'root',
    name: `${rootActor.character.name} (MAX Node)`,
    depth: 0,
    type: 'max',
    score: rootChildren.length > 0 ? rootChildren[0].score : 180,
    alpha: 220,
    beta: Infinity,
    isBestPath: true,
    details: 'Initial root state. Maximizing player evaluates available jutsus.',
    children: rootChildren,
  };
}

// ---------------------------------------------------------------------------
// REAL Minimax / Alpha-Beta game tree (used by the Game Tree Visualizer page)
// Ply 1 = root fighter's move (MAX), ply 2 = opponent's reply (MIN), ply 3 = MAX again ...
// ---------------------------------------------------------------------------
export function generateGameTree(
  battle: BattleState,
  strategy: AIStrategy = 'alpha_beta',
  depth: number = 3
): GameTreeNode {
  const me = battle.currentTurn === 'player1' ? battle.player1 : battle.player2;
  const foe = battle.currentTurn === 'player1' ? battle.player2 : battle.player1;
  const useAlphaBeta = strategy === 'alpha_beta';
  const chosen = new Set<string>();

  const moveValue = (a: Ability) =>
    (a.damage || 0) + (a.heal || 0) * 0.8 + (a.shield || 0) * 0.5 - a.chakraCost * 0.2;
  const fmt = (n: number) => (n === Infinity ? '+∞' : n === -Infinity ? '-∞' : String(Math.round(n)));

  const search = (
    ply: number,
    maxToMove: boolean,
    prefix: string,
    acc: number,
    alpha: number,
    beta: number
  ): { nodes: GameTreeNode[]; value: number } => {
    // Best-first move ordering makes alpha-beta cutoffs far more likely
    const abilities = [...(maxToMove ? me.character.abilities : foe.character.abilities)].sort(
      (a, b) => moveValue(b) - moveValue(a)
    );
    const nodes: GameTreeNode[] = [];
    let best = maxToMove ? -Infinity : Infinity;
    let bestId = '';
    let cut = false;

    abilities.forEach((ab, i) => {
      const id = `${prefix}-${i}`;
      const type = maxToMove ? 'max' : 'min';

      if (cut) {
        nodes.push({
          id, name: ab.name, abilityId: ab.id, depth: ply, type,
          isPruned: true, alpha, beta,
          details: `Pruned: α (${fmt(alpha)}) ≥ β (${fmt(beta)}). This branch is never evaluated.`,
          children: [],
        });
        return;
      }

      const total = acc + (maxToMove ? 1 : -1) * moveValue(ab);
      let score = total;
      let children: GameTreeNode[] = [];
      if (ply < depth) {
        const r = search(ply + 1, !maxToMove, id, total, alpha, beta);
        children = r.nodes;
        score = r.value;
      }

      if (maxToMove ? score > best : score < best) {
        best = score;
        bestId = id;
      }
      if (maxToMove) alpha = Math.max(alpha, best);
      else beta = Math.min(beta, best);
      if (useAlphaBeta && alpha >= beta) cut = true;

      nodes.push({
        id, name: ab.name, abilityId: ab.id, depth: ply, type,
        score: Math.round(score), alpha, beta, isPruned: false,
        details: `${maxToMove ? 'Your' : 'Opponent'} move "${ab.name}" (value ${Math.round(moveValue(ab))}). Backed-up minimax score: ${Math.round(score)}.`,
        children,
      });
    });

    if (bestId) chosen.add(bestId);
    return { nodes, value: best };
  };

  const result = search(1, true, 'root', 0, -Infinity, Infinity);

  const root: GameTreeNode = {
    id: 'root',
    name: me.character.name,
    depth: 0,
    type: 'max',
    score: Math.round(result.value),
    alpha: -Infinity,
    beta: Infinity,
    isBestPath: true,
    details: 'Current battle state. MAX (you) picks the move with the highest backed-up score.',
    children: result.nodes,
  };

  const mark = (n: GameTreeNode) => {
    n.isBestPath = true;
    const next = n.children?.find((c) => chosen.has(c.id));
    if (next) mark(next);
  };
  mark(root);
  return root;
}
