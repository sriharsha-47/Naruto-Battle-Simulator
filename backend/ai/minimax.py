import time
from typing import Any, Dict, List, Optional, Tuple
from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import BattleStatus


class MinimaxAI(BaseAI):
    """
    Genuine adversarial Minimax search.
    Explores full game-tree up to specified depth:
    - MAX nodes: AI player's turns (maximizing heuristic)
    - MIN nodes: Opponent's turns (minimizing heuristic)
    """

    def __init__(
        self,
        name: str = "Minimax AI",
        max_depth: int = 3,
        weights: Optional[HeuristicWeights] = None,
    ):
        super().__init__(name=name)
        self.max_depth = max_depth
        self.weights = weights or HeuristicWeights()
        self.nodes_explored = 0
        self.max_depth_reached = 0

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        return self.search(state, player_num, depth=self.max_depth, build_tree=False)

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
        self.max_depth_reached = 0
        node_counter = [0]

        valid_actions = ActionValidator.get_valid_actions(state, player_num)
        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        best_score = float("-inf")
        best_action = valid_actions[0]
        action_evaluations: List[Dict[str, Any]] = []

        tree_root: Optional[Dict[str, Any]] = None
        if build_tree:
            tree_root = {
                "id": "root",
                "name": f"P{player_num} Root",
                "depth": 0,
                "type": "max",
                "score": None,
                "action": "root",
                "children": [],
            }

        # Root is a MAX node
        for action in valid_actions:
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
                    "children": [],
                }
                tree_root["children"].append(child_tree_node)

            score = self._minimax(
                sim_state,
                search_depth - 1,
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

        if tree_root:
            tree_root["score"] = round(best_score, 2)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        stats: Dict[str, Any] = {
            "strategy": "minimax",
            "search_depth": search_depth,
            "max_depth_reached": self.max_depth_reached,
            "nodes_explored": self.nodes_explored,
            "best_score": round(best_score, 2),
            "execution_time_ms": round(elapsed_ms, 2),
            "action_evaluations": action_evaluations,
        }
        if build_tree:
            stats["game_tree"] = tree_root

        return best_action, stats

    def _minimax(
        self,
        state: BattleState,
        depth: int,
        ai_player_num: int,
        current_depth: int,
        tree_node: Optional[Dict[str, Any]] = None,
        node_counter: Optional[List[int]] = None,
    ) -> float:
        if current_depth > self.max_depth_reached:
            self.max_depth_reached = current_depth

        # Terminal conditions: battle finished or depth limit reached
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

        is_max = (current_player == ai_player_num)

        if is_max:
            max_eval = float("-inf")
            for action in valid_actions:
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
                        "children": [],
                    }
                    tree_node["children"].append(child_node)

                eval_val = self._minimax(
                    sim_state,
                    depth - 1,
                    ai_player_num,
                    current_depth + 1,
                    tree_node=child_node,
                    node_counter=node_counter,
                )
                if child_node:
                    child_node["score"] = round(eval_val, 2)

                if eval_val > max_eval:
                    max_eval = eval_val

            if tree_node:
                tree_node["score"] = round(max_eval, 2)
            return max_eval

        else:  # MIN node
            min_eval = float("inf")
            for action in valid_actions:
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
                        "children": [],
                    }
                    tree_node["children"].append(child_node)

                eval_val = self._minimax(
                    sim_state,
                    depth - 1,
                    ai_player_num,
                    current_depth + 1,
                    tree_node=child_node,
                    node_counter=node_counter,
                )
                if child_node:
                    child_node["score"] = round(eval_val, 2)

                if eval_val < min_eval:
                    min_eval = eval_val

            if tree_node:
                tree_node["score"] = round(min_eval, 2)
            return min_eval
