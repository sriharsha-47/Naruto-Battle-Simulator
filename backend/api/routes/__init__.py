from backend.api.routes.characters import router as characters_router
from backend.api.routes.battle import router as battle_router
from backend.api.routes.tournament import router as tournament_router
from backend.api.routes.analytics import router as analytics_router
from backend.api.routes.history import router as history_router
from backend.api.routes.ai import router as ai_router
from backend.api.routes.settings import router as settings_router

__all__ = [
    "characters_router",
    "battle_router",
    "tournament_router",
    "analytics_router",
    "history_router",
    "ai_router",
    "settings_router",
]
