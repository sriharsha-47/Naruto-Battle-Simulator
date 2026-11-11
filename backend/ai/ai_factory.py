from typing import Optional, Union
from backend.ai.alphabeta import AlphaBetaAI
from backend.ai.base import BaseAI
from backend.ai.heuristic import HeuristicAI, HeuristicWeights
from backend.ai.minimax import MinimaxAI
from backend.ai.random_ai import RandomAI
from backend.ai.rule_based import RuleBasedAI
from backend.models.enums import AIStrategy


class AIFactory:
    @staticmethod
    def create_ai(
        strategy: Union[AIStrategy, str],
        max_depth: int = 3,
        weights: Optional[HeuristicWeights] = None,
        name: Optional[str] = None,
    ) -> BaseAI:
        if isinstance(strategy, str):
            try:
                strategy = AIStrategy(strategy.lower())
            except ValueError:
                raise ValueError(
                    f"Unknown AI strategy: '{strategy}'. "
                    f"Valid options are: {[s.value for s in AIStrategy]}"
                )

        if strategy == AIStrategy.RANDOM:
            return RandomAI(name=name or "Random AI")
        elif strategy == AIStrategy.RULE_BASED:
            return RuleBasedAI(name=name or "Rule-Based AI")
        elif strategy == AIStrategy.HEURISTIC:
            return HeuristicAI(name=name or "Heuristic AI", weights=weights)
        elif strategy == AIStrategy.MINIMAX:
            return MinimaxAI(name=name or "Minimax AI", max_depth=max_depth, weights=weights)
        elif strategy == AIStrategy.ALPHA_BETA:
            return AlphaBetaAI(name=name or "Alpha-Beta AI", max_depth=max_depth, weights=weights)
        else:
            raise ValueError(f"Unsupported strategy: {strategy}")
