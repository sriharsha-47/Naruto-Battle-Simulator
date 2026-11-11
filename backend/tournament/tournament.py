import json
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.ai.ai_factory import AIFactory
from backend.analytics.collector import analytics_collector
from backend.data.loader import get_character_by_id
from backend.database.db import Database, db
from backend.database.models import TournamentRecord
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.battle_state import BattleState
from backend.models.enums import AIStrategy, BattleStatus, TournamentStatus


class TournamentParticipant(BaseModel):
    id: str
    name: str
    character_id: str
    character_name: str
    ai_strategy: AIStrategy = AIStrategy.MINIMAX


class TournamentMatch(BaseModel):
    id: str
    round_index: int
    match_index: int
    player1: Optional[TournamentParticipant] = None
    player2: Optional[TournamentParticipant] = None
    winner: Optional[TournamentParticipant] = None
    battle_id: Optional[str] = None
    status: str = "pending"  # pending, completed
    total_turns: int = 0


class Tournament(BaseModel):
    id: str
    name: str
    status: TournamentStatus = TournamentStatus.PENDING
    participants: List[TournamentParticipant] = Field(default_factory=list)
    rounds: List[List[TournamentMatch]] = Field(default_factory=list)
    winner: Optional[TournamentParticipant] = None


class TournamentManager:
    def __init__(self, database: Optional[Database] = None):
        self.db = database or db
        self.active_tournaments: Dict[str, Tournament] = {}

    def create_tournament(
        self,
        name: str,
        participants_data: List[Dict[str, Any]],
        tournament_id: Optional[str] = None,
    ) -> Tournament:
        if len(participants_data) < 2:
            raise ValueError("Tournament requires at least 2 participants")

        t_id = tournament_id or str(uuid.uuid4())
        participants: List[TournamentParticipant] = []

        for p in participants_data:
            char_id = p["character_id"]
            char = get_character_by_id(char_id)
            if not char:
                raise ValueError(f"Invalid character_id: {char_id}")

            strat_str = p.get("ai_strategy", "minimax")
            ai_strat = (
                strat_str
                if isinstance(strat_str, AIStrategy)
                else AIStrategy(strat_str.lower())
            )

            p_id = p.get("id") or str(uuid.uuid4())[:8]
            display_name = p.get("name") or f"{char.name} ({ai_strat.value})"

            participants.append(
                TournamentParticipant(
                    id=p_id,
                    name=display_name,
                    character_id=char.id,
                    character_name=char.name,
                    ai_strategy=ai_strat,
                )
            )

        # Pad to nearest power of 2 if needed
        # (e.g. 2, 4, 8, 16)
        num_participants = len(participants)
        next_pow2 = 1
        while next_pow2 < num_participants:
            next_pow2 *= 2

        # Build bracket rounds
        rounds: List[List[TournamentMatch]] = []
        curr_round_matches: List[TournamentMatch] = []
        match_count = next_pow2 // 2

        for m_idx in range(match_count):
            p1 = participants[m_idx * 2] if m_idx * 2 < num_participants else None
            p2 = participants[m_idx * 2 + 1] if m_idx * 2 + 1 < num_participants else None
            match = TournamentMatch(
                id=str(uuid.uuid4()),
                round_index=0,
                match_index=m_idx,
                player1=p1,
                player2=p2,
                status="pending",
            )
            curr_round_matches.append(match)
        rounds.append(curr_round_matches)

        # Future rounds
        rem_matches = match_count // 2
        r_idx = 1
        while rem_matches >= 1:
            r_matches = []
            for m_idx in range(rem_matches):
                r_matches.append(
                    TournamentMatch(
                        id=str(uuid.uuid4()),
                        round_index=r_idx,
                        match_index=m_idx,
                        player1=None,
                        player2=None,
                        status="pending",
                    )
                )
            rounds.append(r_matches)
            rem_matches //= 2
            r_idx += 1

        tournament = Tournament(
            id=t_id,
            name=name,
            status=TournamentStatus.PENDING,
            participants=participants,
            rounds=rounds,
            winner=None,
        )

        self.active_tournaments[t_id] = tournament
        self._save_to_db(tournament)
        return tournament

    def run_entire_tournament(self, tournament_id: str) -> Tournament:
        tourn = self.get_tournament(tournament_id)
        if not tourn:
            raise ValueError(f"Tournament not found: {tournament_id}")

        tourn.status = TournamentStatus.IN_PROGRESS

        for r_idx, round_matches in enumerate(tourn.rounds):
            for match in round_matches:
                if match.status == "completed":
                    continue

                if match.player1 is None and match.player2 is None:
                    continue
                elif match.player1 is not None and match.player2 is None:
                    # Bye
                    match.winner = match.player1
                    match.status = "completed"
                elif match.player2 is not None and match.player1 is None:
                    # Bye
                    match.winner = match.player2
                    match.status = "completed"
                else:
                    # Play match
                    winner_part, b_id, turns = self._simulate_match(
                        match.player1, match.player2
                    )
                    match.winner = winner_part
                    match.battle_id = b_id
                    match.total_turns = turns
                    match.status = "completed"

                # Advance winner to next round
                if r_idx + 1 < len(tourn.rounds):
                    next_match_idx = match.match_index // 2
                    is_player1_slot = (match.match_index % 2 == 0)
                    next_match = tourn.rounds[r_idx + 1][next_match_idx]
                    if is_player1_slot:
                        next_match.player1 = match.winner
                    else:
                        next_match.player2 = match.winner

        # Set champion
        final_match = tourn.rounds[-1][0]
        tourn.winner = final_match.winner
        tourn.status = TournamentStatus.COMPLETED

        self.active_tournaments[tourn.id] = tourn
        self._save_to_db(tourn)
        return tourn

    def _simulate_match(
        self, p1: TournamentParticipant, p2: TournamentParticipant
    ) -> tuple[TournamentParticipant, str, int]:
        c1 = get_character_by_id(p1.character_id)
        c2 = get_character_by_id(p2.character_id)
        if not c1 or not c2:
            raise ValueError("Invalid character for tournament match")

        state = BattleEngine.create_battle(
            c1, c2, ai1_type=p1.ai_strategy, ai2_type=p2.ai_strategy
        )
        ai1 = AIFactory.create_ai(p1.ai_strategy)
        ai2 = AIFactory.create_ai(p2.ai_strategy)

        while state.status == BattleStatus.ONGOING:
            current_actor_num = state.current_turn_player
            ai = ai1 if current_actor_num == 1 else ai2
            strat_name = p1.ai_strategy.value if current_actor_num == 1 else p2.ai_strategy.value

            action, stats = ai.select_action(state, current_actor_num)
            analytics_collector.record_ai_step(
                state.battle_id,
                state.turn_count,
                current_actor_num,
                strat_name,
                action,
                stats,
            )
            BattleEngine.execute_action(state, action, deterministic=False)

        analytics_collector.record_battle_completion(state)

        winner = p1 if state.winner_player == 1 else p2
        return winner, state.battle_id, state.turn_count

    def get_tournament(self, tournament_id: str) -> Optional[Tournament]:
        if tournament_id in self.active_tournaments:
            return self.active_tournaments[tournament_id]

        record = self.db.get_tournament(tournament_id)
        if not record:
            return None

        rounds_raw = json.loads(record.rounds_json)
        rounds = [
            [TournamentMatch.model_validate(m) for m in r] for r in rounds_raw
        ]

        winner = None
        if record.winner_id:
            winner = TournamentParticipant(
                id=record.winner_id,
                name=record.winner_name or "",
                character_id="",
                character_name="",
            )

        tourn = Tournament(
            id=record.id,
            name=record.name,
            status=TournamentStatus(record.status),
            participants=[],
            rounds=rounds,
            winner=winner,
        )
        self.active_tournaments[tourn.id] = tourn
        return tourn

    def _save_to_db(self, tourn: Tournament) -> None:
        rounds_data = [
            [m.model_dump() for m in r] for r in tourn.rounds
        ]
        rec = TournamentRecord(
            id=tourn.id,
            name=tourn.name,
            status=tourn.status.value,
            winner_id=tourn.winner.id if tourn.winner else None,
            winner_name=tourn.winner.name if tourn.winner else None,
            rounds_json=json.dumps(rounds_data),
        )
        self.db.save_tournament(rec)


tournament_manager = TournamentManager()
