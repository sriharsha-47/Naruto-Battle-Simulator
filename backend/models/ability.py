from typing import Optional
from pydantic import BaseModel, Field
from backend.models.enums import EffectType, TargetType, StatusEffectType


class StatusEffect(BaseModel):
    name: str
    effect_type: StatusEffectType
    value: int = 0
    duration: int = 1

    def model_copy(self, *, update=None, deep=True):
        return super().model_copy(update=update, deep=deep)


class Ability(BaseModel):
    id: str
    name: str
    description: str = ""
    damage: int = 0
    heal: int = 0
    chakra_cost: int = 0
    cooldown_turns: int = 0
    effect_type: EffectType = EffectType.DAMAGE
    target_type: TargetType = TargetType.OPPONENT
    status_effect: Optional[StatusEffect] = None
    chakra_drain: int = 0
    self_damage: int = 0
    is_ultimate: bool = False
