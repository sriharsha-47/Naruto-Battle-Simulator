import random
from typing import Optional, Tuple
from backend.models.character import Character
from backend.models.enums import StatusEffectType


class DamageCalculator:
    BASE_BASIC_ATTACK_DAMAGE: int = 22
    RECOVER_CHAKRA_AMOUNT: int = 25

    @classmethod
    def calculate_raw_damage(
        cls,
        base_damage: int,
        attacker_attack: int,
        defender_defense: int,
        is_defending: bool = False,
        deterministic: bool = False,
        random_factor: Optional[float] = None,
    ) -> int:
        if base_damage <= 0:
            return 0

        if random_factor is None:
            if deterministic:
                random_factor = 1.0
            else:
                random_factor = random.uniform(0.85, 1.15)

        ratio = attacker_attack / max(1, defender_defense)
        damage = base_damage * ratio * random_factor

        if is_defending:
            damage *= 0.5

        return max(1, int(round(damage)))

    @classmethod
    def apply_damage_with_shields(
        cls, defender: Character, incoming_damage: int
    ) -> Tuple[int, int]:
        """
        Applies incoming damage against defender's active shields first,
        then reduces defender HP with any remaining damage.
        Returns: (hp_damage_taken, shield_absorbed)
        """
        if incoming_damage <= 0:
            return 0, 0

        remaining_damage = incoming_damage
        shield_absorbed = 0

        # Find shield effects
        for eff in defender.status_effects:
            if eff.effect_type == StatusEffectType.SHIELD and eff.value > 0:
                if eff.value >= remaining_damage:
                    eff.value -= remaining_damage
                    shield_absorbed += remaining_damage
                    remaining_damage = 0
                    break
                else:
                    absorbed = eff.value
                    shield_absorbed += absorbed
                    remaining_damage -= absorbed
                    eff.value = 0

        # Remove exhausted shields
        defender.status_effects = [
            e for e in defender.status_effects
            if not (e.effect_type == StatusEffectType.SHIELD and e.value <= 0)
        ]

        # Apply remaining damage to HP
        hp_damage = 0
        if remaining_damage > 0:
            hp_damage = min(defender.hp, remaining_damage)
            defender.hp = max(0, defender.hp - remaining_damage)

        return hp_damage, shield_absorbed
