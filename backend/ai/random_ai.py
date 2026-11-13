import random
import time
from typing import Any, Dict, Tuple
from backend.ai.base import BaseAI
from backend.engine.action_validator import ActionValidator
from backend.models.battle_state import BattleAction, BattleState


class RandomAI(BaseAI):
    def __init__(self, name: str = "Random AI", seed: Any = None):
        super().__init__(name=name)
        if seed is not None:
            random.seed(seed)

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start_time = time.perf_counter()
        valid_actions = ActionValidator.get_valid_actions(state, player_num)

        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        chosen = random.choice(valid_actions)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        stats = {
            "strategy": "random",
            "execution_time_ms": round(elapsed_ms, 3),
            "total_valid_actions": len(valid_actions),
            "nodes_explored": 1,
        }
        return chosen, stats
