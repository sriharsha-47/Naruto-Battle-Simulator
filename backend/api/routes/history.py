import json
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query
from backend.database.db import db
from backend.database.models import BattleRecord

router = APIRouter(prefix="/api/battles", tags=["Battle History"])


@router.get("/history", response_model=List[BattleRecord])
def get_battle_history(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> List[BattleRecord]:
    return db.list_battles(limit=limit, offset=offset)


@router.get("/{battle_id}/detail")
def get_battle_detail(battle_id: str) -> Dict[str, Any]:
    record = db.get_battle(battle_id)
    if not record:
        raise HTTPException(
            status_code=404, detail=f"Battle '{battle_id}' not found in history"
        )

    log_entries = []
    try:
        log_entries = json.loads(record.log_json)
    except Exception:
        pass

    metrics = db.get_ai_metrics(battle_id=battle_id)

    return {
        "battle": record.model_dump(exclude={"log_json"}),
        "log": log_entries,
        "ai_metrics": [m.model_dump() for m in metrics],
    }
