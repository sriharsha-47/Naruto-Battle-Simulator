import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'rasengan' | 'sharingan';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'sharingan',
  text,
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`relative ${sizeMap[size]} animate-spin [animation-duration:1.5s]`}>
        {variant === 'sharingan' ? (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
            <circle cx="50" cy="50" r="46" fill="#DC2626" stroke="#991B1B" strokeWidth="3" />
            <circle cx="50" cy="50" r="14" fill="#0A0A0A" />
            {/* 3 Tomoe around the ring */}
            <circle cx="50" cy="22" r="7" fill="#0A0A0A" />
            <path d="M50 22 C 55 18, 62 25, 53 31" fill="#0A0A0A" />

            <circle cx="26" cy="65" r="7" fill="#0A0A0A" />
            <path d="M26 65 C 20 68, 22 78, 32 72" fill="#0A0A0A" />

            <circle cx="74" cy="65" r="7" fill="#0A0A0A" />
            <path d="M74 65 C 80 62, 82 72, 72 75" fill="#0A0A0A" />
          </svg>
        ) : (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_12px_rgba(0,191,255,0.8)]">
            <circle cx="50" cy="50" r="46" fill="none" stroke="#00BFFF" strokeWidth="4" strokeDasharray="12 8" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#38BDF8" strokeWidth="3" strokeDasharray="8 6" />
            <circle cx="50" cy="50" r="14" fill="#E0F2FE" />
          </svg>
        )}
      </div>
      {text && (
        <span className="text-xs uppercase tracking-widest text-gray-400 font-mono animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
};
