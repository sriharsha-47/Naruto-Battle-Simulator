import React from 'react';
import { Character } from '../../types/character';
import { CharacterVisual } from './CharacterVisual';
import { sound } from '../../utils/sound';
import { Shield, Zap, Flame } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onClick?: () => void;
  badge?: string;
  compact?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected = false,
  onClick,
  badge,
  compact = false,
}) => {
  const handleClick = () => {
    sound.playClick();
    onClick?.();
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ${
        isSelected
          ? 'border-flame-orange bg-ninja-card shadow-glow-orange scale-[1.02]'
          : 'border-ninja-border/70 bg-ninja-panel/90 hover:border-flame-orange/50 hover:bg-ninja-card hover:-translate-y-1'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      {badge && (
        <span className="absolute top-2 right-2 z-10 rounded-full bg-flame-orange/20 px-2 py-0.5 text-[10px] font-bold text-flame-orange border border-flame-orange/30">
          {badge}
        </span>
      )}

      <div className="flex items-center gap-4">
        {/* Visual symbol avatar */}
        <CharacterVisual character={character} size={compact ? 'sm' : 'md'} />

        {/* Character Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="truncate font-bold text-base text-white group-hover:text-flame-orange transition-colors">
              {character.name}
            </h4>
          </div>
          <p className="truncate text-xs text-gray-400 font-medium">
            {character.title}
          </p>

          {/* Quick stats badges */}
          {!compact && (
            <div className="mt-3 flex items-center gap-3 text-[11px] font-mono text-gray-300">
              <span className="flex items-center gap-1 text-flame-orange">
                <Flame className="h-3 w-3" />
                {character.stats.attack}
              </span>
              <span className="flex items-center gap-1 text-chakra-blue">
                <Shield className="h-3 w-3" />
                {character.stats.defense}
              </span>
              <span className="flex items-center gap-1 text-yellow-400">
                <Zap className="h-3 w-3" />
                {character.stats.speed}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
