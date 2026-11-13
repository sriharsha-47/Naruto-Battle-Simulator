import React from 'react';
import { BattleState } from '../../types/battle';
import { AbilityButton } from './AbilityButton';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Brain, Swords, Zap } from 'lucide-react';
import { hasUnlimitedChakra, mustMeditate, MEDITATE_ABILITY, getHealsLeft } from '../../utils/aiEngine';

interface ActionPanelProps {
  battle: BattleState;
  isAIThinking: boolean;
  onExecuteAbility: (actor: 'player1' | 'player2', abilityId: string) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  battle,
  isAIThinking,
  onExecuteAbility,
}) => {
  const currentActorKey = battle.currentTurn;
  const currentFighter = currentActorKey === 'player1' ? battle.player1 : battle.player2;
  const isAIMove = currentFighter.isAI;
  const unlimited = hasUnlimitedChakra(battle);
  // No castable jutsu (chakra / cooldowns)? Offer Meditate so the turn can never get stuck
  const needsMeditate = battle.status === 'ongoing' && mustMeditate(currentFighter, unlimited);
  const abilities = needsMeditate
    ? [...currentFighter.character.abilities, MEDITATE_ABILITY]
    : currentFighter.character.abilities;

  return (
    <div className="rounded-2xl border border-ninja-border/80 bg-ninja-surface/95 p-4 shadow-xl backdrop-blur-md">
      {/* Panel Top Status */}
      <div className="flex items-center justify-between border-b border-ninja-border/60 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-flame-orange" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Available Jutsu Command Deck
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold ${
              currentActorKey === 'player1'
                ? 'bg-flame-orange/20 text-flame-orange border border-flame-orange/30'
                : 'bg-chakra-blue/20 text-chakra-blue border border-chakra-blue/30'
            }`}
          >
            {currentFighter.character.name}&apos;s Turn
          </span>
        </div>

        {unlimited && (
          <span className="rounded-full border border-chakra-blue/40 bg-chakra-blue/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-chakra-blue">
            ∞ Unlimited Chakra
          </span>
        )}

        {isAIMove && (
          <div className="flex items-center gap-2 rounded-lg bg-ninja-panel px-3 py-1 text-xs font-mono text-gray-300">
            <Brain className="h-3.5 w-3.5 text-flame-orange animate-pulse" />
            <span>
              AI Active: <strong className="text-white uppercase">{currentFighter.aiStrategy}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Jutsu Buttons Grid or AI Thinking State */}
      {isAIMove && isAIThinking ? (
        <div className="flex h-36 flex-col items-center justify-center gap-3 rounded-xl border border-ninja-border/50 bg-ninja-panel/60">
          <LoadingSpinner size="md" variant="sharingan" text="Analyzing Game Tree & Tactical Minimax Horizons..." />
        </div>
      ) : (
        <>
        {needsMeditate && !isAIMove && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-chakra-blue/40 bg-chakra-blue/10 px-3 py-2 text-xs font-mono text-chakra-blue">
            <Zap className="h-4 w-4 shrink-0" />
            Chakra depleted — no jutsu can be cast right now. Meditate to recover chakra.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {abilities.map((ability) => {
            const cd = currentFighter.cooldowns[ability.id] || 0;
            return (
              <AbilityButton
                key={ability.id}
                ability={ability}
                currentChakra={currentFighter.currentChakra}
                cooldownTurnsRemaining={cd}
                disabled={isAIMove || battle.status !== 'ongoing'}
                unlimitedChakra={unlimited}
                healsLeft={getHealsLeft(currentFighter)}
                onClick={() => onExecuteAbility(currentActorKey, ability.id)}
              />
            );
          })}
        </div>
        </>
      )}
    </div>
  );
};
