from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.models.ability import Ability
from backend.models.battle_state import BattleAction, BattleState
from backend.models.character import Character
from backend.models.enums import ActionType, AIStrategy, BattleStatus


class BattleStartRequest(BaseModel):
    player1_character_id: str
    player2_character_id: str
    ai1_strategy: Optional[AIStrategy] = None
    ai2_strategy: Optional[AIStrategy] = AIStrategy.MINIMAX
    max_turns: int = 100


class PlayerActionRequest(BaseModel):
    player_num: int
    action_type: ActionType
    ability_id: Optional[str] = None


class AIMoveRequest(BaseModel):
    depth: Optional[int] = None
    auto_execute: bool = True


class AIMoveResponse(BaseModel):
    action: BattleAction
    explanation: str
    stats: Dict[str, Any]
    state: Optional[BattleState] = None


class AIExplainRequest(BaseModel):
    battle_id: Optional[str] = None
    state: Optional[BattleState] = None
    player_num: int = 1
    strategy: AIStrategy = AIStrategy.MINIMAX
    depth: int = 3


class GameTreeRequest(BaseModel):
    battle_id: Optional[str] = None
    state: Optional[BattleState] = None
    player_num: int = 1
    strategy: AIStrategy = AIStrategy.ALPHA_BETA
    depth: int = 2


class TournamentParticipantInput(BaseModel):
    character_id: str
    ai_strategy: AIStrategy = AIStrategy.MINIMAX
    name: Optional[str] = None


class TournamentStartRequest(BaseModel):
    name: str = "Chunin Exams Tournament"
    participants: List[TournamentParticipantInput]
    auto_run: bool = True


class BattleStateResponse(BaseModel):
    state: BattleState
    valid_actions: List[BattleAction]


class SettingsSchema(BaseModel):
    default_minimax_depth: int = 3
    default_alphabeta_depth: int = 3
    max_battle_turns: int = 100
    w1_own_hp: float = 40.0
    w2_opp_hp: float = 40.0
    w3_own_chakra: float = 10.0
    w4_opp_chakra: float = 10.0
    w5_status: float = 5.0
