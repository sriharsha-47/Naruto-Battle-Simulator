import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DamagePopupEvent } from '../../types/battle';

interface DamagePopupProps {
  popups: DamagePopupEvent[];
  onComplete: (id: string) => void;
  targetSide: 'player1' | 'player2';
}

export const DamagePopup: React.FC<DamagePopupProps> = ({
  popups,
  onComplete,
  targetSide,
}) => {
  const filtered = popups.filter((p) => p.target === targetSide);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <AnimatePresence>
        {filtered.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10, scale: 0.7 }}
            animate={{ opacity: 1, y: -65, scale: item.type === 'critical' ? 1.4 : 1.1 }}
            exit={{ opacity: 0, y: -90, scale: 0.8 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            onAnimationComplete={() => onComplete(item.id)}
            className="absolute flex flex-col items-center select-none"
          >
            {item.type === 'critical' && (
              <span className="text-xs font-black tracking-widest text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] animate-pulse">
                CRITICAL!
              </span>
            )}
            <span
              className={`font-black text-2xl sm:text-3xl tracking-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] ${
                item.type === 'critical'
                  ? 'text-yellow-400 text-glow-orange'
                  : item.type === 'heal'
                  ? 'text-vitality-green drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]'
                  : item.type === 'shield' || item.type === 'chakra'
                  ? 'text-chakra-blue drop-shadow-[0_0_12px_rgba(0,191,255,0.8)]'
                  : 'text-sharingan-red text-glow-red'
              }`}
            >
              {item.type === 'heal' || item.type === 'shield' || item.type === 'chakra' ? `+${item.amount}` : `-${item.amount}`}
            </span>
            {item.text && item.type !== 'critical' && (
              <span className="text-[10px] font-mono text-gray-300 drop-shadow-md">
                {item.text}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
