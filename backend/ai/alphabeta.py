import time
from typing import Any, Dict, List, Optional, Tuple
from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.character import Character
from backend.models.enums import ActionType, BattleStatus, EffectType


class AlphaBetaAI(BaseAI):
    """
    Genuine Alpha-Beta Pruning adversarial search.
    Implements move-ordering heuristics to maximize cutoffs.
    Guaranteed to produce identical optimal minimax scores to MinimaxAI.
    """

    def __init__(
        self,
        name: str = "Alpha-Beta AI",
        max_depth: int = 3,
        weights: Optional[HeuristicWeights] = None,
    ):
        super().__init__(name=name)
        self.max_depth = max_depth
        self.weights = weights or HeuristicWeights()
        self.nodes_explored = 0
        self.nodes_pruned = 0
        self.max_depth_reached = 0

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        return self.search(state, player_num, depth=self.max_depth, build_tree=False)

    def _score_action_for_ordering(self, action: BattleAction, actor: Character) -> float:
        """
        Move-ordering heuristic: prioritizing high-damage and lethal moves
        allows alpha to rise faster, maximizing pruning efficiency.
        """
        if action.type == ActionType.ABILITY:
            ab = actor.get_ability(action.ability_id)
            if not ab:
                return 0.0
            if ab.is_ultimate:
                return 1000.0 + ab.damage * 5.0
            if ab.effect_type == EffectType.STUN:
                return 600.0 + ab.damage * 5.0
            if ab.damage > 0:
                return 500.0 + ab.damage * 5.0
            if ab.heal > 0:
                return 400.0 + ab.heal * 3.0
            if ab.effect_type == EffectType.SHIELD:
                return 350.0
            return 200.0
        elif action.type == ActionType.BASIC_ATTACK:
            return 150.0
        elif action.type == ActionType.DEFEND:
            return 80.0
        elif action.type == ActionType.RECOVER_CHAKRA:
            return 50.0
        return 0.0

    def order_actions(self, actions: List[BattleAction], actor: Character) -> List[BattleAction]:
        return sorted(actions, key=lambda a: self._score_action_for_ordering(a, actor), reverse=True)

    def search(
        self,
        state: BattleState,
        player_num: int,
        depth: Optional[int] = None,
        build_tree: bool = False,
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start_time = time.perf_counter()
        search_depth = depth if depth is not None else self.max_depth

        self.nodes_explored = 0
        self.nodes_pruned = 0
        self.max_depth_reached = 0
        node_counter = [0]

        actor = state.get_player(player_num)
        valid_actions = ActionValidator.get_valid_actions(state, player_num)
        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        # Order actions to improve cutoffs
        ordered_actions = self.order_actions(valid_actions, actor)

        alpha = float("-inf")
        beta = float("inf")
        best_score = float("-inf")
        best_action = ordered_actions[0]
        action_evaluations: List[Dict[str, Any]] = []

        tree_root: Optional[Dict[str, Any]] = None
        if build_tree:
            tree_root = {
                "id": "root",
                "name": f"P{player_num} Root",
                "depth": 0,
                "type": "max",
                "score": None,
                "alpha": float("-inf"),
                "beta": float("inf"),
                "pruned": False,
                "action": "root",
                "children": [],
            }

        for idx, action in enumerate(ordered_actions):
            self.nodes_explored += 1
            sim_state = BattleEngine.simulate_action(state, action)

            child_tree_node: Optional[Dict[str, Any]] = None
            if build_tree and tree_root is not None:
                node_counter[0] += 1
                child_tree_node = {
                    "id": f"node_{node_counter[0]}",
                    "name": str(action),
                    "depth": 1,
                    "type": "min" if sim_state.current_turn_player != player_num else "max",
                    "action": str(action),
                    "score": None,
                    "alpha": round(alpha, 2) if alpha != float("-inf") else "-inf",
                    "beta": round(beta, 2) if beta != float("inf") else "inf",
                    "pruned": False,
                    "children": [],
                }
                tree_root["children"].append(child_tree_node)

            score = self._alphabeta(
                sim_state,
                search_depth - 1,
                alpha,
                beta,
                player_num,
                current_depth=1,
                tree_node=child_tree_node,
                node_counter=node_counter,
            )

            if child_tree_node:
                child_tree_node["score"] = round(score, 2)

            action_evaluations.append({
                "action": str(action),
                "type": action.type.value,
                "ability_id": action.ability_id,
                "score": round(score, 2),
            })

            if score > best_score:
                best_score = score
                best_action = action

            alpha = max(alpha, best_score)
            if beta <= alpha:
                # Prune remaining root actions if any
                remaining = len(ordered_actions) - idx - 1
                self.nodes_pruned += remaining
                break

        if tree_root:
            tree_root["score"] = round(best_score, 2)
            tree_root["alpha"] = round(alpha, 2) if alpha != float("-inf") else "-inf"
            tree_root["beta"] = round(beta, 2) if beta != float("inf") else "inf"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        total_nodes = self.nodes_explored + self.nodes_pruned
        pruning_efficiency = (
            round((self.nodes_pruned / total_nodes) * 100.0, 1) if total_nodes > 0 else 0.0
        )

        stats: Dict[str, Any] = {
            "strategy": "alpha_beta",
            "search_depth": search_depth,
            "max_depth_reached": self.max_depth_reached,
            "nodes_explored": self.nodes_explored,
            "nodes_pruned": self.nodes_pruned,
            "pruning_efficiency_pct": pruning_efficiency,
            "best_score": round(best_score, 2),
            "execution_time_ms": round(elapsed_ms, 2),
            "action_evaluations": action_evaluations,
        }
        if build_tree:
            stats["game_tree"] = tree_root

        return best_action, stats

    def _alphabeta(
        self,
        state: BattleState,
        depth: int,
        alpha: float,
        beta: float,
        ai_player_num: int,
        current_depth: int,
        tree_node: Optional[Dict[str, Any]] = None,
        node_counter: Optional[List[int]] = None,
    ) -> float:
        if current_depth > self.max_depth_reached:
            self.max_depth_reached = current_depth

        if state.status != BattleStatus.ONGOING or depth == 0:
            val = evaluate_heuristic(state, ai_player_num, self.weights)
            if tree_node:
                tree_node["score"] = round(val, 2)
            return val

        current_player = state.current_turn_player
        valid_actions = ActionValidator.get_valid_actions(state, current_player)

        if not valid_actions:
            val = evaluate_heuristic(state, ai_player_num, self.weights)
            if tree_node:
                tree_node["score"] = round(val, 2)
            return val

        actor = state.get_player(current_player)
        ordered_actions = self.order_actions(valid_actions, actor)
        is_max = (current_player == ai_player_num)

        if is_max:
            max_eval = float("-inf")
            for idx, action in enumerate(ordered_actions):
                self.nodes_explored += 1
                sim_state = BattleEngine.simulate_action(state, action)

                child_node = None
                if tree_node is not None and node_counter is not None:
                    node_counter[0] += 1
                    child_node = {
                        "id": f"node_{node_counter[0]}",
                        "name": str(action),
                        "depth": current_depth + 1,
                        "type": "min" if sim_state.current_turn_player != ai_player_num else "max",
                        "action": str(action),
                        "score": None,
                        "alpha": round(alpha, 2) if alpha != float("-inf") else "-inf",
                        "beta": round(beta, 2) if beta != float("inf") else "inf",
                        "pruned": False,
                        "children": [],
                    }
                    tree_node["children"].append(child_node)

                eval_val = self._alphabeta(
                    sim_state,
                    depth - 1,
                    alpha,
                    beta,
                    ai_player_num,
                    current_depth + 1,
                    tree_node=child_node,
                    node_counter=node_counter,
                )
                if child_node:
                    child_node["score"] = round(eval_val, 2)

                if eval_val > max_eval:
                    max_eval = eval_val

                alpha = max(alpha, eval_val)
                if beta <= alpha:
                    # Beta cut-off: prune remaining sibling branches
                    pruned_count = len(ordered_actions) - idx - 1
                    self.nodes_pruned += pruned_count
                    if tree_node and child_node:
                        child_node["pruned"] = True
                    break

            if tree_node:
                tree_node["score"] = round(max_eval, 2)
                tree_node["alpha"] = round(alpha, 2) if alpha != float("-inf") else "-inf"
                tree_node["beta"] = round(beta, 2) if beta != float("inf") else "inf"
            return max_eval

        else:  # MIN node
            min_eval = float("inf")
            for idx, action in enumerate(ordered_actions):
                self.nodes_explored += 1
                sim_state = BattleEngine.simulate_action(state, action)

                child_node = None
                if tree_node is not None and node_counter is not None:
                    node_counter[0] += 1
                    child_node = {
                        "id": f"node_{node_counter[0]}",
                        "name": str(action),
                        "depth": current_depth + 1,
                        "type": "max" if sim_state.current_turn_player == ai_player_num else "min",
                        "action": str(action),
                        "score": None,
                        "alpha": round(alpha, 2) if alpha != float("-inf") else "-inf",
                        "beta": round(beta, 2) if beta != float("inf") else "inf",
                        "pruned": False,
                        "children": [],
                    }
                    tree_node["children"].append(child_node)

                eval_val = self._alphabeta(
                    sim_state,
                    depth - 1,
                    alpha,
                    beta,
                    ai_player_num,
                    current_depth + 1,
                    tree_node=child_node,
                    node_counter=node_counter,
                )
                if child_node:
                    child_node["score"] = round(eval_val, 2)

                if eval_val < min_eval:
                    min_eval = eval_val

                beta = min(beta, eval_val)
                if beta <= alpha:
                    # Alpha cut-off: prune remaining sibling branches
                    pruned_count = len(ordered_actions) - idx - 1
                    self.nodes_pruned += pruned_count
                    if tree_node and child_node:
                        child_node["pruned"] = True
                    break

            if tree_node:
                tree_node["score"] = round(min_eval, 2)
                tree_node["alpha"] = round(alpha, 2) if alpha != float("-inf") else "-inf"
                tree_node["beta"] = round(beta, 2) if beta != float("inf") else "inf"
            return min_eval
