import random
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicWeights, evaluate_heuristic
from backend.ai.search_utils import greedy_action, snapshot
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import BattleStatus


class EvolutionaryAI(BaseAI):
    """
    Rolling Horizon Evolutionary Algorithm (RHEA).

    A genome is a plan of `horizon` future moves (genes are floats in [0, 1) that are
    mapped onto the legal moves available at that step, so every plan is always valid).
    Fitness = mean heuristic value after simulating the plan against a greedy
    opponent model. The population evolves through elitism, tournament selection,
    uniform crossover and mutation. Only the first move of the champion plan is
    played; the whole search is repeated on the next turn (rolling horizon).
    """

    def __init__(
        self,
        name: str = "Evolutionary AI",
        horizon: int = 3,
        population: int = 10,
        generations: int = 8,
        samples: int = 2,
        weights: Optional[HeuristicWeights] = None,
    ):
        super().__init__(name=name)
        self.horizon = horizon
        self.population = population
        self.generations = generations
        self.samples = samples
        self.weights = weights or HeuristicWeights()

    # -- plan simulation ---------------------------------------------------
    def _play_opponent_turns(self, sim: BattleState, player_num: int) -> None:
        guard = 0
        while sim.status == BattleStatus.ONGOING and sim.current_turn_player != player_num and guard < 4:
            opp = sim.current_turn_player
            actions = ActionValidator.get_valid_actions(sim, opp)
            if not actions:
                break
            BattleEngine.execute_action(sim, greedy_action(sim, opp, actions), deterministic=False)
            guard += 1

    def _simulate(
        self, root: BattleState, genome: List[float], player_num: int
    ) -> Tuple[float, Optional[BattleAction]]:
        total = 0.0
        first: Optional[BattleAction] = None
        for _ in range(self.samples):
            sim = root.clone()
            for step, gene in enumerate(genome):
                self._play_opponent_turns(sim, player_num)
                if sim.status != BattleStatus.ONGOING:
                    break
                actions = ActionValidator.get_valid_actions(sim, player_num)
                if not actions:
                    break
                action = actions[min(len(actions) - 1, int(gene * len(actions)))]
                if step == 0:
                    first = action
                BattleEngine.execute_action(sim, action, deterministic=False)
                self._play_opponent_turns(sim, player_num)
            total += evaluate_heuristic(sim, player_num, self.weights)
        return total / self.samples, first

    # -- main entry --------------------------------------------------------
    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start = time.perf_counter()
        root_actions = ActionValidator.get_valid_actions(state, player_num)
        if not root_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        root = snapshot(state)
        evaluations_run = 0
        best_per_first: Dict[BattleAction, float] = {}

        def evaluate(genome: List[float]) -> Tuple[List[float], float]:
            nonlocal evaluations_run
            fitness, first = self._simulate(root, genome, player_num)
            evaluations_run += self.samples
            if first is not None and (first not in best_per_first or fitness > best_per_first[first]):
                best_per_first[first] = fitness
            return genome, fitness

        def random_genome() -> List[float]:
            return [random.random() for _ in range(self.horizon)]

        # Seed: one plan per legal first move so every option gets considered
        pop: List[Tuple[List[float], float]] = []
        for i in range(len(root_actions)):
            g = random_genome()
            g[0] = (i + 0.5) / len(root_actions)
            pop.append(evaluate(g))
        while len(pop) < self.population:
            pop.append(evaluate(random_genome()))

        def tournament() -> List[float]:
            a, b = random.choice(pop), random.choice(pop)
            return (a if a[1] >= b[1] else b)[0]

        for _ in range(self.generations):
            pop.sort(key=lambda ind: ind[1], reverse=True)
            nxt = pop[:2]  # elitism
            while len(nxt) < max(self.population, 2):
                p1, p2 = tournament(), tournament()
                child = [g1 if random.random() < 0.5 else g2 for g1, g2 in zip(p1, p2)]
                for i in range(len(child)):
                    if random.random() < 1.0 / self.horizon:
                        child[i] = random.random()
                nxt.append(evaluate(child))
            pop = nxt

        pop.sort(key=lambda ind: ind[1], reverse=True)
        champion = pop[0][0]
        best_action = root_actions[min(len(root_actions) - 1, int(champion[0] * len(root_actions)))]

        evaluations: List[Dict[str, Any]] = []
        for a in root_actions:
            score = best_per_first.get(a)
            evaluations.append({
                "action": str(a),
                "type": a.type.value,
                "ability_id": a.ability_id,
                "score": round(score, 2) if score is not None else None,
            })

        elapsed_ms = (time.perf_counter() - start) * 1000.0
        stats: Dict[str, Any] = {
            "strategy": "evolutionary",
            "search_depth": self.horizon * 2,
            "horizon": self.horizon,
            "population": self.population,
            "generations": self.generations,
            "nodes_explored": evaluations_run,
            "best_score": round(pop[0][1], 2),
            "execution_time_ms": round(elapsed_ms, 2),
            "action_evaluations": evaluations,
        }
        return best_action, stats
