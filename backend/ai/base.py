from abc import ABC, abstractmethod
from typing import Any, Dict, Tuple
from backend.models.battle_state import BattleAction, BattleState


class BaseAI(ABC):
    def __init__(self, name: str = "BaseAI"):
        self.name = name

    @abstractmethod
    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        """
        Selects an action for the given player_num.
        Returns:
            Tuple[BattleAction, Dict[str, Any]]:
                (selected_action, metadata_and_statistics)
        """
        pass
