from enum import Enum


class ActionType(str, Enum):
    BASIC_ATTACK = "basic_attack"
    DEFEND = "defend"
    RECOVER_CHAKRA = "recover_chakra"
    ABILITY = "ability"


class EffectType(str, Enum):
    DAMAGE = "damage"
    HEAL = "heal"
    BUFF = "buff"
    DEBUFF = "debuff"
    DOT = "dot"
    SHIELD = "shield"
    STUN = "stun"


class TargetType(str, Enum):
    OPPONENT = "opponent"
    SELF = "self"


class StatusEffectType(str, Enum):
    POISON = "poison"
    BURN = "burn"
    STUN = "stun"
    SHIELD = "shield"
    BUFF_ATTACK = "buff_attack"
    BUFF_DEFENSE = "buff_defense"
    DEBUFF_ATTACK = "debuff_attack"
    DEBUFF_DEFENSE = "debuff_defense"


class AIStrategy(str, Enum):
    RANDOM = "random"
    RULE_BASED = "rule_based"
    HEURISTIC = "heuristic"
    MINIMAX = "minimax"
    ALPHA_BETA = "alpha_beta"


class BattleStatus(str, Enum):
    ONGOING = "ongoing"
    PLAYER1_WON = "player1_won"
    PLAYER2_WON = "player2_won"
    DRAW = "draw"


class TournamentStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
