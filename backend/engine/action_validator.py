from typing import List, Optional, Tuple
from backend.models.battle_state import BattleAction, BattleState
from backend.models.enums import ActionType, BattleStatus


class ActionValidator:
    @classmethod
    def validate_action(
        cls, state: BattleState, action: BattleAction, player_num: int
    ) -> Tuple[bool, Optional[str]]:
        if state.status != BattleStatus.ONGOING:
            return False, f"Battle is already finished with status: {state.status.value}"

        if state.current_turn_player != player_num:
            return False, f"It is not player {player_num}'s turn (current: player {state.current_turn_player})"

        actor = state.get_player(player_num)
        if not actor.is_alive:
            return False, f"Player {player_num} ({actor.name}) is defeated"

        if action.type == ActionType.BASIC_ATTACK:
            return True, None

        if action.type == ActionType.DEFEND:
            return True, None

        if action.type == ActionType.RECOVER_CHAKRA:
            return True, None

        if action.type == ActionType.ABILITY:
            if not action.ability_id:
                return False, "Ability action requires an ability_id"

            ability = actor.get_ability(action.ability_id)
            if not ability:
                return False, f"Character {actor.name} does not possess ability '{action.ability_id}'"

            cd = actor.cooldowns.get(action.ability_id, 0)
            if cd > 0:
                return False, f"Ability '{ability.name}' is on cooldown for {cd} more turn(s)"

            if actor.chakra < ability.chakra_cost:
                return (
                    False,
                    f"Not enough chakra for '{ability.name}'. Required: {ability.chakra_cost}, Current: {actor.chakra}",
                )

            return True, None

        return False, f"Unknown action type: {action.type}"

    @classmethod
    def get_valid_actions(cls, state: BattleState, player_num: int) -> List[BattleAction]:
        if state.status != BattleStatus.ONGOING or state.current_turn_player != player_num:
            return []

        actor = state.get_player(player_num)
        if not actor.is_alive:
            return []

        # When stunned, actor cannot perform standard actions; engine resolves stun
        if actor.is_stunned:
            return []

        actions: List[BattleAction] = [
            BattleAction(type=ActionType.BASIC_ATTACK),
            BattleAction(type=ActionType.DEFEND),
            BattleAction(type=ActionType.RECOVER_CHAKRA),
        ]

        for ab in actor.abilities:
            if actor.can_use_ability(ab.id):
                actions.append(BattleAction(type=ActionType.ABILITY, ability_id=ab.id))

        return actions
