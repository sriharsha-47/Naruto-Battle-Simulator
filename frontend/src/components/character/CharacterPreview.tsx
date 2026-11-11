import React from 'react';
import { Character } from '../../types/character';
import { CharacterVisual } from './CharacterVisual';
import { StatRadar } from './StatRadar';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Heart, Zap, Swords } from 'lucide-react';
import { sound } from '../../utils/sound';

interface CharacterPreviewProps {
  character: Character;
  onSetCompareSlot1?: () => void;
  onSetCompareSlot2?: () => void;
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
  character,
  onSetCompareSlot1,
  onSetCompareSlot2,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-ninja-border/80 bg-ninja-surface/90 p-6 backdrop-blur-md">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-ninja-border/60 pb-6">
        <CharacterVisual character={character} size="lg" />

        <div className="flex-1 text-center sm:text-left">
          <div className="inline-block rounded-full bg-flame-orange/20 px-3 py-1 text-xs font-bold text-flame-orange border border-flame-orange/30 mb-2">
            {character.village} • {character.chakraNature} Release
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {character.name}
          </h2>
          <p className="text-sm font-semibold text-gray-400 mt-1">{character.title}</p>
          <p className="mt-3 text-xs leading-relaxed text-gray-300 max-w-xl">
            {character.lore}
          </p>

          {/* Quick battle CTA */}
          <div className="mt-5 flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Swords className="h-4 w-4" />}
              onClick={() => {
                sound.playClick();
                navigate('/battle/setup', { state: { preselectedP1: character.id } });
              }}
            >
              Deploy in Battle
            </Button>
            {onSetCompareSlot1 && (
              <Button variant="secondary" size="sm" onClick={onSetCompareSlot1}>
                Compare as Slot 1
              </Button>
            )}
            {onSetCompareSlot2 && (
              <Button variant="secondary" size="sm" onClick={onSetCompareSlot2}>
                Compare as Slot 2
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Radar */}
        <div className="rounded-xl border border-ninja-border/50 bg-ninja-panel/60 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Attributes Radar
          </h4>
          <StatRadar stats={character.stats} name={character.name} />
        </div>

        {/* Numerical Stat Bars */}
        <div className="space-y-3.5 rounded-xl border border-ninja-border/50 bg-ninja-panel/60 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
            Vital Baseline
          </h4>

          {/* HP */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-vitality-green font-bold">
                <Heart className="h-3.5 w-3.5" /> Max Health
              </span>
              <span className="text-white font-bold">{character.stats.hp}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ninja-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-vitality-green to-emerald-400 rounded-full"
                style={{ width: `${Math.min(100, (character.stats.hp / 1400) * 100)}%` }}
              />
            </div>
          </div>

          {/* Chakra */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-chakra-blue font-bold">
                <Zap className="h-3.5 w-3.5" /> Max Chakra
              </span>
              <span className="text-white font-bold">{character.stats.chakra}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ninja-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-chakra-blue to-chakra-cyan rounded-full"
                style={{ width: `${Math.min(100, (character.stats.chakra / 1400) * 100)}%` }}
              />
            </div>
          </div>

          {/* Attack */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-flame-orange font-bold">
                <Swords className="h-3.5 w-3.5" /> Attack Power
              </span>
              <span className="text-white font-bold">{character.stats.attack}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ninja-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-flame-orange to-amber-400 rounded-full"
                style={{ width: `${character.stats.attack}%` }}
              />
            </div>
          </div>

          {/* Defense */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1">
              <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                <Shield className="h-3.5 w-3.5" /> Defense Ward
              </span>
              <span className="text-white font-bold">{character.stats.defense}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-ninja-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full"
                style={{ width: `${character.stats.defense}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Jutsu Abilities Showcase */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-flame-orange mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Jutsu Repertoire ({character.abilities.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {character.abilities.map((ability) => (
            <div
              key={ability.id}
              className="rounded-xl border border-ninja-border/70 bg-ninja-panel p-4 hover:border-flame-orange/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h5 className="font-bold text-sm text-white">{ability.name}</h5>
                  <span className="text-[10px] font-mono text-gray-400">{ability.japaneseName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-chakra-blue/20 px-2 py-0.5 text-[10px] font-mono font-bold text-chakra-blue">
                    {ability.chakraCost} CP
                  </span>
                  {ability.cooldown > 0 && (
                    <span className="rounded bg-ninja-border px-1.5 py-0.5 text-[10px] font-mono text-gray-300">
                      {ability.cooldown}T CD
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-300 leading-relaxed">
                {ability.description}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono">
                {ability.damage && (
                  <span className="text-sharingan-red font-bold">⚔ {ability.damage} DMG</span>
                )}
                {ability.heal && (
                  <span className="text-vitality-green font-bold">💚 +{ability.heal} HP</span>
                )}
                {ability.shield && (
                  <span className="text-blue-400 font-bold">🛡 +{ability.shield} Shield</span>
                )}
                {ability.criticalChance && (
                  <span className="text-amber-400 font-bold">💥 {Math.round(ability.criticalChance * 100)}% Crit</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
