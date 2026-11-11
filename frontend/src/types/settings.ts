import { AIStrategy, AIDifficulty } from './ai';

export interface UserSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0 to 100
  animationQuality: 'high' | 'medium' | 'low';
  reducedMotion: boolean;
  battleSpeed: number; // 0.5x, 1x, 1.5x, 2x, 3x (represented as multiplier 0.5 - 3.0)
  defaultAIStrategy: AIStrategy;
  defaultDifficulty: AIDifficulty;
  autoPlayAIvsAI: boolean;
}
