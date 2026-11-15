import { useSettingsStore } from '../store/useSettingsStore';

/** Current playback multiplier from Settings (0.5x - 3x). */
export const getBattleSpeed = (): number => {
  const s = useSettingsStore.getState().battleSpeed;
  return Number.isFinite(s) && s > 0 ? s : 1;
};

/**
 * Scale a base delay (ms) by the playback speed. 2x halves the wait, 3x divides it by 3.
 * A tiny floor keeps timers from firing in the same tick.
 */
export const scaleDelay = (ms: number): number => Math.max(30, Math.round(ms / getBattleSpeed()));

/** Same as scaleDelay but for animation durations expressed in seconds. */
export const scaleSeconds = (sec: number, speed: number = getBattleSpeed()): number =>
  Math.max(0.05, sec / (speed > 0 ? speed : 1));
