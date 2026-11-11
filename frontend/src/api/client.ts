import { Character } from '../types/character';
import { BattleState, BattleConfig, BattleOutcome } from '../types/battle';
import { AIStrategy, AIDecision, GameTreeNode } from '../types/ai';
import { TournamentState } from '../types/tournament';
import { CHARACTERS } from './mockData';
import { computeAIDecision, executeBattleAction, generateInteractiveGameTree } from '../utils/aiEngine';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

// In-memory local stores for fallback / offline simulation
const localBattles: Record<string, BattleState> = {};
const localHistory: BattleState[] = [];

// Helper safe fetch
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Characters
  async fetchCharacters(): Promise<Character[]> {
    try {
      return await apiFetch<Character[]>('/api/characters');
    } catch {
      return CHARACTERS;
    }
  },

  async fetchCharacter(id: string): Promise<Character> {
    try {
      return await apiFetch<Character>(`/api/characters/${id}`);
    } catch {
      const char = CHARACTERS.find((c) => c.id === id);
      if (!char) throw new Error(`Character ${id} not found`);
      return char;
    }
  },

  // Battle
  async startBattle(config: BattleConfig): Promise<BattleState> {
    try {
      return await apiFetch<BattleState>('/api/battle/start', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    } catch {
      // Local fallback creation
      const char1 = CHARACTERS.find((c) => c.id === config.player1CharacterId) || CHARACTERS[0];
      const char2 = CHARACTERS.find((c) => c.id === config.player2CharacterId) || CHARACTERS[1];

      const battleId = `battle-${Date.now()}`;
      const newBattle: BattleState = {
        id: battleId,
        mode: config.mode,
        round: 1,
        turn: 1,
        currentTurn: 'player1',
        createdAt: new Date().toISOString(),
        player1: {
          character: JSON.parse(JSON.stringify(char1)),
          currentHp: char1.stats.hp,
          maxHp: char1.stats.maxHp,
          currentChakra: char1.stats.chakra,
          maxChakra: char1.stats.maxChakra,
          shield: 0,
          statusEffects: [],
          cooldowns: {},
          isAI: !!config.player1IsAI,
          aiStrategy: config.player1Strategy || 'minimax',
          aiDifficulty: config.difficulty || 'medium',
        },
        player2: {
          character: JSON.parse(JSON.stringify(char2)),
          currentHp: char2.stats.hp,
          maxHp: char2.stats.maxHp,
          currentChakra: char2.stats.chakra,
          maxChakra: char2.stats.maxChakra,
          shield: 0,
          statusEffects: [],
          cooldowns: {},
          isAI: config.mode !== 'pvp',
          aiStrategy: config.player2Strategy || 'minimax',
          aiDifficulty: config.difficulty || 'hard',
        },
        status: 'ongoing',
        logs: [
          {
            id: `init-${Date.now()}`,
            round: 1,
            turn: 1,
            actor: 'player1',
            actorName: 'Referee',
            actionName: 'Battle Commenced',
            text: `The shinobi showdown begins! ${char1.name} vs ${char2.name}.`,
            type: 'system',
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
      };

      localBattles[battleId] = newBattle;
      localHistory.unshift(newBattle);
      return newBattle;
    }
  },

  async getBattleState(battleId: string): Promise<BattleState> {
    try {
      return await apiFetch<BattleState>(`/api/battle/${battleId}`);
    } catch {
      const battle = localBattles[battleId];
      if (!battle) throw new Error(`Battle ${battleId} not found`);
      return battle;
    }
  },

  async submitAction(battleId: string, action: { actor: 'player1' | 'player2'; abilityId: string }): Promise<BattleState> {
    try {
      return await apiFetch<BattleState>(`/api/battle/${battleId}/action`, {
        method: 'POST',
        body: JSON.stringify(action),
      });
    } catch {
      let battle = localBattles[battleId];
      if (!battle) throw new Error(`Battle ${battleId} not found`);

      const { nextBattle } = executeBattleAction(battle, action.actor, action.abilityId);
      localBattles[battleId] = nextBattle;

      // Update history
      const idx = localHistory.findIndex((b) => b.id === battleId);
      if (idx !== -1) {
        localHistory[idx] = nextBattle;
      }
      return nextBattle;
    }
  },

  async getAIMove(battleId: string, strategy: AIStrategy = 'minimax', depth: number = 3): Promise<AIDecision> {
    try {
      return await apiFetch<AIDecision>(`/api/battle/${battleId}/ai-move`, {
        method: 'POST',
        body: JSON.stringify({ strategy, depth }),
      });
    } catch {
      const battle = localBattles[battleId];
      if (!battle) throw new Error(`Battle ${battleId} not found`);
      return computeAIDecision(battle, battle.currentTurn, strategy, depth);
    }
  },

  // AI Decision Explainer
  async getAIExplanation(battleState: BattleState, strategy: AIStrategy = 'minimax'): Promise<AIDecision> {
    try {
      return await apiFetch<AIDecision>('/api/ai/explain', {
        method: 'POST',
        body: JSON.stringify({ battleState, strategy }),
      });
    } catch {
      return computeAIDecision(battleState, battleState.currentTurn, strategy, 3);
    }
  },

  // Game Tree Visualizer
  async getGameTree(battleState: BattleState, strategy: AIStrategy = 'alpha_beta', depth: number = 3): Promise<GameTreeNode> {
    try {
      return await apiFetch<GameTreeNode>('/api/ai/game-tree', {
        method: 'POST',
        body: JSON.stringify({ battleState, strategy, depth }),
      });
    } catch {
      return generateInteractiveGameTree(battleState, strategy, depth);
    }
  },

  // Tournament
  async startTournament(config: { title?: string; size?: 8 }): Promise<TournamentState> {
    try {
      return await apiFetch<TournamentState>('/api/tournament/start', {
        method: 'POST',
        body: JSON.stringify(config),
      });
    } catch {
      const contenders = CHARACTERS.slice(0, 8).map((c, i) => ({
        id: `contender-${c.id}`,
        name: c.name,
        characterId: c.id,
        strategy: (['minimax', 'alpha_beta', 'greedy', 'mcts', 'q_learning', 'expectiminimax', 'random', 'alpha_beta'][i] || 'minimax') as AIStrategy,
        avatarSymbol: c.symbol,
        wins: 0,
        losses: 0,
        damageDealt: 0,
      }));

      const matches = [
        { id: 'match-1', roundNumber: 1, matchIndex: 0, contender1: contenders[0], contender2: contenders[1], status: 'pending' as const },
        { id: 'match-2', roundNumber: 1, matchIndex: 1, contender1: contenders[2], contender2: contenders[3], status: 'pending' as const },
        { id: 'match-3', roundNumber: 1, matchIndex: 2, contender1: contenders[4], contender2: contenders[5], status: 'pending' as const },
        { id: 'match-4', roundNumber: 1, matchIndex: 3, contender1: contenders[6], contender2: contenders[7], status: 'pending' as const },
      ];

      return {
        id: `tourney-${Date.now()}`,
        title: config.title || 'Grand Chūnin Exam Invitational',
        size: 8,
        status: 'setup',
        currentMatchIndex: 0,
        matches,
      };
    }
  },

  async getTournamentStatus(tournamentId: string): Promise<TournamentState> {
    try {
      return await apiFetch<TournamentState>(`/api/tournament/${tournamentId}`);
    } catch {
      // Local fallback
      return this.startTournament({ title: 'Grand Shinobi Championship' });
    }
  },

  // Analytics
  async getAnalytics() {
    try {
      return await apiFetch('/api/analytics');
    } catch {
      return {
        totalBattles: 1420,
        overallWinRate: 58.4,
        fastestVictoryRounds: 4,
        mostPopularCharacter: 'Naruto Uzumaki',
        topStrategy: 'Alpha-Beta Pruning',
        totalTurnsSimulated: 18450,
      };
    }
  },

  async getAIComparison() {
    try {
      return await apiFetch('/api/analytics/ai-comparison');
    } catch {
      return [
        { strategy: 'Alpha-Beta', winRate: 74, avgTimeMs: 42, avgNodes: 480, battlesCount: 320, avgDamagePerTurn: 220 },
        { strategy: 'Minimax', winRate: 71, avgTimeMs: 145, avgNodes: 1250, battlesCount: 290, avgDamagePerTurn: 215 },
        { strategy: 'MCTS', winRate: 68, avgTimeMs: 88, avgNodes: 640, battlesCount: 250, avgDamagePerTurn: 198 },
        { strategy: 'Q-Learning', winRate: 65, avgTimeMs: 18, avgNodes: 85, battlesCount: 280, avgDamagePerTurn: 190 },
        { strategy: 'Expectiminimax', winRate: 66, avgTimeMs: 95, avgNodes: 720, battlesCount: 210, avgDamagePerTurn: 195 },
        { strategy: 'Greedy', winRate: 52, avgTimeMs: 8, avgNodes: 24, battlesCount: 380, avgDamagePerTurn: 175 },
        { strategy: 'Random', winRate: 21, avgTimeMs: 2, avgNodes: 4, battlesCount: 420, avgDamagePerTurn: 110 },
      ];
    }
  },

  // Battle History
  async getBattleHistory(filters?: { character?: string; winner?: string }) {
    try {
      return await apiFetch<BattleState[]>('/api/history', {
        headers: { 'X-Filters': JSON.stringify(filters || {}) },
      });
    } catch {
      // Return local history populated with realistic sample battles
      if (localHistory.length === 0) {
        // Pre-fill history with memorable matches
        const b1: BattleState = {
          id: 'hist-101',
          mode: 'pve',
          round: 6,
          turn: 11,
          currentTurn: 'player1',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          player1: {
            character: CHARACTERS[0],
            currentHp: 420,
            maxHp: 1300,
            currentChakra: 180,
            maxChakra: 1200,
            shield: 0,
            statusEffects: [],
            cooldowns: {},
            isAI: false,
          },
          player2: {
            character: CHARACTERS[1],
            currentHp: 0,
            maxHp: 1100,
            currentChakra: 90,
            maxChakra: 1050,
            shield: 0,
            statusEffects: [],
            cooldowns: {},
            isAI: true,
            aiStrategy: 'alpha_beta',
          },
          status: 'player1_won',
          winner: 'player1',
          logs: [
            {
              id: 'l1',
              round: 6,
              turn: 11,
              actor: 'player1',
              actorName: 'Naruto Uzumaki',
              actionName: 'Super Bijuu Rasenshuriken',
              text: 'Naruto Uzumaki unleashed Super Bijuu Rasenshuriken dealing 510 critical damage and finished Sasuke!',
              type: 'ultimate',
              damage: 510,
              timestamp: '14:22',
            },
          ],
        };

        const b2: BattleState = {
          id: 'hist-102',
          mode: 'ai_vs_ai',
          round: 8,
          turn: 16,
          currentTurn: 'player2',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          player1: {
            character: CHARACTERS[4], // Itachi
            currentHp: 0,
            maxHp: 980,
            currentChakra: 210,
            maxChakra: 1250,
            shield: 0,
            statusEffects: [],
            cooldowns: {},
            isAI: true,
            aiStrategy: 'minimax',
          },
          player2: {
            character: CHARACTERS[8], // Madara
            currentHp: 580,
            maxHp: 1350,
            currentChakra: 340,
            maxChakra: 1400,
            shield: 120,
            statusEffects: [],
            cooldowns: {},
            isAI: true,
            aiStrategy: 'alpha_beta',
          },
          status: 'player2_won',
          winner: 'player2',
          logs: [
            {
              id: 'l2',
              round: 8,
              turn: 16,
              actor: 'player2',
              actorName: 'Madara Uchiha',
              actionName: 'Heaven Concealed: Shattered Heavens',
              text: 'Madara summoned dual meteors, obliterating Itachi’s defense for 590 damage.',
              type: 'ultimate',
              damage: 590,
              timestamp: '11:15',
            },
          ],
        };

        const b3: BattleState = {
          id: 'hist-103',
          mode: 'pvp',
          round: 5,
          turn: 9,
          currentTurn: 'player1',
          createdAt: new Date(Date.now() - 3600000 * 9).toISOString(),
          player1: {
            character: CHARACTERS[9], // Minato
            currentHp: 650,
            maxHp: 1080,
            currentChakra: 450,
            maxChakra: 1180,
            shield: 0,
            statusEffects: [],
            cooldowns: {},
            isAI: false,
          },
          player2: {
            character: CHARACTERS[6], // Rock Lee
            currentHp: 0,
            maxHp: 1180,
            currentChakra: 120,
            maxChakra: 850,
            shield: 0,
            statusEffects: [],
            cooldowns: {},
            isAI: false,
          },
          status: 'player1_won',
          winner: 'player1',
          logs: [],
        };

        localHistory.push(b1, b2, b3);
      }
      return localHistory;
    }
  },

  async getBattleDetail(id: string): Promise<BattleState> {
    try {
      return await apiFetch<BattleState>(`/api/history/${id}`);
    } catch {
      const historyItem = localHistory.find((b) => b.id === id) || localBattles[id];
      if (!historyItem) throw new Error(`Battle record ${id} not found`);
      return historyItem;
    }
  },
};
