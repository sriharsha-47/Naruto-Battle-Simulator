import React from 'react';
import { Heart, Shield } from 'lucide-react';

interface HPBarProps {
  currentHp: number;
  maxHp: number;
  shield?: number;
  isFlipped?: boolean;
}

export const HPBar: React.FC<HPBarProps> = ({
  currentHp,
  maxHp,
  shield = 0,
  isFlipped = false,
}) => {
  const percentage = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));

  // Determine health color gradient based on percentage
  const getGradient = () => {
    if (percentage > 50) return 'from-vitality-green via-emerald-400 to-green-500';
    if (percentage > 25) return 'from-yellow-500 via-amber-400 to-orange-500';
    return 'from-sharingan-red via-red-500 to-rose-600 animate-pulse';
  };

  return (
    <div className={`w-full ${isFlipped ? 'text-right' : 'text-left'}`}>
      {/* Label and numbers */}
      <div className={`flex items-center justify-between text-xs font-mono mb-1.5 ${isFlipped ? 'flex-row-reverse' : ''}`}>
        <span className="flex items-center gap-1 font-bold text-gray-300">
          <Heart className="h-3.5 w-3.5 text-sharingan-red fill-sharingan-red" />
          <span>VITALITY</span>
        </span>
        <div className="flex items-center gap-2 font-bold">
          {shield > 0 && (
            <span className="flex items-center gap-1 text-chakra-blue text-[11px]">
              <Shield className="h-3 w-3" /> +{shield}
            </span>
          )}
          <span className="text-white">
            {currentHp} <span className="text-gray-500 font-normal">/ {maxHp}</span>
          </span>
        </div>
      </div>

      {/* Bar container */}
      <div className="relative h-4 w-full rounded-full bg-ninja-border/90 p-[2px] shadow-inner overflow-hidden border border-ninja-border">
        {/* Shield background fill if active */}
        {shield > 0 && (
          <div
            className="absolute inset-0 bg-chakra-blue/30 border-2 border-chakra-blue rounded-full pointer-events-none animate-pulse-slow"
          />
        )}

        {/* Dynamic HP bar */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getGradient()} transition-all duration-500 ease-out shadow-[0_0_12px_rgba(34,197,94,0.3)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
