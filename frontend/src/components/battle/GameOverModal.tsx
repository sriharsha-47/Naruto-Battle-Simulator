import React from 'react';
import { BattleOutcome, BattleState } from '../../types/battle';
import { Button } from '../common/Button';
import { CharacterVisual } from '../character/CharacterVisual';
import { Trophy, Skull, RotateCcw, Swords, Brain, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sound } from '../../utils/sound';

interface GameOverModalProps {
  battle: BattleState;
  onRematch: () => void;
  onClose?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  battle,
  onRematch,
  onClose,
}) => {
  const navigate = useNavigate();
  if (battle.status === 'ongoing') return null;

  const isPlayer1Win = battle.status === 'player1_won';
  const isPlayer2Win = battle.status === 'player2_won';
  const isDraw = battle.status === 'draw';

  const winner = isPlayer1Win ? battle.player1 : isPlayer2Win ? battle.player2 : null;
  const loser = isPlayer1Win ? battle.player2 : isPlayer2Win ? battle.player1 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md animate-fade-in" />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-flame-orange/80 bg-ninja-surface p-6 sm:p-7 text-center shadow-2xl shadow-flame-orange/30 animate-float">
        {/* Glowing aura */}
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-flame-orange/20 blur-3xl" />

        {/* Victory/Defeat Banner */}
        {isDraw ? (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-yellow-500/20 p-4 text-yellow-400 mb-3 border border-yellow-500/30">
              <Swords className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-yellow-400">
              Stalemate
            </h2>
            <p className="mt-1 text-xs font-mono text-gray-400">
              Mutual annihilation of chakra and vitality
            </p>
          </div>
        ) : winner ? (
          <div className="flex flex-col items-center">
            <div className="rounded-full bg-flame-orange/20 p-4 text-flame-orange mb-3 border border-flame-orange/30 shadow-glow-orange animate-bounce">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-flame-orange text-glow-orange">
              Shinobi Victorious!
            </h2>
            <p className="mt-1 text-xs font-mono text-gray-300">
              Battle concluded in Round {battle.round} ({battle.turn} turns)
            </p>

            {/* Winner Spotlight */}
            <div className="my-6 flex items-center justify-center gap-4">
              <CharacterVisual character={winner.character} size="lg" />
              <div className="text-left">
                <span className="text-[10px] font-mono font-bold text-flame-orange uppercase">
                  Champion
                </span>
                <h3 className="text-xl font-extrabold text-white">{winner.character.name}</h3>
                <p className="text-xs text-gray-400">{winner.character.title}</p>
                <div className="mt-2 text-xs font-mono text-gray-300">
                  HP Left: <strong className="text-vitality-green">{winner.currentHp}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            variant="primary"
            size="sm" className="w-full"
            glow
            leftIcon={<RotateCcw className="h-4 w-4" />}
            onClick={() => {
              sound.playClick();
              onRematch();
            }}
          >
            Rematch Battle
          </Button>

          <Button
            variant="chakra"
            size="sm" className="w-full"
            leftIcon={<Brain className="h-4 w-4" />}
            onClick={() => {
              sound.playClick();
              navigate('/ai-lab/explainer');
            }}
          >
            Inspect AI Decisions
          </Button>

          {onClose && (
            <Button
              variant="secondary"
              size="sm" className="w-full"
              leftIcon={<Swords className="h-4 w-4" />}
              onClick={() => {
                sound.playClick();
                onClose();
              }}
            >
              View Battlefield
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm" className="w-full"
            leftIcon={<History className="h-4 w-4" />}
            onClick={() => {
              sound.playClick();
              navigate('/history');
            }}
          >
            Match History
          </Button>
        </div>
      </div>
    </div>
  );
};
