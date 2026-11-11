import { create } from 'zustand';
import { BattleState, BattleConfig, DamagePopupEvent, BattleOutcome } from '../types/battle';
import { AIDecision, AIStrategy } from '../types/ai';
import { api } from '../api/client';
import { sound } from '../utils/sound';
import { executeBattleAction, computeAIDecision } from '../utils/aiEngine';

interface BattleStore {
  battle: BattleState | null;
  isLoading: boolean;
  isAIThinking: boolean;
  error: string | null;
  damagePopups: DamagePopupEvent[];
  shakeScreen: boolean;
  flashScreen: boolean;
  lastDecision: AIDecision | null;

  startBattle: (config: BattleConfig) => Promise<BattleState>;
  loadBattle: (id: string) => Promise<void>;
  performAction: (actor: 'player1' | 'player2', abilityId: string) => Promise<void>;
  performAIMove: () => Promise<void>;
  clearPopups: (idToRemove?: string) => void;
  triggerScreenShake: () => void;
  triggerFlash: () => void;
  resetBattle: () => void;
}

export const useBattleStore = create<BattleStore>((set, get) => ({
  battle: null,
  isLoading: false,
  isAIThinking: false,
  error: null,
  damagePopups: [],
  shakeScreen: false,
  flashScreen: false,
  lastDecision: null,

  startBattle: async (config: BattleConfig) => {
    set({ isLoading: true, error: null, damagePopups: [] });
    try {
      const newBattle = await api.startBattle(config);
      set({ battle: newBattle, isLoading: false, lastDecision: null });

      // If Player 1 is AI, trigger first move
      if (newBattle.player1.isAI && newBattle.currentTurn === 'player1') {
        setTimeout(() => {
          get().performAIMove();
        }, 700);
      }

      return newBattle;
    } catch (err: unknown) {
      set({ error: (err as Error).message, isLoading: false });
      throw err;
    }
  },

  loadBattle: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const state = await api.getBattleState(id);
      set({ battle: state, isLoading: false });
    } catch (err: unknown) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  performAction: async (actor: 'player1' | 'player2', abilityId: string) => {
    const { battle, triggerScreenShake, triggerFlash } = get();
    if (!battle || battle.status !== 'ongoing') return;
    if (battle.currentTurn !== actor) return;

    // Local resolution for instant responsiveness
    const currentFighter = actor === 'player1' ? battle.player1 : battle.player2;
    const ability = currentFighter.character.abilities.find((a) => a.id === abilityId);

    // Audio cue
    if (ability) {
      if (ability.type === 'ultimate') {
        sound.playUltimate();
        triggerFlash();
        triggerScreenShake();
      } else if (ability.heal) {
        sound.playHeal();
      } else if (ability.shield && !ability.damage) {
        sound.playShield();
      } else {
        sound.playHit(false);
      }
    }

    const { nextBattle, damageEvent } = executeBattleAction(battle, actor, abilityId);

    if (damageEvent.amount > 0 || damageEvent.text) {
      set((state) => ({
        damagePopups: [...state.damagePopups, damageEvent],
      }));
    }

    // Check game over
    if (nextBattle.status !== 'ongoing') {
      sound.playVictory();
    }

    set({ battle: nextBattle });

    // Check if subsequent turn belongs to AI
    const nextFighter = nextBattle.currentTurn === 'player1' ? nextBattle.player1 : nextBattle.player2;
    if (nextBattle.status === 'ongoing' && nextFighter.isAI) {
      setTimeout(() => {
        get().performAIMove();
      }, 750);
    }
  },

  performAIMove: async () => {
    const { battle, performAction } = get();
    if (!battle || battle.status !== 'ongoing') return;

    const currentFighter = battle.currentTurn === 'player1' ? battle.player1 : battle.player2;
    if (!currentFighter.isAI) return;

    set({ isAIThinking: true });

    try {
      const strategy: AIStrategy = currentFighter.aiStrategy || 'minimax';
      const decision = computeAIDecision(battle, battle.currentTurn, strategy, 3);

      set({ lastDecision: decision, isAIThinking: false });

      // Execute chosen action
      await performAction(battle.currentTurn, decision.chosenAbilityId);
    } catch (err: unknown) {
      set({ isAIThinking: false, error: (err as Error).message });
    }
  },

  clearPopups: (idToRemove?: string) => {
    if (idToRemove) {
      set((state) => ({
        damagePopups: state.damagePopups.filter((p) => p.id !== idToRemove),
      }));
    } else {
      set({ damagePopups: [] });
    }
  },

  triggerScreenShake: () => {
    set({ shakeScreen: true });
    setTimeout(() => set({ shakeScreen: false }), 450);
  },

  triggerFlash: () => {
    set({ flashScreen: true });
    setTimeout(() => set({ flashScreen: false }), 300);
  },

  resetBattle: () => {
    set({
      battle: null,
      damagePopups: [],
      lastDecision: null,
      shakeScreen: false,
      flashScreen: false,
      error: null,
    });
  },
}));
