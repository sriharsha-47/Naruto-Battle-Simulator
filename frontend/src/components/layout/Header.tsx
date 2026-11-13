import React from 'react';
import { Volume2, VolumeX, Shield, Swords, Zap } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useBattleStore } from '../../store/useBattleStore';
import { sound } from '../../utils/sound';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const { soundEnabled, setSoundEnabled } = useSettingsStore();
  const { battle } = useBattleStore();
  const navigate = useNavigate();

  const toggleSound = () => {
    sound.playClick();
    setSoundEnabled(!soundEnabled);
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-ninja-border/70 bg-ninja-surface/80 px-6 backdrop-blur-md">
      {/* Left status badge */}
      <div className="flex items-center gap-3">
        {battle && battle.status === 'ongoing' ? (
          <div
            onClick={() => navigate(`/battle/${battle.id}`)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-flame-orange/40 bg-flame-orange/10 px-3 py-1 text-xs font-semibold text-flame-orange hover:bg-flame-orange/20 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-flame-orange opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-flame-orange"></span>
            </span>
            <span>Live Match in Progress: Round {battle.round}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
            <span className="h-2 w-2 rounded-full bg-vitality-green"></span>
            <span>Konoha Tactical Node Ready</span>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Quick action: Battle Arena */}
        <button
          onClick={() => {
            sound.playClick();
            navigate('/battle/setup');
          }}
          className="flex items-center gap-2 rounded-lg bg-flame-orange/15 px-3 py-1.5 text-xs font-bold text-flame-orange hover:bg-flame-orange/25 transition-all"
        >
          <Swords className="h-4 w-4" />
          <span className="hidden sm:inline">Quick Battle</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          className={`rounded-lg p-2 transition-colors ${
            soundEnabled
              ? 'bg-ninja-card text-flame-orange hover:bg-ninja-card/80'
              : 'bg-ninja-card/40 text-gray-500 hover:text-gray-300'
          }`}
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
