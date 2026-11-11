from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from backend.ai.ai_factory import AIFactory
from backend.ai.alphabeta import AlphaBetaAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.ai.minimax import MinimaxAI
from backend.api.routes.battle import active_battles
from backend.api.schemas import AIExplainRequest, GameTreeRequest
from backend.api.settings_manager import settings_manager
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleState
from backend.models.enums import AIStrategy, BattleStatus

router = APIRouter(prefix="/api/ai", tags=["AI Explanation & Visualization"])


def _resolve_state(
    battle_id: Optional[str], state_obj: Optional[BattleState]
) -> BattleState:
    if state_obj is not None:
        return state_obj
    if battle_id and battle_id in active_battles:
        return active_battles[battle_id]
    raise HTTPException(
        status_code=400,
        detail="Must provide either an active 'battle_id' or a valid 'state' object",
    )


@router.post("/explain")
def explain_ai_decision(req: AIExplainRequest) -> Dict[str, Any]:
    state = _resolve_state(req.battle_id, req.state)
    if state.status != BattleStatus.ONGOING:
        raise HTTPException(
            status_code=400,
            detail=f"Battle is not ongoing (status: {state.status.value})",
        )

    player_num = req.player_num
    weights = settings_manager.get_heuristic_weights()
    ai = AIFactory.create_ai(req.strategy, max_depth=req.depth, weights=weights)

    action, stats = ai.select_action(state, player_num)
    actor = state.get_player(player_num)
    opp = state.get_player(2 if player_num == 1 else 1)

    # Heuristic breakdown of the simulated state
    sim_state = BattleEngine.simulate_action(state, action)
    sim_actor = sim_state.get_player(player_num)
    sim_opp = sim_state.get_player(2 if player_num == 1 else 1)

    own_hp_pct = round((sim_actor.hp / max(1, sim_actor.max_hp)) * 100, 1)
    opp_hp_pct = round((sim_opp.hp / max(1, sim_opp.max_hp)) * 100, 1)

    own_chakra_pct = (
        round((sim_actor.chakra / max(1, sim_actor.max_chakra)) * 100, 1)
        if sim_actor.max_chakra > 0
        else 0
    )
    opp_chakra_pct = (
        round((sim_opp.chakra / max(1, sim_opp.max_chakra)) * 100, 1)
        if sim_opp.max_chakra > 0
        else 0
    )

    action_evals = stats.get("action_evaluations", [])
    best_score = stats.get("best_score")

    explanation_lines = [
        f"{actor.name} selected {action} using strategy '{req.strategy.value}' at depth {req.depth}."
    ]
    if best_score is not None:
        explanation_lines.append(f"Optimal heuristic evaluation: {best_score}.")

    if "rule_triggered" in stats:
        explanation_lines.append(f"Strategic trigger: {stats['rule_triggered']}.")

    explanation_lines.append(
        f"Projected state after move: Own HP {sim_actor.hp}/{sim_actor.max_hp} ({own_hp_pct}%), "
        f"Opponent HP {sim_opp.hp}/{sim_opp.max_hp} ({opp_hp_pct}%)."
    )

    return {
        "strategy": req.strategy.value,
        "depth": req.depth,
        "selected_action": action.model_dump(),
        "stats": stats,
        "action_evaluations": action_evals,
        "state_projection": {
            "own_hp": sim_actor.hp,
            "own_hp_pct": own_hp_pct,
            "opp_hp": sim_opp.hp,
            "opp_hp_pct": opp_hp_pct,
            "own_chakra": sim_actor.chakra,
            "own_chakra_pct": own_chakra_pct,
            "opp_chakra": sim_opp.chakra,
            "opp_chakra_pct": opp_chakra_pct,
        },
        "explanation": " ".join(explanation_lines),
    }


@router.post("/game-tree")
def get_game_tree(req: GameTreeRequest) -> Dict[str, Any]:
    state = _resolve_state(req.battle_id, req.state)
    if state.status != BattleStatus.ONGOING:
        raise HTTPException(
            status_code=400,
            detail=f"Battle is not ongoing (status: {state.status.value})",
        )

    # Restrict depth to 3 for game tree visual to keep response payload reasonable
    search_depth = min(max(1, req.depth), 3)
    weights = settings_manager.get_heuristic_weights()

    if req.strategy == AIStrategy.MINIMAX:
        ai_minimax = MinimaxAI(max_depth=search_depth, weights=weights)
        action, stats = ai_minimax.search(
            state, req.player_num, depth=search_depth, build_tree=True
        )
    else:
        ai_ab = AlphaBetaAI(max_depth=search_depth, weights=weights)
        action, stats = ai_ab.search(
            state, req.player_num, depth=search_depth, build_tree=True
        )

    return {
        "strategy": req.strategy.value,
        "depth": search_depth,
        "best_action": action.model_dump(),
        "stats": {k: v for k, v in stats.items() if k != "game_tree"},
        "game_tree": stats.get("game_tree"),
    }
