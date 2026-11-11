import time
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel
from backend.ai.base import BaseAI
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.character import Character
from backend.models.enums import BattleStatus, StatusEffectType


class HeuristicWeights(BaseModel):
    w1_own_hp: float = 40.0
    w2_opp_hp: float = 40.0
    w3_own_chakra: float = 10.0
    w4_opp_chakra: float = 10.0
    w5_status: float = 5.0


def calculate_status_score(character: Character) -> float:
    score = 0.0
    # Shield bonus
    score += (character.current_shield / 30.0)

    # Defending stance
    if character.is_defending:
        score += 0.5

    for eff in character.status_effects:
        if eff.effect_type in (StatusEffectType.BUFF_ATTACK, StatusEffectType.BUFF_DEFENSE):
            score += (eff.value / 15.0) * eff.duration
        elif eff.effect_type in (StatusEffectType.DEBUFF_ATTACK, StatusEffectType.DEBUFF_DEFENSE):
            score -= (eff.value / 15.0) * eff.duration
        elif eff.effect_type in (StatusEffectType.POISON, StatusEffectType.BURN):
            score -= (eff.value * eff.duration) / 20.0
        elif eff.effect_type == StatusEffectType.STUN:
            score -= 2.0

    return score


def evaluate_heuristic(
    state: BattleState,
    player_num: int,
    weights: Optional[HeuristicWeights] = None,
) -> float:
    """
    Evaluates the battle state from the perspective of player_num.
    Higher values favor player_num.
    """
    if weights is None:
        weights = HeuristicWeights()

    opp_player_num = 2 if player_num == 1 else 1

    # Terminal state checks
    if state.status == BattleStatus.PLAYER1_WON:
        return 10000.0 if player_num == 1 else -10000.0
    elif state.status == BattleStatus.PLAYER2_WON:
        return 10000.0 if player_num == 2 else -10000.0
    elif state.status == BattleStatus.DRAW:
        return 0.0

    own = state.get_player(player_num)
    opp = state.get_player(opp_player_num)

    if not own.is_alive:
        return -10000.0
    if not opp.is_alive:
        return 10000.0

    # HP ratios
    own_hp_ratio = own.hp / max(1, own.max_hp)
    opp_hp_ratio = opp.hp / max(1, opp.max_hp)

    # Chakra ratios (Rock Lee handles max_chakra = 0)
    own_chakra_ratio = (own.chakra / own.max_chakra) if own.max_chakra > 0 else 0.5
    opp_chakra_ratio = (opp.chakra / opp.max_chakra) if opp.max_chakra > 0 else 0.5

    # Status advantage
    own_status = calculate_status_score(own)
    opp_status = calculate_status_score(opp)
    status_advantage = own_status - opp_status

    score = (
        (own_hp_ratio * weights.w1_own_hp)
        - (opp_hp_ratio * weights.w2_opp_hp)
        + (own_chakra_ratio * weights.w3_own_chakra)
        - (opp_chakra_ratio * weights.w4_opp_chakra)
        + (status_advantage * weights.w5_status)
    )
    return float(score)


class HeuristicAI(BaseAI):
    """
    1-ply Heuristic search: explores every immediate valid action,
    simulates state transition deterministically, and selects
    the action that yields the highest heuristic evaluation.
    """

    def __init__(
        self,
        name: str = "Heuristic AI",
        weights: Optional[HeuristicWeights] = None,
    ):
        super().__init__(name=name)
        self.weights = weights or HeuristicWeights()

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start_time = time.perf_counter()
        valid_actions = ActionValidator.get_valid_actions(state, player_num)

        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        best_score = float("-inf")
        best_action = valid_actions[0]
        action_evaluations: List[Dict[str, Any]] = []

        for action in valid_actions:
            simulated_state = BattleEngine.simulate_action(state, action)
            score = evaluate_heuristic(simulated_state, player_num, self.weights)

            action_evaluations.append({
                "action": str(action),
                "type": action.type.value,
                "ability_id": action.ability_id,
                "score": round(score, 2),
            })

            if score > best_score:
                best_score = score
                best_action = action

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        stats = {
            "strategy": "heuristic",
            "best_score": round(best_score, 2),
            "execution_time_ms": round(elapsed_ms, 2),
            "nodes_explored": len(valid_actions),
            "action_evaluations": action_evaluations,
        }
        return best_action, stats
