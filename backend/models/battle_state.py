from copy import deepcopy
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.models.character import Character
from backend.models.enums import ActionType, BattleStatus, AIStrategy


class BattleAction(BaseModel):
    type: ActionType
    ability_id: Optional[str] = None

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, BattleAction):
            return False
        return self.type == other.type and self.ability_id == other.ability_id

    def __hash__(self) -> int:
        return hash((self.type, self.ability_id))

    def __str__(self) -> str:
        if self.type == ActionType.ABILITY:
            return f"Ability({self.ability_id})"
        return self.type.value


class BattleLogEntry(BaseModel):
    turn: int
    actor_name: str
    actor_player: int
    action_type: ActionType
    ability_name: Optional[str] = None
    damage_dealt: int = 0
    healing_done: int = 0
    chakra_change: int = 0
    status_applied: Optional[str] = None
    message: str = ""
    p1_hp_after: int = 0
    p1_chakra_after: int = 0
    p2_hp_after: int = 0
    p2_chakra_after: int = 0


class BattleState(BaseModel):
    battle_id: str
    player1: Character
    player2: Character
    current_turn_player: int = 1  # 1 or 2
    turn_count: int = 1
    status: BattleStatus = BattleStatus.ONGOING
    winner: Optional[str] = None
    winner_player: Optional[int] = None
    log: List[BattleLogEntry] = Field(default_factory=list)
    max_turns: int = 100
    ai1_type: Optional[AIStrategy] = None
    ai2_type: Optional[AIStrategy] = None

    def get_active_player(self) -> Character:
        return self.player1 if self.current_turn_player == 1 else self.player2

    def get_inactive_player(self) -> Character:
        return self.player2 if self.current_turn_player == 1 else self.player1

    def get_player(self, player_num: int) -> Character:
        return self.player1 if player_num == 1 else self.player2

    def clone(self) -> "BattleState":
        return deepcopy(self)
