import time
from typing import Any, Dict, List, Optional, Tuple
from backend.ai.base import BaseAI
from backend.engine.action_validator import ActionValidator
from backend.engine.battle_engine import BattleEngine
from backend.models.ability import Ability
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import ActionType, EffectType, StatusEffectType


class RuleBasedAI(BaseAI):
    """
    Expert system AI using prioritized strategic rules:
    1. Lethal Opportunity: Take immediate win if available.
    2. Survival / Emergency: Heal or Shield if HP < 30%; defend if no heal available.
    3. Execute Ultimate: Fire ultimate if ready and safe.
    4. Chakra Conservation: Recover chakra when depleted (< 25) and safe.
    5. Highest Damage Ability: Unleash strongest available offensive jutsu.
    6. Anticipatory Defense: Defend if opponent has ultimate ready.
    7. Secondary Abilities: Buffs, debuffs, status moves.
    8. Basic Attack: Reliable fallback.
    """

    def __init__(self, name: str = "Rule-Based AI"):
        super().__init__(name=name)

    def select_action(
        self, state: BattleState, player_num: int
    ) -> Tuple[BattleAction, Dict[str, Any]]:
        start_time = time.perf_counter()
        valid_actions = ActionValidator.get_valid_actions(state, player_num)

        if not valid_actions:
            raise ValueError(f"No valid actions available for Player {player_num}")

        actor = state.get_player(player_num)
        opp_player_num = 2 if player_num == 1 else 1
        opp = state.get_player(opp_player_num)

        selected_action: Optional[BattleAction] = None
        rule_triggered: str = "Fallback"

        # 1. Check for Lethal Finish
        for act in valid_actions:
            sim = BattleEngine.simulate_action(state, act)
            sim_opp = sim.get_player(opp_player_num)
            if not sim_opp.is_alive:
                selected_action = act
                rule_triggered = f"Lethal Strike: Finishes opponent with {act}"
                break

        # 2. Survival Instinct (HP < 30%)
        if not selected_action and (actor.hp / max(1, actor.max_hp)) < 0.30:
            # Check for heal / shield abilities
            healing_abilities = [
                a for a in valid_actions
                if a.type == ActionType.ABILITY
                and actor.get_ability(a.ability_id)
                and (
                    actor.get_ability(a.ability_id).effect_type in (EffectType.HEAL, EffectType.SHIELD)
                    or actor.get_ability(a.ability_id).heal > 0
                )
            ]
            if healing_abilities:
                selected_action = healing_abilities[0]
                rule_triggered = f"Emergency Recovery: Low HP ({actor.hp}/{actor.max_hp}), activating healing/shield"
            else:
                defend_act = BattleAction(type=ActionType.DEFEND)
                if defend_act in valid_actions:
                    selected_action = defend_act
                    rule_triggered = f"Emergency Defense: Low HP ({actor.hp}/{actor.max_hp}), defending incoming blow"

        # 3. Execute Ultimate Ability
        if not selected_action:
            ult_actions = [
                a for a in valid_actions
                if a.type == ActionType.ABILITY
                and actor.get_ability(a.ability_id)
                and actor.get_ability(a.ability_id).is_ultimate
            ]
            if ult_actions:
                # Avoid suicidal self-damage if HP is too low for Eight Gates
                best_ult = None
                for u in ult_actions:
                    ab = actor.get_ability(u.ability_id)
                    if ab and ab.self_damage > 0 and actor.hp <= ab.self_damage:
                        continue
                    best_ult = u
                    break
                if best_ult:
                    selected_action = best_ult
                    rule_triggered = f"Ultimate Unleashed: Triggering ultimate {best_ult.ability_id}"

        # 4. Chakra Management
        if not selected_action and actor.max_chakra > 0 and actor.chakra < 25:
            # If not in critical danger, recover chakra
            if (actor.hp / max(1, actor.max_hp)) > 0.35:
                recover_act = BattleAction(type=ActionType.RECOVER_CHAKRA)
                if recover_act in valid_actions:
                    selected_action = recover_act
                    rule_triggered = f"Chakra Management: Chakra low ({actor.chakra}/{actor.max_chakra}), replenishing"

        # 5. Anticipatory Defense: Check if opponent has lethal or ultimate ready
        if not selected_action and (actor.hp / max(1, actor.max_hp)) < 0.60:
            opp_has_ult_ready = any(
                ab.is_ultimate and opp.cooldowns.get(ab.id, 0) == 0 and opp.chakra >= ab.chakra_cost
                for ab in opp.abilities
            )
            if opp_has_ult_ready:
                defend_act = BattleAction(type=ActionType.DEFEND)
                if defend_act in valid_actions:
                    selected_action = defend_act
                    rule_triggered = "Anticipatory Defense: Opponent has ultimate ready"

        # 6. High-Damage Ability
        if not selected_action:
            damaging_actions = []
            for a in valid_actions:
                if a.type == ActionType.ABILITY:
                    ab = actor.get_ability(a.ability_id)
                    if ab and ab.damage > 0:
                        damaging_actions.append((ab.damage, a))

            if damaging_actions:
                damaging_actions.sort(key=lambda item: item[0], reverse=True)
                selected_action = damaging_actions[0][1]
                rule_triggered = f"Offensive Ability: High-impact strike {selected_action.ability_id}"

        # 7. Other Abilities (Buffs, Debuffs)
        if not selected_action:
            other_abilities = [a for a in valid_actions if a.type == ActionType.ABILITY]
            if other_abilities:
                selected_action = other_abilities[0]
                rule_triggered = f"Tactical Ability: Using utility {selected_action.ability_id}"

        # 8. Fallback to Basic Attack (or Defend if no attack)
        if not selected_action:
            basic_act = BattleAction(type=ActionType.BASIC_ATTACK)
            if basic_act in valid_actions:
                selected_action = basic_act
                rule_triggered = "Standard Offensive: Basic Attack"
            else:
                selected_action = valid_actions[0]
                rule_triggered = f"Forced Choice: {selected_action}"

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        stats = {
            "strategy": "rule_based",
            "rule_triggered": rule_triggered,
            "execution_time_ms": round(elapsed_ms, 2),
            "nodes_explored": len(valid_actions),
        }
        return selected_action, stats
