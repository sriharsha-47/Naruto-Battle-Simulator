import React from 'react';

interface GlowingCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'orange' | 'blue' | 'purple' | 'red' | 'green' | 'none';
  interactive?: boolean;
  onClick?: () => void;
}

export const GlowingCard: React.FC<GlowingCardProps> = ({
  children,
  className = '',
  glowColor = 'orange',
  interactive = false,
  onClick,
}) => {
  const glowMap = {
    orange: 'hover:border-flame-orange/60 hover:shadow-glow-orange',
    blue: 'hover:border-chakra-blue/60 hover:shadow-glow-blue',
    purple: 'hover:border-curse-purple/60 hover:shadow-glow-purple',
    red: 'hover:border-sharingan-red/60 hover:shadow-glow-red',
    green: 'hover:border-vitality-green/60 hover:shadow-glow-green',
    none: '',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-ninja-border/80 bg-ninja-panel p-5 backdrop-blur-md transition-all duration-300 ${
        interactive ? `cursor-pointer hover:-translate-y-1 ${glowMap[glowColor]}` : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
