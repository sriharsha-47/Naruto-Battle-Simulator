import React from 'react';
import { sound } from '../../utils/sound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'chakra' | 'danger' | 'ghost' | 'leaf';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  onClick,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      sound.playClick();
      onClick?.(e);
    }
  };

  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider uppercase transition-all duration-200 select-none rounded-lg disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-7 py-3.5 gap-3',
    xl: 'text-lg px-8 py-4 gap-3.5 tracking-widest font-black',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-flame-orange to-flame-amber text-black hover:brightness-110 active:scale-[0.98]',
    chakra: 'bg-gradient-to-r from-chakra-blue to-chakra-deep text-black font-extrabold hover:brightness-110 active:scale-[0.98]',
    secondary: 'bg-ninja-card text-gray-200 border border-ninja-border hover:border-flame-orange/50 hover:text-white active:scale-[0.98]',
    danger: 'bg-gradient-to-r from-sharingan-red to-sharingan-crimson text-white hover:brightness-110 active:scale-[0.98]',
    leaf: 'bg-gradient-to-r from-vitality-green to-vitality-heal text-black font-extrabold hover:brightness-110 active:scale-[0.98]',
    ghost: 'bg-transparent text-gray-300 hover:text-flame-orange hover:bg-ninja-card/40 active:scale-[0.98]',
  };

  const glowStyles = glow ? {
    primary: 'shadow-glow-orange',
    chakra: 'shadow-glow-blue',
    secondary: 'hover:shadow-glow-orange',
    danger: 'shadow-glow-red',
    leaf: 'shadow-glow-green',
    ghost: '',
  }[variant] : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${glowStyles} ${className}`}
      disabled={disabled}
      onClick={handleClick}
      {...rest}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
};
