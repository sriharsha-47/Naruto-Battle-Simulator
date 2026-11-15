"""Shared helpers for the sampling / probabilistic search AIs
(ExpectimaxAI, MCTSAI, EvolutionaryAI)."""
import math
import random
from copy import deepcopy
from typing import List, Optional

from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import ActionType, BattleStatus


def snapshot(state: BattleState) -> BattleState:
    """Deep copy of a battle state WITHOUT its (potentially long) combat log.
    Simulations never need the log, and skipping it makes every clone much cheaper."""
    return deepcopy(state, {id(state.log): []})


def terminal_reward(state: BattleState, player_num: int) -> Optional[float]:
    """1.0 = player_num won, 0.0 = lost, 0.5 = draw, None = battle still ongoing."""
    if state.status == BattleStatus.ONGOING:
        return None
    if state.status == BattleStatus.DRAW:
        return 0.5
    if state.status == BattleStatus.PLAYER1_WON:
        return 1.0 if player_num == 1 else 0.0
    return 1.0 if player_num == 2 else 0.0


def squash(score: float, scale: float = 25.0) -> float:
    """Maps a heuristic score (roughly -100..100) into (0, 1)."""
    return 1.0 / (1.0 + math.exp(-score / scale))


def quick_action_score(state: BattleState, player_num: int, action: BattleAction) -> float:
    """Very cheap 1-ply 'what would a sensible player do' score (no simulation).
    Used for opponent models and rollout policies."""
    me = state.get_player(player_num)
    foe = state.get_player(2 if player_num == 1 else 1)
    ratio = me.effective_attack / max(1, foe.effective_defense)
    defend_mult = 0.5 if foe.is_defending else 1.0
    low_hp = me.hp < me.max_hp * 0.35

    if action.type == ActionType.BASIC_ATTACK:
        dmg = 22 * ratio * defend_mult
        return dmg + (600.0 if dmg >= foe.hp + foe.current_shield else 0.0)
    if action.type == ActionType.DEFEND:
        return 12.0 if low_hp else 4.0
    if action.type == ActionType.RECOVER_CHAKRA:
        return 30.0 if me.chakra < 0.2 * max(1, me.max_chakra) else 2.0
    ab = me.get_ability(action.ability_id) if action.ability_id else None
    if ab is None:
        return 0.0
    dmg = ab.damage * ratio * defend_mult
    score = dmg + ab.heal * (2.0 if low_hp else 0.5) - ab.chakra_cost * 0.15 - ab.self_damage * 0.8
    if dmg >= foe.hp + foe.current_shield:
        score += 600.0
    if ab.status_effect is not None:
        score += 10.0
    return score


def greedy_action(state: BattleState, player_num: int, actions: List[BattleAction]) -> BattleAction:
    return max(actions, key=lambda a: quick_action_score(state, player_num, a))


def biased_random_action(
    state: BattleState, player_num: int, actions: List[BattleAction], greedy_prob: float = 0.6
) -> BattleAction:
    if random.random() < greedy_prob:
        return greedy_action(state, player_num, actions)
    return random.choice(actions)
