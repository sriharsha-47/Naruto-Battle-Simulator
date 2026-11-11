import random
import uuid
from typing import Optional, Tuple
from backend.engine.action_validator import ActionValidator
from backend.engine.damage_calculator import DamageCalculator
from backend.models.ability import Ability, StatusEffect
from backend.models.battle_state import BattleAction, BattleLogEntry, BattleState
from backend.models.character import Character
from backend.models.enums import (
    ActionType,
    AIStrategy,
    BattleStatus,
    EffectType,
    StatusEffectType,
    TargetType,
)


class BattleEngine:
    @classmethod
    def create_battle(
        cls,
        player1: Character,
        player2: Character,
        ai1_type: Optional[AIStrategy] = None,
        ai2_type: Optional[AIStrategy] = None,
        battle_id: Optional[str] = None,
        max_turns: int = 100,
    ) -> BattleState:
        p1 = player1.model_copy(deep=True)
        p2 = player2.model_copy(deep=True)
        p1.reset_for_battle()
        p2.reset_for_battle()

        b_id = battle_id or str(uuid.uuid4())

        # Speed determines who goes first; p1 wins ties
        first_player = 1 if p1.speed >= p2.speed else 2

        state = BattleState(
            battle_id=b_id,
            player1=p1,
            player2=p2,
            current_turn_player=first_player,
            turn_count=1,
            status=BattleStatus.ONGOING,
            max_turns=max_turns,
            ai1_type=ai1_type,
            ai2_type=ai2_type,
        )

        state.log.append(
            BattleLogEntry(
                turn=0,
                actor_name="System",
                actor_player=0,
                action_type=ActionType.BASIC_ATTACK,
                message=f"Battle initiated! {p1.name} (SPD: {p1.speed}) vs {p2.name} (SPD: {p2.speed}). "
                f"Player {first_player} ({(p1 if first_player == 1 else p2).name}) moves first.",
                p1_hp_after=p1.hp,
                p1_chakra_after=p1.chakra,
                p2_hp_after=p2.hp,
                p2_chakra_after=p2.chakra,
            )
        )
        return state

    @classmethod
    def simulate_action(
        cls, state: BattleState, action: BattleAction
    ) -> BattleState:
        """
        Pure simulation: does not mutate state.
        Uses deterministic damage for AI tree search.
        """
        cloned_state = state.clone()
        return cls.execute_action(cloned_state, action, deterministic=True)

    @classmethod
    def execute_action(
        cls, state: BattleState, action: BattleAction, deterministic: bool = False
    ) -> BattleState:
        """
        Executes a validated action on the state.
        Mutates and returns the battle state.
        """
        if state.status != BattleStatus.ONGOING:
            return state

        actor_num = state.current_turn_player
        defender_num = 2 if actor_num == 1 else 1
        actor = state.get_player(actor_num)
        defender = state.get_player(defender_num)

        # Validate action
        is_valid, err = ActionValidator.validate_action(state, action, actor_num)
        if not is_valid:
            raise ValueError(f"Invalid action for Player {actor_num}: {err}")

        # Execute according to action type
        damage_dealt = 0
        healing_done = 0
        chakra_change = 0
        status_applied_desc: Optional[str] = None
        log_message = ""

        if action.type == ActionType.BASIC_ATTACK:
            raw_damage = DamageCalculator.calculate_raw_damage(
                base_damage=DamageCalculator.BASE_BASIC_ATTACK_DAMAGE,
                attacker_attack=actor.effective_attack,
                defender_defense=defender.effective_defense,
                is_defending=defender.is_defending,
                deterministic=deterministic,
            )
            hp_dmg, shield_abs = DamageCalculator.apply_damage_with_shields(defender, raw_damage)
            damage_dealt = hp_dmg
            log_message = f"{actor.name} uses Basic Attack on {defender.name} dealing {hp_dmg} damage"
            if shield_abs > 0:
                log_message += f" ({shield_abs} absorbed by shield)"
            log_message += "."

        elif action.type == ActionType.DEFEND:
            actor.is_defending = True
            log_message = f"{actor.name} adopts a Defensive Stance! Incoming damage reduced by 50% on next attack."

        elif action.type == ActionType.RECOVER_CHAKRA:
            if deterministic:
                recovered = DamageCalculator.RECOVER_CHAKRA_AMOUNT
            else:
                recovered = random.randint(15, 25)

            old_chakra = actor.chakra
            actor.chakra = min(actor.max_chakra, actor.chakra + recovered)
            actual_recovered = actor.chakra - old_chakra
            chakra_change = actual_recovered
            log_message = f"{actor.name} focuses their chakra and recovers {actual_recovered} Chakra."

        elif action.type == ActionType.ABILITY:
            ability = actor.get_ability(action.ability_id)
            if not ability:
                raise ValueError(f"Ability not found: {action.ability_id}")

            # Deduct chakra and set cooldown
            actor.chakra = max(0, actor.chakra - ability.chakra_cost)
            chakra_change = -ability.chakra_cost
            actor.cooldowns[ability.id] = ability.cooldown_turns

            # Self damage (e.g., Eight Gates)
            if ability.self_damage > 0:
                actor.hp = max(0, actor.hp - ability.self_damage)

            # Heal
            if ability.heal > 0:
                target_heal = actor if ability.target_type == TargetType.SELF else defender
                old_hp = target_heal.hp
                target_heal.hp = min(target_heal.max_hp, target_heal.hp + ability.heal)
                healing_done = target_heal.hp - old_hp

            # Damage
            if ability.damage > 0:
                raw_damage = DamageCalculator.calculate_raw_damage(
                    base_damage=ability.damage,
                    attacker_attack=actor.effective_attack,
                    defender_defense=defender.effective_defense,
                    is_defending=defender.is_defending,
                    deterministic=deterministic,
                )
                hp_dmg, shield_abs = DamageCalculator.apply_damage_with_shields(defender, raw_damage)
                damage_dealt = hp_dmg

            # Chakra drain
            if ability.chakra_drain > 0:
                drained = min(defender.chakra, ability.chakra_drain)
                defender.chakra = max(0, defender.chakra - drained)

            # Status effect application
            if ability.status_effect:
                target_status = actor if ability.target_type == TargetType.SELF else defender
                cls._apply_status_effect(target_status, ability.status_effect)
                status_applied_desc = (
                    f"{ability.status_effect.name} ({ability.status_effect.duration} turns)"
                )

            # Craft log message
            log_parts = [f"{actor.name} unleashes {ability.name}!"]
            if damage_dealt > 0:
                log_parts.append(f"Dealt {damage_dealt} damage to {defender.name}.")
            if healing_done > 0:
                log_parts.append(f"Healed for {healing_done} HP.")
            if ability.chakra_drain > 0:
                log_parts.append(f"Drained {ability.chakra_drain} chakra from {defender.name}.")
            if ability.self_damage > 0:
                log_parts.append(f"Suffered {ability.self_damage} recoil self-damage.")
            if status_applied_desc:
                log_parts.append(f"Applied {status_applied_desc}.")
            log_message = " ".join(log_parts)

        # Append action log
        state.log.append(
            BattleLogEntry(
                turn=state.turn_count,
                actor_name=actor.name,
                actor_player=actor_num,
                action_type=action.type,
                ability_name=action.ability_id,
                damage_dealt=damage_dealt,
                healing_done=healing_done,
                chakra_change=chakra_change,
                status_applied=status_applied_desc,
                message=log_message,
                p1_hp_after=state.player1.hp,
                p1_chakra_after=state.player1.chakra,
                p2_hp_after=state.player2.hp,
                p2_chakra_after=state.player2.chakra,
            )
        )

        # Check victory after action
        cls._check_and_update_victory(state)
        if state.status != BattleStatus.ONGOING:
            return state

        # Advance to next turn (and handle stun / DoT loop)
        cls._advance_turn(state)
        return state

    @classmethod
    def _apply_status_effect(cls, target: Character, effect: StatusEffect) -> None:
        eff_copy = effect.model_copy(deep=True)
        # Check for existing effect of same name
        for existing in target.status_effects:
            if existing.name == eff_copy.name:
                existing.duration = max(existing.duration, eff_copy.duration)
                existing.value = max(existing.value, eff_copy.value)
                return
        target.status_effects.append(eff_copy)

    @classmethod
    def _advance_turn(cls, state: BattleState) -> None:
        """
        Switches turn, decrements cooldowns, applies DoTs, and handles stuns.
        If next player is stunned, logs the stun, ticks effects, and passes back.
        """
        while state.status == BattleStatus.ONGOING:
            state.turn_count += 1
            if state.turn_count > state.max_turns:
                cls._declare_draw(state, f"Turn limit of {state.max_turns} reached.")
                return

            # Switch active player
            state.current_turn_player = 3 - state.current_turn_player
            new_actor = state.get_active_player()

            # Active player's defending flag is reset
            new_actor.is_defending = False

            # Decrement ability cooldowns for active player
            for ab_id in list(new_actor.cooldowns.keys()):
                if new_actor.cooldowns[ab_id] > 0:
                    new_actor.cooldowns[ab_id] -= 1
                    if new_actor.cooldowns[ab_id] <= 0:
                        del new_actor.cooldowns[ab_id]

            # Process DoT effects on active player
            dot_damage = 0
            for eff in new_actor.status_effects:
                if eff.effect_type in (StatusEffectType.POISON, StatusEffectType.BURN):
                    dot_damage += eff.value

            if dot_damage > 0:
                new_actor.hp = max(0, new_actor.hp - dot_damage)
                state.log.append(
                    BattleLogEntry(
                        turn=state.turn_count,
                        actor_name="Status Effect",
                        actor_player=state.current_turn_player,
                        action_type=ActionType.BASIC_ATTACK,
                        damage_dealt=dot_damage,
                        message=f"{new_actor.name} suffers {dot_damage} damage from lingering burn/poison!",
                        p1_hp_after=state.player1.hp,
                        p1_chakra_after=state.player1.chakra,
                        p2_hp_after=state.player2.hp,
                        p2_chakra_after=state.player2.chakra,
                    )
                )
                cls._check_and_update_victory(state)
                if state.status != BattleStatus.ONGOING:
                    return

            # Decrement status effect durations
            remaining_effects = []
            for eff in new_actor.status_effects:
                eff.duration -= 1
                if eff.duration > 0:
                    remaining_effects.append(eff)
            new_actor.status_effects = remaining_effects

            # Check if active player was stunned
            # Note: if stunned, skip their turn and advance again
            if new_actor.is_stunned:
                state.log.append(
                    BattleLogEntry(
                        turn=state.turn_count,
                        actor_name=new_actor.name,
                        actor_player=state.current_turn_player,
                        action_type=ActionType.DEFEND,
                        message=f"{new_actor.name} is stunned and unable to act this turn!",
                        p1_hp_after=state.player1.hp,
                        p1_chakra_after=state.player1.chakra,
                        p2_hp_after=state.player2.hp,
                        p2_chakra_after=state.player2.chakra,
                    )
                )
                # Stun wore off on duration decrement above
                # Continue loop to give turn to opponent
                continue

            # Active player is ready to choose action
            break

    @classmethod
    def _check_and_update_victory(cls, state: BattleState) -> None:
        p1 = state.player1
        p2 = state.player2

        if p1.hp <= 0 and p2.hp <= 0:
            cls._declare_draw(state, "Both fighters collapsed simultaneously!")
        elif p1.hp <= 0:
            state.status = BattleStatus.PLAYER2_WON
            state.winner = p2.name
            state.winner_player = 2
            state.log.append(
                BattleLogEntry(
                    turn=state.turn_count,
                    actor_name="Referee",
                    actor_player=0,
                    action_type=ActionType.BASIC_ATTACK,
                    message=f"{p1.name} has been defeated! {p2.name} is victorious!",
                    p1_hp_after=p1.hp,
                    p1_chakra_after=p1.chakra,
                    p2_hp_after=p2.hp,
                    p2_chakra_after=p2.chakra,
                )
            )
        elif p2.hp <= 0:
            state.status = BattleStatus.PLAYER1_WON
            state.winner = p1.name
            state.winner_player = 1
            state.log.append(
                BattleLogEntry(
                    turn=state.turn_count,
                    actor_name="Referee",
                    actor_player=0,
                    action_type=ActionType.BASIC_ATTACK,
                    message=f"{p2.name} has been defeated! {p1.name} is victorious!",
                    p1_hp_after=p1.hp,
                    p1_chakra_after=p1.chakra,
                    p2_hp_after=p2.hp,
                    p2_chakra_after=p2.chakra,
                )
            )

    @classmethod
    def _declare_draw(cls, state: BattleState, reason: str) -> None:
        state.status = BattleStatus.DRAW
        state.winner = "Draw"
        state.winner_player = None
        state.log.append(
            BattleLogEntry(
                turn=state.turn_count,
                actor_name="Referee",
                actor_player=0,
                action_type=ActionType.BASIC_ATTACK,
                message=f"Battle ended in a draw! {reason}",
                p1_hp_after=state.player1.hp,
                p1_chakra_after=state.player1.chakra,
                p2_hp_after=state.player2.hp,
                p2_chakra_after=state.player2.chakra,
            )
        )
