from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BattleRecord(BaseModel):
    id: str
    player1_id: str
    player1_name: str
    player2_id: str
    player2_name: str
    ai1_type: Optional[str] = None
    ai2_type: Optional[str] = None
    winner: Optional[str] = None
    winner_player: Optional[int] = None
    total_turns: int = 0
    status: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    log_json: str = "[]"


class AIMetricRecord(BaseModel):
    id: Optional[int] = None
    battle_id: str
    turn: int
    player_num: int
    ai_strategy: str
    action_type: str
    ability_id: Optional[str] = None
    score: Optional[float] = None
    nodes_explored: int = 0
    nodes_pruned: int = 0
    execution_time_ms: float = 0.0
    depth: Optional[int] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class TournamentRecord(BaseModel):
    id: str
    name: str
    status: str
    winner_id: Optional[str] = None
    winner_name: Optional[str] = None
    rounds_json: str = "[]"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
