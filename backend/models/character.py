from typing import Dict, List, Optional
from pydantic import BaseModel, Field, model_validator
from backend.models.ability import Ability, StatusEffect
from backend.models.enums import StatusEffectType


class Character(BaseModel):
    id: str
    name: str
    title: str = ""
    description: str = ""
    avatar_url: str = ""
    max_hp: int = 100
    hp: int = 100
    max_chakra: int = 100
    chakra: int = 100
    attack: int = 50
    defense: int = 50
    speed: int = 50
    abilities: List[Ability] = Field(default_factory=list)
    cooldowns: Dict[str, int] = Field(default_factory=dict)
    status_effects: List[StatusEffect] = Field(default_factory=list)
    is_defending: bool = False

    @model_validator(mode="after")
    def clamp_bounds(self) -> "Character":
        if self.hp > self.max_hp:
            self.hp = self.max_hp
        if self.hp < 0:
            self.hp = 0
        if self.chakra > self.max_chakra:
            self.chakra = self.max_chakra
        if self.chakra < 0:
            self.chakra = 0
        return self

    @property
    def is_alive(self) -> bool:
        return self.hp > 0

    @property
    def effective_attack(self) -> int:
        bonus = 0
        for eff in self.status_effects:
            if eff.effect_type == StatusEffectType.BUFF_ATTACK:
                bonus += eff.value
            elif eff.effect_type == StatusEffectType.DEBUFF_ATTACK:
                bonus -= eff.value
        return max(1, self.attack + bonus)

    @property
    def effective_defense(self) -> int:
        bonus = 0
        for eff in self.status_effects:
            if eff.effect_type == StatusEffectType.BUFF_DEFENSE:
                bonus += eff.value
            elif eff.effect_type == StatusEffectType.DEBUFF_DEFENSE:
                bonus -= eff.value
        return max(1, self.defense + bonus)

    @property
    def current_shield(self) -> int:
        return sum(eff.value for eff in self.status_effects if eff.effect_type == StatusEffectType.SHIELD)

    @property
    def is_stunned(self) -> bool:
        return any(eff.effect_type == StatusEffectType.STUN and eff.duration > 0 for eff in self.status_effects)

    def get_ability(self, ability_id: str) -> Optional[Ability]:
        for ab in self.abilities:
            if ab.id == ability_id:
                return ab
        return None

    def can_use_ability(self, ability_id: str) -> bool:
        ab = self.get_ability(ability_id)
        if not ab:
            return False
        if self.cooldowns.get(ability_id, 0) > 0:
            return False
        if self.chakra < ab.chakra_cost:
            return False
        return True

    def reset_for_battle(self) -> None:
        self.hp = self.max_hp
        self.chakra = self.max_chakra
        self.cooldowns = {}
        self.status_effects = []
        self.is_defending = False
