import math
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.ai.search_utils import snapshot
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import BattleStatus


class ExpectimaxAI(BaseAI):
    """
    Expectimax search with a probabilistic opponent model.

    - MAX nodes   : the AI's own turns (pick the child with the highest value).
    - CHANCE nodes: the opponent's turns. Instead of assuming a perfect adversary
      (Minimax), the opponent is modelled as a Boltzmann / soft-max player whose
      move probabilities follow its own 1-ply heuristic evaluation. The value of a
      chance node is the probability-weighted average of its children.

    Damage variance is integrated through the engine's deterministic (expected)
    damage, so the tree stays small while remaining an unbiased estimate.
    """

    def __init__(
        self,
        name: str = "Expectimax AI",
        max_depth: int = 3,
        weights: Optional[HeuristicWeights] = None,
        temperature: float = 12.0,
        node_budget: int = 2500,
    ):
        super().__init__(name=name)
        self.max_depth = max_depth
        self.weights = weights or HeuristicWeights()
        self.temperature = max(0.1, temperature)
        self.node_budget = node_budget
        self.nodes_explored = 0
        self.max_depth_reached = 0

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start_time = time.perf_counter()
        self.nodes_explored = 0
        self.max_depth_reached = 0

        valid_actions = ActionValidator.get_valid_actions(state, player_num)
        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        root = snapshot(state)
        best_score = float("-inf")
        best_action = valid_actions[0]
        evaluations: List[Dict[str, Any]] = []

        for action in valid_actions:
            self.nodes_explored += 1
            child = BattleEngine.simulate_action(root, action)
            score = self._value(child, self.max_depth - 1, player_num, 1)
            evaluations.append({
                "action": str(action),
                "type": action.type.value,
                "ability_id": action.ability_id,
                "score": round(score, 2),
            })
            if score > best_score:
                best_score = score
                best_action = action

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        stats: Dict[str, Any] = {
            "strategy": "expectimax",
            "search_depth": self.max_depth,
            "max_depth_reached": self.max_depth_reached,
            "nodes_explored": self.nodes_explored,
            "best_score": round(best_score, 2),
            "execution_time_ms": round(elapsed_ms, 2),
            "action_evaluations": evaluations,
        }
        return best_action, stats

    def _value(self, state: BattleState, depth: int, ai_player: int, current_depth: int) -> float:
        self.max_depth_reached = max(self.max_depth_reached, current_depth)

        if (
            state.status != BattleStatus.ONGOING
            or depth <= 0
            or self.nodes_explored >= self.node_budget
        ):
            return evaluate_heuristic(state, ai_player, self.weights)

        mover = state.current_turn_player
        actions = ActionValidator.get_valid_actions(state, mover)
        if not actions:
            return evaluate_heuristic(state, ai_player, self.weights)

        if mover == ai_player:  # MAX node
            best = float("-inf")
            for action in actions:
                self.nodes_explored += 1
                child = BattleEngine.simulate_action(state, action)
                best = max(best, self._value(child, depth - 1, ai_player, current_depth + 1))
            return best

        # CHANCE node: opponent replies drawn from a soft-max over its own evaluation
        children: List[BattleState] = []
        qs: List[float] = []
        for action in actions:
            self.nodes_explored += 1
            child = BattleEngine.simulate_action(state, action)
            children.append(child)
            qs.append(evaluate_heuristic(child, mover, self.weights))

        q_max = max(qs)
        exps = [math.exp((q - q_max) / self.temperature) for q in qs]
        total = sum(exps)
        expected = 0.0
        for p_raw, child in zip(exps, children):
            expected += (p_raw / total) * self._value(child, depth - 1, ai_player, current_depth + 1)
        return expected
