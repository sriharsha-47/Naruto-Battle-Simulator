import React from 'react';
import { Zap } from 'lucide-react';

interface ChakraBarProps {
  currentChakra: number;
  maxChakra: number;
  isFlipped?: boolean;
  unlimited?: boolean; // Training Dojo
}

export const ChakraBar: React.FC<ChakraBarProps> = ({
  currentChakra,
  maxChakra,
  isFlipped = false,
  unlimited = false,
}) => {
  const percentage = unlimited ? 100 : Math.max(0, Math.min(100, (currentChakra / maxChakra) * 100));

  return (
    <div className={`w-full ${isFlipped ? 'text-right' : 'text-left'}`}>
      <div className={`flex items-center justify-between text-xs font-mono mb-1 ${isFlipped ? 'flex-row-reverse' : ''}`}>
        <span className="flex items-center gap-1 font-bold text-chakra-blue">
          <Zap className="h-3.5 w-3.5 fill-chakra-blue" />
          <span>CHAKRA</span>
        </span>
        <span className="font-bold text-white">
          {unlimited ? (
            <>∞ <span className="text-gray-500 font-normal">UNLIMITED</span></>
          ) : (
            <>{currentChakra} <span className="text-gray-500 font-normal">/ {maxChakra}</span></>
          )}
        </span>
      </div>

      <div className="relative h-2.5 w-full rounded-full bg-ninja-border/90 p-[1.5px] shadow-inner overflow-hidden border border-ninja-border">
        <div
          className="h-full rounded-full bg-gradient-to-r from-chakra-deep via-chakra-blue to-cyan-300 transition-all duration-400 ease-out shadow-[0_0_10px_rgba(0,191,255,0.6)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
