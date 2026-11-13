from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import (
    analytics_router,
    ai_router,
    battle_router,
    characters_router,
    history_router,
    settings_router,
    tournament_router,
)

app = FastAPI(
    title="Naruto Battle Simulator API",
    description="Adversarial AI turn-based Naruto Battle Engine and Tournament Simulator",
    version="1.0.0",
)

# CORS middleware configuration for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all endpoint routers
app.include_router(characters_router)
app.include_router(battle_router)
app.include_router(tournament_router)
app.include_router(analytics_router)
app.include_router(history_router)
app.include_router(ai_router)
app.include_router(settings_router)


@app.get("/")
def root():
    return {
        "message": "Naruto Battle Simulator API is operational!",
        "version": "1.0.0",
        "docs_url": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
