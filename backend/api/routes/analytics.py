from typing import Any, Dict
from fastapi import APIRouter
from backend.analytics.stats import stats_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
def get_analytics_summary() -> Dict[str, Any]:
    return stats_service.get_summary()


@router.get("/ai-comparison")
def get_ai_comparison() -> Dict[str, Any]:
    return stats_service.get_ai_comparison()
