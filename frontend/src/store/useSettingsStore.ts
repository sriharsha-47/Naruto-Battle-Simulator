import { create } from 'zustand';
import { UserSettings } from '../types/settings';
import { AIStrategy, AIDifficulty, sanitizeStrategy } from '../types/ai';
import { sound } from '../utils/sound';

interface SettingsStore extends UserSettings {
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setAnimationQuality: (quality: 'high' | 'medium' | 'low') => void;
  setReducedMotion: (reduced: boolean) => void;
  setBattleSpeed: (speed: number) => void;
  setDefaultAIStrategy: (strategy: AIStrategy) => void;
  setDefaultDifficulty: (difficulty: AIDifficulty) => void;
  setAutoPlayAIvsAI: (autoPlay: boolean) => void;
  resetDefaults: () => void;
}

const STORAGE_KEY = 'shinobi_settings_v1';

const defaultSettings: UserSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 75,
  animationQuality: 'high',
  reducedMotion: false,
  battleSpeed: 1.0,
  defaultAIStrategy: 'alpha_beta',
  defaultDifficulty: 'medium',
  autoPlayAIvsAI: true,
};

const loadInitialSettings = (): UserSettings => {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const merged = { ...defaultSettings, ...JSON.parse(raw) };
      // a previously saved default may be an algorithm that is no longer offered
      merged.defaultAIStrategy = sanitizeStrategy(merged.defaultAIStrategy, defaultSettings.defaultAIStrategy);
      return merged;
    }
  } catch {
    // Ignore storage parse errors
  }
  return defaultSettings;
};

const saveSettings = (settings: UserSettings) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }
};

const initial = loadInitialSettings();
sound.setMuted(!initial.soundEnabled);

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initial,

  setSoundEnabled: (enabled) => {
    sound.setMuted(!enabled);
    set({ soundEnabled: enabled });
    saveSettings({ ...get(), soundEnabled: enabled });
  },

  setMusicEnabled: (enabled) => {
    set({ musicEnabled: enabled });
    saveSettings({ ...get(), musicEnabled: enabled });
  },

  setVolume: (volume) => {
    set({ volume });
    saveSettings({ ...get(), volume });
  },

  setAnimationQuality: (animationQuality) => {
    set({ animationQuality });
    saveSettings({ ...get(), animationQuality });
  },

  setReducedMotion: (reducedMotion) => {
    set({ reducedMotion });
    saveSettings({ ...get(), reducedMotion });
  },

  setBattleSpeed: (battleSpeed) => {
    set({ battleSpeed });
    saveSettings({ ...get(), battleSpeed });
  },

  setDefaultAIStrategy: (defaultAIStrategy) => {
    set({ defaultAIStrategy });
    saveSettings({ ...get(), defaultAIStrategy });
  },

  setDefaultDifficulty: (defaultDifficulty) => {
    set({ defaultDifficulty });
    saveSettings({ ...get(), defaultDifficulty });
  },

  setAutoPlayAIvsAI: (autoPlayAIvsAI) => {
    set({ autoPlayAIvsAI });
    saveSettings({ ...get(), autoPlayAIvsAI });
  },

  resetDefaults: () => {
    sound.setMuted(!defaultSettings.soundEnabled);
    set({ ...defaultSettings });
    saveSettings(defaultSettings);
  },
}));
