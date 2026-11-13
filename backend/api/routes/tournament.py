from fastapi import APIRouter, HTTPException
from backend.api.schemas import TournamentStartRequest
from backend.tournament.tournament import Tournament, tournament_manager

router = APIRouter(prefix="/api/tournament", tags=["Tournament"])


@router.post("/start", response_model=Tournament)
def start_tournament(req: TournamentStartRequest) -> Tournament:
    participants_data = [p.model_dump() for p in req.participants]
    try:
        tourn = tournament_manager.create_tournament(
            name=req.name, participants_data=participants_data
        )
        if req.auto_run:
            tourn = tournament_manager.run_entire_tournament(tourn.id)
        return tourn
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{tournament_id}/status", response_model=Tournament)
def get_tournament_status(tournament_id: str) -> Tournament:
    tourn = tournament_manager.get_tournament(tournament_id)
    if not tourn:
        raise HTTPException(
            status_code=404, detail=f"Tournament '{tournament_id}' not found"
        )
    return tourn
