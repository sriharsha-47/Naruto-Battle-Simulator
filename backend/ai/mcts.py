import math
import random
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.ai.search_utils import biased_random_action, snapshot, squash, terminal_reward
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import BattleStatus


class _Node:
    __slots__ = ("visits", "total", "children")

    def __init__(self) -> None:
        self.visits = 0
        self.total = 0.0  # sum of rewards from the AI player's point of view (0..1)
        self.children: Dict[BattleAction, "_Node"] = {}


class MCTSAI(BaseAI):
    """
    Monte Carlo Tree Search (UCT), open-loop variant.

    Each iteration: Selection (UCB1) -> Expansion (one new action) ->
    Simulation (biased random playout, depth-limited) -> Backpropagation.
    Open-loop means every iteration replays the chosen actions from the real root
    state with the engine's real randomness, so damage variance is sampled rather
    than frozen into the tree. The most-visited root action is played.
    """

    def __init__(
        self,
        name: str = "MCTS AI",
        iterations: int = 150,
        time_limit_ms: float = 700.0,
        exploration: float = 1.2,
        rollout_depth: int = 8,
        weights: Optional[HeuristicWeights] = None,
    ):
        super().__init__(name=name)
        self.iterations = iterations
        self.time_limit_ms = time_limit_ms
        self.exploration = exploration
        self.rollout_depth = rollout_depth
        self.weights = weights or HeuristicWeights()

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start = time.perf_counter()
        root_actions = ActionValidator.get_valid_actions(state, player_num)
        if not root_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        root_state = snapshot(state)
        root = _Node()
        node_count = 1
        max_depth = 0
        done = 0

        for done in range(1, self.iterations + 1):
            if (time.perf_counter() - start) * 1000.0 > self.time_limit_ms:
                done -= 1
                break

            sim = root_state.clone()
            node = root
            path = [node]
            depth = 0

            # --- Selection + Expansion
            while sim.status == BattleStatus.ONGOING:
                mover = sim.current_turn_player
                actions = ActionValidator.get_valid_actions(sim, mover)
                if not actions:
                    break

                untried = [a for a in actions if a not in node.children]
                if untried:
                    action = random.choice(untried)
                    child = _Node()
                    node.children[action] = child
                    node_count += 1
                    BattleEngine.execute_action(sim, action, deterministic=False)
                    node = child
                    path.append(node)
                    depth += 1
                    break

                maximise = mover == player_num
                log_n = math.log(max(1, node.visits))
                best_action = actions[0]
                best_ucb = float("-inf")
                for a in actions:
                    ch = node.children.get(a)
                    if ch is None:  # legality differs between random samples
                        continue
                    q = ch.total / max(1, ch.visits)
                    exploit = q if maximise else 1.0 - q
                    ucb = exploit + self.exploration * math.sqrt(log_n / max(1, ch.visits))
                    if ucb > best_ucb:
                        best_ucb = ucb
                        best_action = a
                if best_action not in node.children:
                    break
                BattleEngine.execute_action(sim, best_action, deterministic=False)
                node = node.children[best_action]
                path.append(node)
                depth += 1
            max_depth = max(max_depth, depth)

            # --- Simulation (rollout)
            steps = 0
            while sim.status == BattleStatus.ONGOING and steps < self.rollout_depth:
                mover = sim.current_turn_player
                actions = ActionValidator.get_valid_actions(sim, mover)
                if not actions:
                    break
                BattleEngine.execute_action(
                    sim, biased_random_action(sim, mover, actions), deterministic=False
                )
                steps += 1

            reward = terminal_reward(sim, player_num)
            if reward is None:
                reward = squash(evaluate_heuristic(sim, player_num, self.weights))

            # --- Backpropagation
            for n in path:
                n.visits += 1
                n.total += reward

        best_action = root_actions[0]
        best_visits = -1
        evaluations: List[Dict[str, Any]] = []
        for a in root_actions:
            ch = root.children.get(a)
            visits = ch.visits if ch else 0
            win_rate = (ch.total / ch.visits) if ch and ch.visits else 0.5
            evaluations.append({
                "action": str(a),
                "type": a.type.value,
                "ability_id": a.ability_id,
                "score": round((win_rate - 0.5) * 200.0, 2),
                "visits": visits,
                "win_rate_pct": round(win_rate * 100.0, 1),
            })
            if visits > best_visits:
                best_visits = visits
                best_action = a

        best_eval = next(e for e in evaluations if e["action"] == str(best_action))
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        stats: Dict[str, Any] = {
            "strategy": "mcts",
            "search_depth": max_depth,
            "simulations": done,
            "nodes_explored": node_count,
            "best_score": best_eval["score"],
            "execution_time_ms": round(elapsed_ms, 2),
            "action_evaluations": evaluations,
        }
        return best_action, stats
