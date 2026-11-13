import React from 'react';
import { Ability } from '../../types/character';
import { sound } from '../../utils/sound';
import { Zap, Clock, Sparkles, Shield, Heart, Flame } from 'lucide-react';
import { getChakraRestore, MEDITATE_ABILITY_ID, MAX_HEAL_USES } from '../../utils/aiEngine';

interface AbilityButtonProps {
  ability: Ability;
  currentChakra: number;
  cooldownTurnsRemaining: number;
  disabled?: boolean;
  unlimitedChakra?: boolean; // Training Dojo
  healsLeft?: number; // remaining healing casts for this fighter
  onClick: () => void;
}

export const AbilityButton: React.FC<AbilityButtonProps> = ({
  ability,
  currentChakra,
  cooldownTurnsRemaining,
  disabled = false,
  unlimitedChakra = false,
  healsLeft = MAX_HEAL_USES,
  onClick,
}) => {
  const isOutOfChakra = !unlimitedChakra && currentChakra < ability.chakraCost;
  const chakraRestore = unlimitedChakra ? 0 : getChakraRestore(ability);
  const isOnCooldown = cooldownTurnsRemaining > 0;
  const isHealLimitReached = !!ability.heal && healsLeft <= 0;
  const isUsable = !disabled && !isOutOfChakra && !isOnCooldown && !isHealLimitReached;

  const handleClick = () => {
    if (isUsable) {
      sound.playClick();
      onClick();
    }
  };

  const getBorderColor = () => {
    if (!isUsable) return 'border-ninja-border/60 bg-ninja-card/40 opacity-50 cursor-not-allowed';
    if (ability.id === MEDITATE_ABILITY_ID) {
      return 'border-chakra-blue bg-gradient-to-br from-ninja-panel to-chakra-blue/30 shadow-glow-blue hover:brightness-125 animate-pulse-slow';
    }
    if (ability.type === 'ultimate') {
      return 'border-flame-orange bg-gradient-to-br from-ninja-panel to-flame-orange/20 shadow-glow-orange hover:brightness-125 animate-pulse-slow';
    }
    if (ability.heal) {
      return 'border-vitality-green/70 bg-gradient-to-br from-ninja-panel to-vitality-green/20 hover:border-vitality-green hover:shadow-glow-green';
    }
    if (ability.shield && !ability.damage) {
      return 'border-chakra-blue/70 bg-gradient-to-br from-ninja-panel to-chakra-blue/20 hover:border-chakra-blue hover:shadow-glow-blue';
    }
    return 'border-ninja-border/90 bg-ninja-panel hover:border-flame-orange/60 hover:shadow-glow-orange';
  };

  const getTypeIcon = () => {
    if (ability.id === MEDITATE_ABILITY_ID) return <Zap className="h-4 w-4 text-chakra-blue" />;
    if (ability.type === 'ultimate') return <Sparkles className="h-4 w-4 text-flame-orange" />;
    if (ability.heal) return <Heart className="h-4 w-4 text-vitality-green" />;
    if (ability.shield && !ability.damage) return <Shield className="h-4 w-4 text-chakra-blue" />;
    return <Flame className="h-4 w-4 text-sharingan-red" />;
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isUsable}
      className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-200 select-none ${getBorderColor()}`}
    >
      {/* Cooldown Overlay */}
      {isOnCooldown && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/75 backdrop-blur-[2px]">
          <Clock className="h-5 w-5 text-gray-400 mb-1 animate-spin [animation-duration:4s]" />
          <span className="text-xs font-mono font-bold text-gray-200">
            {cooldownTurnsRemaining} {cooldownTurnsRemaining === 1 ? 'Turn' : 'Turns'}
          </span>
        </div>
      )}

      {/* Top Header: Name and Type Icon */}
      <div className="flex items-start justify-between w-full">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            {getTypeIcon()}
            <span className="truncate font-bold text-sm text-white">{ability.name}</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">{ability.japaneseName}</span>
        </div>
        <div className="shrink-0 flex items-center gap-1 rounded bg-chakra-blue/20 px-2 py-0.5 text-[11px] font-mono font-bold text-chakra-blue">
          <Zap className="h-3 w-3 fill-chakra-blue" />
          <span>{unlimitedChakra ? '∞' : ability.chakraCost}</span>
        </div>
      </div>

      {/* Description Snippet */}
      <p className="my-2 line-clamp-2 text-[11px] text-gray-300 leading-snug">
        {ability.description}
      </p>

      {/* Bottom tags */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono">
        {ability.damage && (
          <span className="text-sharingan-red font-bold">⚔ {ability.damage} DMG</span>
        )}
        {ability.heal && (
          <span className="text-vitality-green font-bold">💚 +{ability.heal} HP</span>
        )}
        {ability.heal && (
          <span className={`font-bold ${isHealLimitReached ? 'text-red-400' : 'text-gray-400'}`}>
            {isHealLimitReached ? 'Heal limit reached' : `(${healsLeft}/${MAX_HEAL_USES} heals left)`}
          </span>
        )}
        {ability.shield && (
          <span className="text-blue-400 font-bold">🛡 +{ability.shield} DEF</span>
        )}
        {chakraRestore > 0 && (
          <span className="text-cyan-300 font-bold">⚡ +{chakraRestore} Chakra</span>
        )}
        {ability.criticalChance && (
          <span className="text-amber-400 font-bold">💥 {Math.round(ability.criticalChance * 100)}% Crit</span>
        )}
        {isOutOfChakra && !isOnCooldown && !isHealLimitReached && (
          <span className="ml-auto text-red-400 font-bold">Low Chakra</span>
        )}
      </div>
    </button>
  );
};
