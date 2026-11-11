import React, { useRef, useEffect } from 'react';
import { BattleLogEntry } from '../../types/battle';
import { Scroll, Sparkles, Flame, Heart, Shield, Terminal } from 'lucide-react';

interface BattleLogProps {
  logs: BattleLogEntry[];
}

export const BattleLog: React.FC<BattleLogProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogIcon = (type: BattleLogEntry['type']) => {
    switch (type) {
      case 'ultimate':
        return <Sparkles className="h-3.5 w-3.5 text-flame-orange shrink-0" />;
      case 'critical':
      case 'attack':
        return <Flame className="h-3.5 w-3.5 text-sharingan-red shrink-0" />;
      case 'heal':
        return <Heart className="h-3.5 w-3.5 text-vitality-green shrink-0" />;
      case 'shield':
        return <Shield className="h-3.5 w-3.5 text-chakra-blue shrink-0" />;
      default:
        return <Terminal className="h-3.5 w-3.5 text-gray-400 shrink-0" />;
    }
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ninja-border/70 px-4 py-3 bg-ninja-surface/60">
        <div className="flex items-center gap-2">
          <Scroll className="h-4 w-4 text-flame-orange" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Shinobi Combat Scroll
          </span>
        </div>
        <span className="text-[10px] font-mono text-gray-400">{logs.length} Entries</span>
      </div>

      {/* Log items container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
        {logs.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-gray-500 italic">
            Waiting for combat engagement...
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2.5 rounded-lg border p-2 transition-all ${
                log.type === 'ultimate'
                  ? 'border-flame-orange/40 bg-flame-orange/10'
                  : log.type === 'critical'
                  ? 'border-yellow-500/40 bg-yellow-500/10'
                  : log.actor === 'player1'
                  ? 'border-flame-orange/20 bg-ninja-card/70'
                  : 'border-chakra-blue/20 bg-ninja-card/70'
              }`}
            >
              {getLogIcon(log.type)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`font-bold ${
                      log.actor === 'player1' ? 'text-flame-orange' : 'text-chakra-blue'
                    }`}
                  >
                    {log.actorName}
                  </span>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    R{log.round} • {log.timestamp}
                  </span>
                </div>
                <p className="mt-1 text-gray-200 text-[11px] leading-relaxed">{log.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
