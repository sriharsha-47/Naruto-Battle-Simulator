import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.database.models import AIMetricRecord, BattleRecord, TournamentRecord

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "naruto_battles.db"


class Database:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DEFAULT_DB_PATH
        self.init_db()

    def get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self.get_connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS battles (
                    id TEXT PRIMARY KEY,
                    player1_id TEXT NOT NULL,
                    player1_name TEXT NOT NULL,
                    player2_id TEXT NOT NULL,
                    player2_name TEXT NOT NULL,
                    ai1_type TEXT,
                    ai2_type TEXT,
                    winner TEXT,
                    winner_player INTEGER,
                    total_turns INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    log_json TEXT NOT NULL
                )
                """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    battle_id TEXT NOT NULL,
                    turn INTEGER NOT NULL,
                    player_num INTEGER NOT NULL,
                    ai_strategy TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    ability_id TEXT,
                    score REAL,
                    nodes_explored INTEGER NOT NULL,
                    nodes_pruned INTEGER NOT NULL,
                    execution_time_ms REAL NOT NULL,
                    depth INTEGER,
                    created_at TEXT NOT NULL
                )
                """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tournaments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    winner_id TEXT,
                    winner_name TEXT,
                    rounds_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def save_battle(self, record: BattleRecord) -> None:
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO battles (
                    id, player1_id, player1_name, player2_id, player2_name,
                    ai1_type, ai2_type, winner, winner_player, total_turns,
                    status, created_at, log_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.player1_id,
                    record.player1_name,
                    record.player2_id,
                    record.player2_name,
                    record.ai1_type,
                    record.ai2_type,
                    record.winner,
                    record.winner_player,
                    record.total_turns,
                    record.status,
                    record.created_at,
                    record.log_json,
                ),
            )
            conn.commit()

    def get_battle(self, battle_id: str) -> Optional[BattleRecord]:
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM battles WHERE id = ?", (battle_id,)
            ).fetchone()
            if row:
                return BattleRecord(**dict(row))
            return None

    def list_battles(self, limit: int = 50, offset: int = 0) -> List[BattleRecord]:
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM battles ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
            return [BattleRecord(**dict(row)) for row in rows]

    def save_ai_metric(self, record: AIMetricRecord) -> None:
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO ai_metrics (
                    battle_id, turn, player_num, ai_strategy, action_type,
                    ability_id, score, nodes_explored, nodes_pruned,
                    execution_time_ms, depth, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.battle_id,
                    record.turn,
                    record.player_num,
                    record.ai_strategy,
                    record.action_type,
                    record.ability_id,
                    record.score,
                    record.nodes_explored,
                    record.nodes_pruned,
                    record.execution_time_ms,
                    record.depth,
                    record.created_at,
                ),
            )
            conn.commit()

    def get_ai_metrics(
        self, battle_id: Optional[str] = None, limit: int = 1000
    ) -> List[AIMetricRecord]:
        with self.get_connection() as conn:
            if battle_id:
                rows = conn.execute(
                    "SELECT * FROM ai_metrics WHERE battle_id = ? ORDER BY id ASC LIMIT ?",
                    (battle_id, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM ai_metrics ORDER BY id DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            return [AIMetricRecord(**dict(row)) for row in rows]

    def save_tournament(self, record: TournamentRecord) -> None:
        with self.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO tournaments (
                    id, name, status, winner_id, winner_name, rounds_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record.id,
                    record.name,
                    record.status,
                    record.winner_id,
                    record.winner_name,
                    record.rounds_json,
                    record.created_at,
                ),
            )
            conn.commit()

    def get_tournament(self, tournament_id: str) -> Optional[TournamentRecord]:
        with self.get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM tournaments WHERE id = ?", (tournament_id,)
            ).fetchone()
            if row:
                return TournamentRecord(**dict(row))
            return None

    def list_tournaments(self, limit: int = 20) -> List[TournamentRecord]:
        with self.get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM tournaments ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [TournamentRecord(**dict(row)) for row in rows]

    def clear_all_data(self) -> None:
        with self.get_connection() as conn:
            conn.execute("DELETE FROM battles")
            conn.execute("DELETE FROM ai_metrics")
            conn.execute("DELETE FROM tournaments")
            conn.commit()


# Singleton database instance
db = Database()
