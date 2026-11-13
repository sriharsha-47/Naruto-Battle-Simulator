import React from 'react';
import { Character } from '../../types/character';
import { CharacterVisual } from './CharacterVisual';
import { StatRadar } from './StatRadar';
import { ArrowRightLeft, Shield, Zap, Heart, Flame } from 'lucide-react';

interface CharacterCompareProps {
  char1: Character;
  char2: Character;
  onSwap?: () => void;
}

export const CharacterCompare: React.FC<CharacterCompareProps> = ({
  char1,
  char2,
  onSwap,
}) => {
  const hpDiff = char1.stats.hp - char2.stats.hp;
  const chakraDiff = char1.stats.chakra - char2.stats.chakra;
  const atkDiff = char1.stats.attack - char2.stats.attack;
  const defDiff = char1.stats.defense - char2.stats.defense;
  const spdDiff = char1.stats.speed - char2.stats.speed;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-ninja-border/80 bg-ninja-surface/95 p-6 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ninja-border/60 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white tracking-wide">
            Shinobi Versus Assessment
          </h3>
          <p className="text-xs text-gray-400">Direct tactical parameter comparison</p>
        </div>
        {onSwap && (
          <button
            onClick={onSwap}
            className="flex items-center gap-1.5 rounded-lg border border-ninja-border bg-ninja-card px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-flame-orange transition-colors"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" /> Swap Positions
          </button>
        )}
      </div>

      {/* Head to Head Visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Fighter 1 */}
        <div className="flex items-center gap-4 rounded-xl border border-flame-orange/40 bg-ninja-panel/80 p-4 shadow-glow-orange/20">
          <CharacterVisual character={char1} size="md" />
          <div>
            <span className="text-[10px] font-mono font-bold text-flame-orange uppercase">Contender A</span>
            <h4 className="text-lg font-bold text-white">{char1.name}</h4>
            <p className="text-xs text-gray-400">{char1.title}</p>
          </div>
        </div>

        {/* Fighter 2 */}
        <div className="flex items-center gap-4 rounded-xl border border-chakra-blue/40 bg-ninja-panel/80 p-4 shadow-glow-blue/20">
          <CharacterVisual character={char2} size="md" isFlipped />
          <div>
            <span className="text-[10px] font-mono font-bold text-chakra-blue uppercase">Contender B</span>
            <h4 className="text-lg font-bold text-white">{char2.name}</h4>
            <p className="text-xs text-gray-400">{char2.title}</p>
          </div>
        </div>
      </div>

      {/* Overlaid Radar Chart */}
      <div className="rounded-xl border border-ninja-border/50 bg-ninja-panel/60 p-5">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Comparative Attribute Overlay
          </h4>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-flame-orange font-bold">
              <span className="h-2 w-2 rounded-full bg-flame-orange"></span> {char1.name}
            </span>
            <span className="flex items-center gap-1.5 text-chakra-blue font-bold">
              <span className="h-2 w-2 rounded-full bg-chakra-blue"></span> {char2.name}
            </span>
          </div>
        </div>
        <StatRadar
          stats={char1.stats}
          compareStats={char2.stats}
          name={char1.name}
          compareName={char2.name}
        />
      </div>

      {/* Direct Stat Delta Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="border-b border-ninja-border/80 text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="py-2.5">Attribute</th>
              <th className="py-2.5 text-flame-orange">{char1.name}</th>
              <th className="py-2.5 text-chakra-blue">{char2.name}</th>
              <th className="py-2.5">Advantage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ninja-border/40">
            <tr>
              <td className="py-2.5 text-gray-300 font-bold flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-vitality-green" /> Max Health
              </td>
              <td className="py-2.5 text-white font-bold">{char1.stats.hp}</td>
              <td className="py-2.5 text-white font-bold">{char2.stats.hp}</td>
              <td className="py-2.5 font-bold">
                {hpDiff > 0 ? (
                  <span className="text-flame-orange">+{hpDiff} {char1.name}</span>
                ) : hpDiff < 0 ? (
                  <span className="text-chakra-blue">+{Math.abs(hpDiff)} {char2.name}</span>
                ) : (
                  <span className="text-gray-400">Tied</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-300 font-bold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-chakra-blue" /> Max Chakra
              </td>
              <td className="py-2.5 text-white font-bold">{char1.stats.chakra}</td>
              <td className="py-2.5 text-white font-bold">{char2.stats.chakra}</td>
              <td className="py-2.5 font-bold">
                {chakraDiff > 0 ? (
                  <span className="text-flame-orange">+{chakraDiff} {char1.name}</span>
                ) : chakraDiff < 0 ? (
                  <span className="text-chakra-blue">+{Math.abs(chakraDiff)} {char2.name}</span>
                ) : (
                  <span className="text-gray-400">Tied</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-300 font-bold flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-flame-orange" /> Attack Power
              </td>
              <td className="py-2.5 text-white font-bold">{char1.stats.attack}</td>
              <td className="py-2.5 text-white font-bold">{char2.stats.attack}</td>
              <td className="py-2.5 font-bold">
                {atkDiff > 0 ? (
                  <span className="text-flame-orange">+{atkDiff} {char1.name}</span>
                ) : atkDiff < 0 ? (
                  <span className="text-chakra-blue">+{Math.abs(atkDiff)} {char2.name}</span>
                ) : (
                  <span className="text-gray-400">Tied</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-300 font-bold flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-400" /> Defense Guard
              </td>
              <td className="py-2.5 text-white font-bold">{char1.stats.defense}</td>
              <td className="py-2.5 text-white font-bold">{char2.stats.defense}</td>
              <td className="py-2.5 font-bold">
                {defDiff > 0 ? (
                  <span className="text-flame-orange">+{defDiff} {char1.name}</span>
                ) : defDiff < 0 ? (
                  <span className="text-chakra-blue">+{Math.abs(defDiff)} {char2.name}</span>
                ) : (
                  <span className="text-gray-400">Tied</span>
                )}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-gray-300 font-bold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-yellow-400" /> Speed Velocity
              </td>
              <td className="py-2.5 text-white font-bold">{char1.stats.speed}</td>
              <td className="py-2.5 text-white font-bold">{char2.stats.speed}</td>
              <td className="py-2.5 font-bold">
                {spdDiff > 0 ? (
                  <span className="text-flame-orange">+{spdDiff} {char1.name}</span>
                ) : spdDiff < 0 ? (
                  <span className="text-chakra-blue">+{Math.abs(spdDiff)} {char2.name}</span>
                ) : (
                  <span className="text-gray-400">Tied</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
