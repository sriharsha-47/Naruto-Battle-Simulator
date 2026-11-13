import React from 'react';
import { Character } from '../../types/character';

interface CharacterVisualProps {
  character: Character;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isFlipped?: boolean;
  isActiveTurn?: boolean;
  isDefeated?: boolean;
}

export const CharacterVisual: React.FC<CharacterVisualProps> = ({
  character,
  size = 'md',
  isFlipped = false,
  isActiveTurn = false,
  isDefeated = false,
}) => {
  const sizeMap = {
    sm: 'w-16 h-16 text-2xl',
    md: 'w-28 h-28 text-4xl',
    lg: 'w-44 h-44 text-6xl',
    xl: 'w-64 h-64 text-8xl',
  };

  const { from, via, to, border, glow } = character.gradient;

  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl select-none overflow-hidden transition-all duration-300 ${
        sizeMap[size]
      } ${isFlipped ? '-scale-x-100' : ''} ${
        isDefeated ? 'grayscale opacity-40 scale-95' : ''
      } ${
        isActiveTurn
          ? 'ring-4 ring-flame-orange ring-offset-4 ring-offset-ninja-bg animate-pulse-slow'
          : ''
      }`}
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${via || from} 50%, ${to} 100%)`,
        boxShadow: `0 0 25px ${glow}, inset 0 0 15px rgba(255,255,255,0.2)`,
        border: `2px solid ${border}`,
      }}
    >
      {/* Kanji Watermark background */}
      <span className="absolute inset-0 flex items-center justify-center font-display font-black text-black/25 text-[110%] pointer-events-none select-none">
        {character.kanji}
      </span>

      {/* Primary Emblem */}
      <span className="relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] transform hover:scale-110 transition-transform duration-200">
        {character.symbol}
      </span>

      {/* Chakra Nature Badge */}
      <div className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-white backdrop-blur-sm">
        {character.chakraNature}
      </div>
    </div>
  );
};
