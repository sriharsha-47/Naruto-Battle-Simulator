import json
from typing import Any, Dict, Optional
from backend.database.db import Database, db
from backend.database.models import AIMetricRecord, BattleRecord
from backend.models.battle_state import BattleAction, BattleState


class AnalyticsCollector:
    def __init__(self, database: Optional[Database] = None):
        self.db = database or db

    def record_ai_step(
        self,
        battle_id: str,
        turn: int,
        player_num: int,
        ai_strategy: str,
        action: BattleAction,
        stats: Dict[str, Any],
    ) -> None:
        metric = AIMetricRecord(
            battle_id=battle_id,
            turn=turn,
            player_num=player_num,
            ai_strategy=ai_strategy,
            action_type=action.type.value,
            ability_id=action.ability_id,
            score=stats.get("best_score"),
            nodes_explored=stats.get("nodes_explored", 0),
            nodes_pruned=stats.get("nodes_pruned", 0),
            execution_time_ms=stats.get("execution_time_ms", 0.0),
            depth=stats.get("search_depth"),
        )
        self.db.save_ai_metric(metric)

    def record_battle_completion(self, state: BattleState) -> None:
        log_json_data = json.dumps([entry.model_dump() for entry in state.log])
        record = BattleRecord(
            id=state.battle_id,
            player1_id=state.player1.id,
            player1_name=state.player1.name,
            player2_id=state.player2.id,
            player2_name=state.player2.name,
            ai1_type=state.ai1_type.value if state.ai1_type else "human",
            ai2_type=state.ai2_type.value if state.ai2_type else "human",
            winner=state.winner,
            winner_player=state.winner_player,
            total_turns=state.turn_count,
            status=state.status.value,
            log_json=log_json_data,
        )
        self.db.save_battle(record)


analytics_collector = AnalyticsCollector()
