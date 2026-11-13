from typing import Dict, Optional
from fastapi import APIRouter, HTTPException
from backend.ai.ai_factory import AIFactory
from backend.analytics.collector import analytics_collector
from backend.api.schemas import (
    AIMoveRequest,
    AIMoveResponse,
    BattleStartRequest,
    BattleStateResponse,
    PlayerActionRequest,
)
from backend.api.settings_manager import settings_manager
from backend.data.loader import get_character_by_id
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import AIStrategy, BattleStatus

router = APIRouter(prefix="/api/battle", tags=["Battle"])

# In-memory active battles
active_battles: Dict[str, BattleState] = {}


@router.post("/start", response_model=BattleStateResponse)
def start_battle(req: BattleStartRequest) -> BattleStateResponse:
    c1 = get_character_by_id(req.player1_character_id)
    if not c1:
        raise HTTPException(
            status_code=404,
            detail=f"Player 1 character not found: {req.player1_character_id}",
        )

    c2 = get_character_by_id(req.player2_character_id)
    if not c2:
        raise HTTPException(
            status_code=404,
            detail=f"Player 2 character not found: {req.player2_character_id}",
        )

    state = BattleEngine.create_battle(
        player1=c1,
        player2=c2,
        ai1_type=req.ai1_strategy,
        ai2_type=req.ai2_strategy,
        max_turns=req.max_turns or settings_manager.get_settings().max_battle_turns,
    )
    active_battles[state.battle_id] = state

    valid_actions = ActionValidator.get_valid_actions(state, state.current_turn_player)
    return BattleStateResponse(state=state, valid_actions=valid_actions)


@router.get("/{battle_id}/state", response_model=BattleStateResponse)
def get_battle_state(battle_id: str) -> BattleStateResponse:
    state = active_battles.get(battle_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")

    valid_actions = ActionValidator.get_valid_actions(state, state.current_turn_player)
    return BattleStateResponse(state=state, valid_actions=valid_actions)


@router.post("/{battle_id}/action", response_model=BattleStateResponse)
def player_action(battle_id: str, req: PlayerActionRequest) -> BattleStateResponse:
    state = active_battles.get(battle_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")

    if state.status != BattleStatus.ONGOING:
        raise HTTPException(
            status_code=400,
            detail=f"Battle is already finished with status: {state.status.value}",
        )

    action = BattleAction(type=req.action_type, ability_id=req.ability_id)
    try:
        BattleEngine.execute_action(state, action, deterministic=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if state.status != BattleStatus.ONGOING:
        analytics_collector.record_battle_completion(state)

    valid_actions = ActionValidator.get_valid_actions(state, state.current_turn_player)
    return BattleStateResponse(state=state, valid_actions=valid_actions)


@router.post("/{battle_id}/ai-move", response_model=AIMoveResponse)
def ai_move(battle_id: str, req: AIMoveRequest) -> AIMoveResponse:
    state = active_battles.get(battle_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Battle '{battle_id}' not found")

    if state.status != BattleStatus.ONGOING:
        raise HTTPException(
            status_code=400,
            detail=f"Battle is already finished with status: {state.status.value}",
        )

    current_player_num = state.current_turn_player
    ai_strategy = (
        state.ai1_type if current_player_num == 1 else state.ai2_type
    ) or AIStrategy.ALPHA_BETA

    depth = req.depth or settings_manager.get_settings().default_alphabeta_depth
    weights = settings_manager.get_heuristic_weights()

    ai_instance = AIFactory.create_ai(ai_strategy, max_depth=depth, weights=weights)
    action, stats = ai_instance.select_action(state, current_player_num)

    # Record metrics
    analytics_collector.record_ai_step(
        battle_id=state.battle_id,
        turn=state.turn_count,
        player_num=current_player_num,
        ai_strategy=ai_strategy.value,
        action=action,
        stats=stats,
    )

    actor_name = state.get_player(current_player_num).name

    # Formulate human-readable explanation
    explanation = f"{actor_name} ({ai_strategy.value}) chose {action}."
    if "best_score" in stats:
        explanation += f" Evaluated score: {stats['best_score']}."
    if "rule_triggered" in stats:
        explanation += f" Rule: {stats['rule_triggered']}."
    if "pruning_efficiency_pct" in stats:
        explanation += f" Explored {stats['nodes_explored']} nodes, pruned {stats['nodes_pruned']} ({stats['pruning_efficiency_pct']}% pruned)."

    if req.auto_execute:
        BattleEngine.execute_action(state, action, deterministic=False)
        if state.status != BattleStatus.ONGOING:
            analytics_collector.record_battle_completion(state)

    return AIMoveResponse(
        action=action,
        explanation=explanation,
        stats=stats,
        state=state if req.auto_execute else None,
    )
