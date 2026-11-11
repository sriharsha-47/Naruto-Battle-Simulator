from collections import defaultdict
from typing import Any, Dict, List, Optional
from backend.database.db import Database, db


class StatsService:
    def __init__(self, database: Optional[Database] = None):
        self.db = database or db

    def get_summary(self) -> Dict[str, Any]:
        battles = self.db.list_battles(limit=10000, offset=0)
        total_battles = len(battles)

        if total_battles == 0:
            return {
                "total_battles": 0,
                "total_turns": 0,
                "avg_turns_per_battle": 0.0,
                "character_win_rates": {},
                "ai_win_rates": {},
                "ai_search_metrics": {},
                "recent_battles_count": 0,
            }

        total_turns = sum(b.total_turns for b in battles)
        avg_turns = round(total_turns / max(1, total_battles), 2)

        # Character win rates & picks
        char_stats = defaultdict(lambda: {"battles": 0, "wins": 0})
        for b in battles:
            char_stats[b.player1_name]["battles"] += 1
            char_stats[b.player2_name]["battles"] += 1

            if b.winner_player == 1:
                char_stats[b.player1_name]["wins"] += 1
            elif b.winner_player == 2:
                char_stats[b.player2_name]["wins"] += 1

        character_win_rates = {}
        for name, data in char_stats.items():
            rate = round((data["wins"] / max(1, data["battles"])) * 100.0, 1)
            character_win_rates[name] = {
                "battles": data["battles"],
                "wins": data["wins"],
                "win_rate_pct": rate,
            }

        # AI strategy win rates
        ai_stats = defaultdict(lambda: {"battles": 0, "wins": 0, "draws": 0})
        for b in battles:
            if b.ai1_type:
                ai_stats[b.ai1_type]["battles"] += 1
                if b.winner_player == 1:
                    ai_stats[b.ai1_type]["wins"] += 1
                elif b.winner_player is None and b.status == "draw":
                    ai_stats[b.ai1_type]["draws"] += 1

            if b.ai2_type:
                ai_stats[b.ai2_type]["battles"] += 1
                if b.winner_player == 2:
                    ai_stats[b.ai2_type]["wins"] += 1
                elif b.winner_player is None and b.status == "draw":
                    ai_stats[b.ai2_type]["draws"] += 1

        ai_win_rates = {}
        for strat, data in ai_stats.items():
            rate = round((data["wins"] / max(1, data["battles"])) * 100.0, 1)
            ai_win_rates[strat] = {
                "battles": data["battles"],
                "wins": data["wins"],
                "draws": data["draws"],
                "win_rate_pct": rate,
            }

        # AI search metrics aggregation
        metrics = self.db.get_ai_metrics(limit=5000)
        ai_metrics_by_strat = defaultdict(lambda: {
            "count": 0,
            "total_nodes_explored": 0,
            "total_nodes_pruned": 0,
            "total_time_ms": 0.0,
        })

        for m in metrics:
            st = ai_metrics_by_strat[m.ai_strategy]
            st["count"] += 1
            st["total_nodes_explored"] += m.nodes_explored
            st["total_nodes_pruned"] += m.nodes_pruned
            st["total_time_ms"] += m.execution_time_ms

        ai_search_metrics = {}
        for strat, data in ai_metrics_by_strat.items():
            count = max(1, data["count"])
            avg_explored = round(data["total_nodes_explored"] / count, 1)
            avg_pruned = round(data["total_nodes_pruned"] / count, 1)
            avg_time = round(data["total_time_ms"] / count, 2)
            tot_exp_prun = data["total_nodes_explored"] + data["total_nodes_pruned"]
            eff = (
                round((data["total_nodes_pruned"] / tot_exp_prun) * 100.0, 1)
                if tot_exp_prun > 0
                else 0.0
            )

            ai_search_metrics[strat] = {
                "total_decisions": count,
                "avg_nodes_explored": avg_explored,
                "avg_nodes_pruned": avg_pruned,
                "pruning_efficiency_pct": eff,
                "avg_execution_time_ms": avg_time,
            }

        return {
            "total_battles": total_battles,
            "total_turns": total_turns,
            "avg_turns_per_battle": avg_turns,
            "character_win_rates": character_win_rates,
            "ai_win_rates": ai_win_rates,
            "ai_search_metrics": ai_search_metrics,
            "recent_battles_count": min(total_battles, 50),
        }

    def get_ai_comparison(self) -> Dict[str, Any]:
        battles = self.db.list_battles(limit=10000, offset=0)
        ai_battles = [
            b for b in battles
            if b.ai1_type and b.ai2_type and b.ai1_type != "human" and b.ai2_type != "human"
        ]

        # Head to head matrix
        matrix: Dict[str, Dict[str, Dict[str, int]]] = defaultdict(
            lambda: defaultdict(lambda: {"wins": 0, "losses": 0, "draws": 0, "total": 0})
        )

        for b in ai_battles:
            strat1 = b.ai1_type
            strat2 = b.ai2_type

            matrix[strat1][strat2]["total"] += 1
            matrix[strat2][strat1]["total"] += 1

            if b.winner_player == 1:
                matrix[strat1][strat2]["wins"] += 1
                matrix[strat2][strat1]["losses"] += 1
            elif b.winner_player == 2:
                matrix[strat1][strat2]["losses"] += 1
                matrix[strat2][strat1]["wins"] += 1
            else:
                matrix[strat1][strat2]["draws"] += 1
                matrix[strat2][strat1]["draws"] += 1

        # Search efficiency comparison: Minimax vs Alpha-Beta
        metrics = self.db.get_ai_metrics(limit=5000)
        minimax_metrics = [m for m in metrics if m.ai_strategy == "minimax"]
        alphabeta_metrics = [m for m in metrics if m.ai_strategy == "alpha_beta"]

        def calc_avg(records, key):
            if not records:
                return 0.0
            return round(sum(getattr(r, key) for r in records) / len(records), 2)

        search_comparison = {
            "minimax": {
                "sample_size": len(minimax_metrics),
                "avg_nodes_explored": calc_avg(minimax_metrics, "nodes_explored"),
                "avg_execution_time_ms": calc_avg(minimax_metrics, "execution_time_ms"),
            },
            "alpha_beta": {
                "sample_size": len(alphabeta_metrics),
                "avg_nodes_explored": calc_avg(alphabeta_metrics, "nodes_explored"),
                "avg_nodes_pruned": calc_avg(alphabeta_metrics, "nodes_pruned"),
                "avg_execution_time_ms": calc_avg(alphabeta_metrics, "execution_time_ms"),
            },
        }

        # Calculate pruning ratio if data available
        if (
            search_comparison["minimax"]["avg_nodes_explored"] > 0
            and search_comparison["alpha_beta"]["avg_nodes_explored"] > 0
        ):
            speedup = round(
                search_comparison["minimax"]["avg_nodes_explored"]
                / max(0.1, search_comparison["alpha_beta"]["avg_nodes_explored"]),
                2,
            )
            search_comparison["nodes_explored_reduction_ratio"] = speedup
        else:
            search_comparison["nodes_explored_reduction_ratio"] = None

        return {
            "head_to_head": matrix,
            "search_comparison": search_comparison,
            "total_ai_matches": len(ai_battles),
        }


stats_service = StatsService()
