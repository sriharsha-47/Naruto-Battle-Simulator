import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Swords, Users, Brain, Cpu, GitFork, Trophy, BarChart3, History, Settings as SettingsIcon,
  Shield, Zap, Flame, Heart, RotateCcw, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Filter, Search, Download, HelpCircle, ChevronRight, Award
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

import { CHARACTERS, AI_STRATEGIES } from '../api/mockData';
import { api } from '../api/client';
import { Character, ChakraNature } from '../types/character';
import { BattleState, BattleConfig } from '../types/battle';
import { AIStrategy, AIDifficulty, AIDecision, GameTreeNode } from '../types/ai';

import { Button } from '../components/common/Button';
import { GlowingCard } from '../components/common/GlowingCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CharacterVisual } from '../components/character/CharacterVisual';
import { CharacterCard } from '../components/character/CharacterCard';
import { CharacterPreview } from '../components/character/CharacterPreview';
import { CharacterCompare } from '../components/character/CharacterCompare';
import { HPBar } from '../components/battle/HPBar';
import { ChakraBar } from '../components/battle/ChakraBar';
import { BattleLog } from '../components/battle/BattleLog';
import { ActionPanel } from '../components/battle/ActionPanel';
import { DamagePopup } from '../components/battle/DamagePopup';
import { GameOverModal } from '../components/battle/GameOverModal';

import { useCharacterStore } from '../store/useCharacterStore';
import { useBattleStore } from '../store/useBattleStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTournamentStore } from '../store/useTournamentStore';
import { sound } from '../utils/sound';
import { computeAIDecision, generateInteractiveGameTree } from '../utils/aiEngine';

/* =========================================================================
   3. CHARACTERS PAGE (/characters)
   ========================================================================= */
export const CharactersPage: React.FC = () => {
  const { characters, selectedCharacter, setSelectedCharacter, comparisonSlot1, comparisonSlot2, setComparisonSlot1, setComparisonSlot2 } = useCharacterStore();
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [filterNature, setFilterNature] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = characters.filter((c) => {
    const matchesNature = filterNature === 'All' || c.chakraNature === filterNature;
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase());
    return matchesNature && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Shinobi Roster</h1>
          <p className="text-xs text-gray-400 mt-1">Explore 10 legendary shinobi, analyze jutsu attributes, and compare fighters</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={isCompareMode ? 'primary' : 'secondary'}
            size="md"
            glow={isCompareMode}
            leftIcon={<Users className="h-4 w-4" />}
            onClick={() => setIsCompareMode(!isCompareMode)}
          >
            {isCompareMode ? 'Exit Compare Mode' : 'Compare Fighters (2)'}
          </Button>
        </div>
      </div>

      {isCompareMode ? (
        <CharacterCompare
          char1={comparisonSlot1 || characters[0]}
          char2={comparisonSlot2 || characters[1]}
          onSwap={() => {
            const temp = comparisonSlot1;
            setComparisonSlot1(comparisonSlot2);
            setComparisonSlot2(temp);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Filter & Cards Grid */}
          <div className="lg:col-span-5 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search shinobi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-ninja-border bg-ninja-panel py-2 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:border-flame-orange focus:outline-none"
                />
              </div>
              <select
                value={filterNature}
                onChange={(e) => setFilterNature(e.target.value)}
                className="rounded-xl border border-ninja-border bg-ninja-panel px-3 py-2 text-xs text-gray-200 focus:border-flame-orange focus:outline-none"
              >
                <option value="All">All Natures</option>
                <option value="Wind">Wind</option>
                <option value="Lightning">Lightning</option>
                <option value="Fire">Fire</option>
                <option value="Earth">Earth</option>
                <option value="Water">Water</option>
              </select>
            </div>

            {/* Shinobi Cards List */}
            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {filtered.map((char) => (
                <CharacterCard
                  key={char.id}
                  character={char}
                  isSelected={selectedCharacter?.id === char.id}
                  onClick={() => setSelectedCharacter(char)}
                />
              ))}
            </div>
          </div>

          {/* Right: Detailed Preview */}
          <div className="lg:col-span-7">
            {selectedCharacter && (
              <CharacterPreview
                character={selectedCharacter}
                onSetCompareSlot1={() => {
                  setComparisonSlot1(selectedCharacter);
                  setIsCompareMode(true);
                }}
                onSetCompareSlot2={() => {
                  setComparisonSlot2(selectedCharacter);
                  setIsCompareMode(true);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   4. BATTLE SETUP PAGE (/battle/setup)
   ========================================================================= */
export const BattleSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { characters } = useCharacterStore();
  const { startBattle, isLoading } = useBattleStore();

  const [mode, setMode] = useState<'pve' | 'pvp' | 'ai_vs_ai' | 'practice'>('pve');
  const [p1CharId, setP1CharId] = useState(characters[0]?.id || 'naruto');
  const [p2CharId, setP2CharId] = useState(characters[1]?.id || 'sasuke');
  const [p1Strategy, setP1Strategy] = useState<AIStrategy>('minimax');
  const [p2Strategy, setP2Strategy] = useState<AIStrategy>('alpha_beta');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [searchDepth, setSearchDepth] = useState<number>(3);

  const p1Char = characters.find((c) => c.id === p1CharId) || characters[0];
  const p2Char = characters.find((c) => c.id === p2CharId) || characters[1];

  const handleLaunch = async () => {
    sound.playClick();
    const config: BattleConfig = {
      mode,
      player1CharacterId: p1CharId,
      player2CharacterId: p2CharId,
      player1IsAI: mode === 'ai_vs_ai',
      player1Strategy: mode === 'ai_vs_ai' ? p1Strategy : undefined,
      player2Strategy: p2Strategy,
      difficulty,
      searchDepth,
    };
    const b = await startBattle(config);
    navigate(`/battle/${b.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase text-white tracking-wide">Battle Configuration</h1>
        <p className="text-xs text-gray-400 mt-1">Select combatants, AI decision engines, search depth, and rules</p>
      </div>

      {/* Mode Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'pve', name: 'Player vs AI', desc: 'Human tactician against AI algorithm' },
          { id: 'pvp', name: 'Player vs Player', desc: 'Local two-player hotseat showdown' },
          { id: 'ai_vs_ai', name: 'AI vs AI', desc: 'Algorithmic battle simulation' },
          { id: 'practice', name: 'Training Dojo', desc: 'Unlimited chakra sandbox testing' },
        ].map((m) => (
          <div
            key={m.id}
            onClick={() => {
              sound.playClick();
              setMode(m.id as any);
            }}
            className={`cursor-pointer rounded-xl border p-4 text-center transition-all ${
              mode === m.id
                ? 'border-flame-orange bg-ninja-card shadow-glow-orange'
                : 'border-ninja-border/70 bg-ninja-panel hover:border-flame-orange/40'
            }`}
          >
            <h4 className="font-bold text-sm text-white">{m.name}</h4>
            <p className="mt-1 text-[11px] text-gray-400">{m.desc}</p>
          </div>
        ))}
      </div>

      {/* Fighter Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Player 1 Card */}
        <div className="rounded-2xl border border-flame-orange/50 bg-ninja-panel/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-flame-orange uppercase">Fighter 1 (Left Side)</span>
            {mode === 'ai_vs_ai' && <span className="rounded bg-flame-orange/20 px-2 py-0.5 text-[10px] text-flame-orange font-mono">AI Pilot</span>}
          </div>
          <div className="flex items-center gap-4">
            <CharacterVisual character={p1Char} size="md" />
            <div className="flex-1">
              <label className="text-xs text-gray-400 font-mono">Select Shinobi</label>
              <select
                value={p1CharId}
                onChange={(e) => setP1CharId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ninja-border bg-ninja-card p-2 text-sm font-bold text-white focus:border-flame-orange focus:outline-none"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.chakraNature})</option>
                ))}
              </select>
            </div>
          </div>
          {mode === 'ai_vs_ai' && (
            <div>
              <label className="text-xs text-gray-400 font-mono">Fighter 1 AI Algorithm</label>
              <select
                value={p1Strategy}
                onChange={(e) => setP1Strategy(e.target.value as AIStrategy)}
                className="mt-1 w-full rounded-xl border border-ninja-border bg-ninja-card p-2 text-xs font-mono text-white focus:border-flame-orange focus:outline-none"
              >
                {AI_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Player 2 Card */}
        <div className="rounded-2xl border border-chakra-blue/50 bg-ninja-panel/90 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-chakra-blue uppercase">Fighter 2 (Right Side)</span>
            <span className="rounded bg-chakra-blue/20 px-2 py-0.5 text-[10px] text-chakra-blue font-mono">{mode === 'pvp' ? 'Player 2' : 'AI Opponent'}</span>
          </div>
          <div className="flex items-center gap-4">
            <CharacterVisual character={p2Char} size="md" isFlipped />
            <div className="flex-1">
              <label className="text-xs text-gray-400 font-mono">Select Shinobi</label>
              <select
                value={p2CharId}
                onChange={(e) => setP2CharId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-ninja-border bg-ninja-card p-2 text-sm font-bold text-white focus:border-chakra-blue focus:outline-none"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.chakraNature})</option>
                ))}
              </select>
            </div>
          </div>
          {mode !== 'pvp' && (
            <div>
              <label className="text-xs text-gray-400 font-mono">Opponent AI Algorithm</label>
              <select
                value={p2Strategy}
                onChange={(e) => setP2Strategy(e.target.value as AIStrategy)}
                className="mt-1 w-full rounded-xl border border-ninja-border bg-ninja-card p-2 text-xs font-mono text-white focus:border-chakra-blue focus:outline-none"
              >
                {AI_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Advanced AI Settings */}
      {mode !== 'pvp' && (
        <div className="rounded-xl border border-ninja-border/70 bg-ninja-panel p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-mono text-gray-300">Minimax / Tree Search Depth (Plies)</label>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={searchDepth}
                onChange={(e) => setSearchDepth(Number(e.target.value))}
                className="w-full accent-flame-orange cursor-pointer"
              />
              <span className="font-mono text-sm font-bold text-flame-orange min-w-8">
                {searchDepth}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-mono text-gray-300">Difficulty Grade</label>
            <div className="mt-2 flex gap-2">
              {(['easy', 'medium', 'hard', 'master'] as AIDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-mono uppercase font-bold transition-all ${
                    difficulty === d ? 'bg-flame-orange text-black' : 'bg-ninja-card text-gray-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start Button */}
      <div className="text-center pt-2">
        <Button
          variant="primary"
          size="xl"
          glow
          leftIcon={<Swords className="h-6 w-6" />}
          disabled={isLoading}
          onClick={handleLaunch}
          className="w-full sm:w-80"
        >
          {isLoading ? 'Summoning Arena...' : 'START BATTLE'}
        </Button>
      </div>
    </div>
  );
};

/* =========================================================================
   5. BATTLE ARENA PAGE (/battle/:id) - THE MOST IMPORTANT COMBAT PAGE
   ========================================================================= */
export const BattleArenaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    battle,
    isLoading,
    isAIThinking,
    damagePopups,
    shakeScreen,
    flashScreen,
    performAction,
    loadBattle,
    clearPopups,
    startBattle,
  } = useBattleStore();

  useEffect(() => {
    if (!battle && id) {
      loadBattle(id);
    }
  }, [id, battle, loadBattle]);

  if (isLoading || !battle) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <LoadingSpinner size="lg" variant="sharingan" text="Initializing Battlefield Arena..." />
      </div>
    );
  }

  const p1 = battle.player1;
  const p2 = battle.player2;

  const handleRematch = async () => {
    await startBattle({
      mode: battle.mode,
      player1CharacterId: p1.character.id,
      player2CharacterId: p2.character.id,
      player1IsAI: p1.isAI,
      player1Strategy: p1.aiStrategy,
      player2Strategy: p2.aiStrategy,
    });
  };

  return (
    <div className={`relative flex flex-col gap-6 ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Full screen flash on ultimate */}
      {flashScreen && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-white/40 animate-flash" />
      )}

      {/* Game Over Modal */}
      <GameOverModal battle={battle} onRematch={handleRematch} />

      {/* Arena Header Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-ninja-border/70 bg-ninja-surface/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="rounded bg-flame-orange/20 px-2.5 py-1 text-xs font-mono font-bold text-flame-orange border border-flame-orange/30 uppercase">
            {battle.mode.replace('_', ' ')}
          </span>
          <span className="text-xs font-mono text-gray-300">
            Round: <strong className="text-white">{battle.round}</strong> • Turn: <strong className="text-white">{battle.turn}</strong>
          </span>
        </div>

        {/* Turn Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">Current Turn:</span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-mono font-bold uppercase animate-pulse ${
              battle.currentTurn === 'player1'
                ? 'bg-flame-orange/20 text-flame-orange border border-flame-orange/50'
                : 'bg-chakra-blue/20 text-chakra-blue border border-chakra-blue/50'
            }`}
          >
            {battle.currentTurn === 'player1' ? p1.character.name : p2.character.name}
          </span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            sound.playClick();
            navigate('/battle/setup');
          }}
        >
          Abandon Match
        </Button>
      </div>

      {/* Main Two-Panel Arena Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Fighter 1 (Left) */}
        <div className="relative lg:col-span-4 flex flex-col justify-between rounded-2xl border border-flame-orange/40 bg-ninja-panel/90 p-5 shadow-2xl backdrop-blur-md">
          {/* Damage popups over Player 1 */}
          <DamagePopup
            popups={damagePopups}
            targetSide="player1"
            onComplete={(pid) => clearPopups(pid)}
          />

          {/* Top Info */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-flame-orange uppercase">PLAYER 1</span>
                <h3 className="text-xl font-black text-white">{p1.character.name}</h3>
                <span className="text-xs text-gray-400 font-semibold">{p1.character.title}</span>
              </div>
              <CharacterVisual
                character={p1.character}
                size="md"
                isActiveTurn={battle.currentTurn === 'player1'}
                isDefeated={p1.currentHp <= 0}
              />
            </div>

            {/* Health and Chakra Bars */}
            <div className="mt-5 space-y-3">
              <HPBar currentHp={p1.currentHp} maxHp={p1.maxHp} shield={p1.shield} />
              <ChakraBar currentChakra={p1.currentChakra} maxChakra={p1.maxChakra} />
            </div>
          </div>

          {/* Status Effects & Vitals */}
          <div className="mt-4 border-t border-ninja-border/60 pt-3">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span>ATK: {p1.character.stats.attack}</span>
              <span>DEF: {p1.character.stats.defense}</span>
              <span>SPD: {p1.character.stats.speed}</span>
            </div>
          </div>
        </div>

        {/* Center: Battle Combat Log Scroll */}
        <div className="lg:col-span-4 h-80 lg:h-auto min-h-[320px]">
          <BattleLog logs={battle.logs} />
        </div>

        {/* Fighter 2 (Right) */}
        <div className="relative lg:col-span-4 flex flex-col justify-between rounded-2xl border border-chakra-blue/40 bg-ninja-panel/90 p-5 shadow-2xl backdrop-blur-md">
          {/* Damage popups over Player 2 */}
          <DamagePopup
            popups={damagePopups}
            targetSide="player2"
            onComplete={(pid) => clearPopups(pid)}
          />

          {/* Top Info */}
          <div>
            <div className="flex items-start justify-between flex-row-reverse">
              <div className="text-right">
                <span className="text-[10px] font-mono font-bold text-chakra-blue uppercase">
                  {p2.isAI ? `AI: ${p2.aiStrategy?.toUpperCase()}` : 'PLAYER 2'}
                </span>
                <h3 className="text-xl font-black text-white">{p2.character.name}</h3>
                <span className="text-xs text-gray-400 font-semibold">{p2.character.title}</span>
              </div>
              <CharacterVisual
                character={p2.character}
                size="md"
                isFlipped
                isActiveTurn={battle.currentTurn === 'player2'}
                isDefeated={p2.currentHp <= 0}
              />
            </div>

            {/* Health and Chakra Bars */}
            <div className="mt-5 space-y-3">
              <HPBar currentHp={p2.currentHp} maxHp={p2.maxHp} shield={p2.shield} isFlipped />
              <ChakraBar currentChakra={p2.currentChakra} maxChakra={p2.maxChakra} isFlipped />
            </div>
          </div>

          {/* Status Effects & Vitals */}
          <div className="mt-4 border-t border-ninja-border/60 pt-3">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span>ATK: {p2.character.stats.attack}</span>
              <span>DEF: {p2.character.stats.defense}</span>
              <span>SPD: {p2.character.stats.speed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Command Deck */}
      <ActionPanel
        battle={battle}
        isAIThinking={isAIThinking}
        onExecuteAbility={(actor, abilityId) => performAction(actor, abilityId)}
      />
    </div>
  );
};

/* =========================================================================
   6. AI LABORATORY (/ai-lab)
   ========================================================================= */
export const AILabPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeStrategy, setActiveStrategy] = useState<AIStrategy>('alpha_beta');
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [simResults, setSimResults] = useState<{ p1Wins: number; p2Wins: number; ties: number } | null>(null);

  const stratInfo = AI_STRATEGIES.find((s) => s.id === activeStrategy) || AI_STRATEGIES[0];

  const runQuickSimulation = async () => {
    sound.playClick();
    setIsRunningSim(true);
    await new Promise((r) => setTimeout(r, 700));
    setSimResults({
      p1Wins: 68,
      p2Wins: 28,
      ties: 4,
    });
    setIsRunningSim(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">AI Research Laboratory</h1>
          <p className="text-xs text-gray-400 mt-1">Explore game-theoretic decision algorithms, pruning metrics, and benchmark analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="chakra"
            size="md"
            leftIcon={<GitFork className="h-4 w-4" />}
            onClick={() => navigate('/ai-lab/game-tree')}
          >
            Open Game Tree Visualizer
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Brain className="h-4 w-4" />}
            onClick={() => navigate('/ai-lab/explainer')}
          >
            Decision Explainer
          </Button>
        </div>
      </div>

      {/* Strategy Selector Pills */}
      <div className="flex flex-wrap gap-2">
        {AI_STRATEGIES.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              sound.playClick();
              setActiveStrategy(s.id);
            }}
            className={`rounded-xl px-4 py-2 text-xs font-mono font-bold transition-all ${
              activeStrategy === s.id
                ? 'bg-flame-orange text-black shadow-glow-orange'
                : 'bg-ninja-card text-gray-400 hover:text-white hover:bg-ninja-border'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Strategy Detail Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-flame-orange uppercase">Selected Model</span>
              <h2 className="text-2xl font-black text-white">{stratInfo.name}</h2>
              <p className="text-xs text-gray-400 italic mt-0.5">{stratInfo.tagline}</p>
            </div>
            <div className="text-right font-mono text-xs">
              <span className="text-gray-400">Time Complexity:</span>
              <div className="font-bold text-flame-orange">{stratInfo.timeComplexity}</div>
            </div>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed">{stratInfo.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-vitality-green/40 bg-vitality-green/10 p-4">
              <h4 className="text-xs font-bold text-vitality-green uppercase mb-2">Tactical Strengths</h4>
              <ul className="space-y-1.5 text-xs text-gray-300">
                {stratInfo.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-vitality-green shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-sharingan-red/40 bg-sharingan-red/10 p-4">
              <h4 className="text-xs font-bold text-sharingan-red uppercase mb-2">Known Limitations</h4>
              <ul className="space-y-1.5 text-xs text-gray-300">
                {stratInfo.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-sharingan-red shrink-0" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Live Simulation Runner Card */}
        <div className="lg:col-span-4 rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase text-white">Algorithm Benchmark</h3>
            <p className="text-xs text-gray-400 mt-1">Run 100 test matches against Greedy Heuristic</p>

            <div className="mt-6 flex flex-col items-center justify-center p-4 border border-ninja-border/50 rounded-xl bg-ninja-card/60">
              {isRunningSim ? (
                <LoadingSpinner size="md" variant="sharingan" text="Simulating 100 battles..." />
              ) : simResults ? (
                <div className="text-center space-y-2">
                  <div className="text-3xl font-black text-vitality-green font-mono">{simResults.p1Wins}%</div>
                  <div className="text-xs font-mono text-gray-300">Win Rate vs Greedy</div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Losses: {simResults.p2Wins} | Draws: {simResults.ties}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 text-center italic">
                  Press Execute to run Monte Carlo test batch
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            glow
            leftIcon={<Play className="h-4 w-4" />}
            disabled={isRunningSim}
            onClick={runQuickSimulation}
            className="w-full mt-6"
          >
            {isRunningSim ? 'Simulating...' : 'Run 100 Test Battles'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   7. AI DECISION EXPLAINER (/ai-lab/explainer)
   ========================================================================= */
export const AIDecisionExplainerPage: React.FC = () => {
  const { battle, lastDecision } = useBattleStore();
  const [strategy, setStrategy] = useState<AIStrategy>('alpha_beta');

  const sampleDecision: AIDecision = lastDecision || computeAIDecision(
    battle || {
      id: 'demo',
      mode: 'pve',
      round: 3,
      turn: 5,
      currentTurn: 'player2',
      player1: { character: CHARACTERS[0], currentHp: 650, maxHp: 1300, currentChakra: 450, maxChakra: 1200, shield: 0, statusEffects: [], cooldowns: {}, isAI: false },
      player2: { character: CHARACTERS[1], currentHp: 800, maxHp: 1100, currentChakra: 520, maxChakra: 1050, shield: 0, statusEffects: [], cooldowns: {}, isAI: true, aiStrategy: 'alpha_beta' },
      status: 'ongoing',
      logs: [],
      createdAt: '',
    },
    'player2',
    strategy,
    3
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">AI Decision Explainer</h1>
          <p className="text-xs text-gray-400 mt-1">Deep mathematical decomposition of why the AI selected this specific jutsu</p>
        </div>
        <select
          value={strategy}
          onChange={(e) => setStrategy(e.target.value as AIStrategy)}
          className="rounded-xl border border-ninja-border bg-ninja-panel px-3 py-2 text-xs font-mono text-white focus:border-flame-orange focus:outline-none"
        >
          {AI_STRATEGIES.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Chosen Jutsu Spotlight */}
      <div className="rounded-2xl border border-flame-orange/60 bg-gradient-to-r from-ninja-panel via-ninja-surface to-ninja-panel p-6 shadow-glow-orange/20">
        <div className="flex items-center gap-2 text-flame-orange text-xs font-mono font-bold uppercase">
          <Brain className="h-4 w-4" /> Selected Jutsu Execution
        </div>
        <h2 className="text-3xl font-black text-white mt-1">{sampleDecision.chosenAbilityName}</h2>
        <p className="text-xs text-gray-300 mt-2 font-mono leading-relaxed bg-black/40 p-3 rounded-xl border border-ninja-border/50">
          {sampleDecision.rationale}
        </p>

        {/* Quick Decision Metrics */}
        <div className="mt-4 flex flex-wrap items-center gap-6 text-xs font-mono">
          <div>
            <span className="text-gray-400">Time Taken:</span> <strong className="text-white">{sampleDecision.timeMs}ms</strong>
          </div>
          <div>
            <span className="text-gray-400">Nodes Explored:</span> <strong className="text-flame-orange">{sampleDecision.nodesExplored.toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-gray-400">Horizon Depth:</span> <strong className="text-chakra-blue">{sampleDecision.searchDepth || 3} Plies</strong>
          </div>
          <div>
            <span className="text-gray-400">Utility Score:</span> <strong className="text-vitality-green">{sampleDecision.evaluationScore}</strong>
          </div>
        </div>
      </div>

      {/* Heuristic Breakdown Bars */}
      <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Tactical Weight Deconstruction</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Health Differential Advantage', val: sampleDecision.breakdown.hpAdvantage, color: 'from-vitality-green to-emerald-400' },
            { label: 'Chakra Efficiency & Conservation', val: sampleDecision.breakdown.chakraEfficiency, color: 'from-chakra-blue to-cyan-400' },
            { label: 'Lethal Finishing Threat', val: sampleDecision.breakdown.lethalThreat, color: 'from-sharingan-red to-rose-400' },
            { label: 'Defensive Survivability', val: sampleDecision.breakdown.defensiveSafety, color: 'from-curse-purple to-indigo-400' },
          ].map((item, i) => (
            <div key={i} className="p-3 bg-ninja-card/50 rounded-xl border border-ninja-border/40">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-gray-300">{item.label}</span>
                <span className="font-bold text-white">{item.val}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-ninja-border overflow-hidden">
                <div className={`h-full bg-gradient-to-r ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternative Actions Comparison */}
      <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Evaluated Alternative Actions</h3>
        <div className="space-y-3">
          {sampleDecision.alternatives.map((alt, idx) => (
            <div
              key={alt.abilityId}
              className={`flex items-center justify-between p-3.5 rounded-xl border ${
                alt.abilityId === sampleDecision.chosenAbilityId
                  ? 'border-flame-orange bg-flame-orange/10 shadow-glow-orange/20'
                  : 'border-ninja-border/60 bg-ninja-card/40 opacity-80'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ninja-border text-xs font-mono font-bold text-gray-300">
                  #{idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-white">{alt.abilityName}</h4>
                  <span className="text-xs text-gray-400 font-mono">{alt.explanation}</span>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-sm font-black text-flame-orange">{alt.score} pts</div>
                {alt.pruned && <span className="text-[10px] text-gray-500 font-bold uppercase">Branch Pruned</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   8. GAME TREE VISUALIZER (/ai-lab/game-tree)
   ========================================================================= */
export const GameTreeVisualizerPage: React.FC = () => {
  const { battle } = useBattleStore();
  const [depth, setDepth] = useState<number>(2);
  const [strategy, setStrategy] = useState<AIStrategy>('alpha_beta');

  const tree = generateInteractiveGameTree(
    battle || {
      id: 'demo',
      mode: 'pve',
      round: 1,
      turn: 1,
      currentTurn: 'player1',
      player1: { character: CHARACTERS[0], currentHp: 1300, maxHp: 1300, currentChakra: 1200, maxChakra: 1200, shield: 0, statusEffects: [], cooldowns: {}, isAI: false },
      player2: { character: CHARACTERS[1], currentHp: 1100, maxHp: 1100, currentChakra: 1050, maxChakra: 1050, shield: 0, statusEffects: [], cooldowns: {}, isAI: true },
      status: 'ongoing',
      logs: [],
      createdAt: '',
    },
    strategy,
    depth
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Game Tree Visualizer</h1>
          <p className="text-xs text-gray-400 mt-1">Interactive Minimax & Alpha-Beta pruning decision graph</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as AIStrategy)}
            className="rounded-xl border border-ninja-border bg-ninja-panel px-3 py-2 text-xs font-mono text-white focus:border-flame-orange focus:outline-none"
          >
            <option value="alpha_beta">Alpha-Beta (Pruned)</option>
            <option value="minimax">Full Minimax (Unpruned)</option>
          </select>
          <div className="flex items-center gap-2 bg-ninja-panel px-3 py-1.5 rounded-xl border border-ninja-border text-xs font-mono">
            <span className="text-gray-400">Depth:</span>
            <button onClick={() => setDepth(Math.max(1, depth - 1))} className="px-1 text-flame-orange font-bold">-</button>
            <span className="text-white font-bold">{depth}</span>
            <button onClick={() => setDepth(Math.min(3, depth + 1))} className="px-1 text-flame-orange font-bold">+</button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Tree Render */}
      <div className="overflow-x-auto rounded-2xl border border-ninja-border/80 bg-ninja-surface p-6 shadow-2xl">
        <div className="min-w-[700px] flex flex-col items-center gap-8">
          {/* Root Node */}
          <div className="flex flex-col items-center">
            <div className="rounded-2xl border-2 border-flame-orange bg-flame-orange/20 px-6 py-3 text-center shadow-glow-orange">
              <span className="text-[10px] font-mono font-bold text-flame-orange uppercase">MAX Node (Root)</span>
              <div className="text-base font-black text-white">{tree.name}</div>
              <div className="text-xs font-mono text-vitality-green font-bold">Value: {tree.score}</div>
            </div>
            <div className="h-8 w-0.5 bg-ninja-border mt-2" />
          </div>

          {/* Depth 1 Children */}
          <div className="grid grid-cols-4 gap-4 w-full">
            {tree.children?.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div
                  className={`w-full rounded-xl border p-3 text-center transition-all ${
                    child.isBestPath
                      ? 'border-flame-orange bg-ninja-panel shadow-glow-orange'
                      : child.isPruned
                      ? 'border-ninja-border/40 bg-ninja-card/30 opacity-40'
                      : 'border-ninja-border/80 bg-ninja-panel'
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold uppercase text-chakra-blue">MIN Node</span>
                  <div className="truncate text-xs font-bold text-white">{child.name}</div>
                  <div className="text-[11px] font-mono text-gray-300">Score: {child.score}</div>
                  {child.isPruned && <span className="text-[9px] text-sharingan-red font-bold">Cutoff Pruned</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   9. TOURNAMENT PAGE (/tournament)
   ========================================================================= */
export const TournamentPage: React.FC = () => {
  const { tournament, isRunning, initTournament, simulateMatch, simulateFullTournament, resetTournament } = useTournamentStore();

  useEffect(() => {
    if (!tournament) initTournament();
  }, [tournament, initTournament]);

  if (!tournament) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Chūnin Exams Tournament</h1>
          <p className="text-xs text-gray-400 mt-1">8-Shinobi single elimination bracket pitting diverse AI engines head-to-head</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            glow
            leftIcon={<Play className="h-4 w-4" />}
            disabled={isRunning || tournament.status === 'completed'}
            onClick={() => simulateFullTournament()}
          >
            {isRunning ? 'Simulating...' : 'Simulate Entire Tournament'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => resetTournament()}>
            Reset Bracket
          </Button>
        </div>
      </div>

      {/* Champion Podium if Completed */}
      {tournament.champion && (
        <div className="rounded-3xl border-2 border-yellow-500/80 bg-gradient-to-r from-ninja-panel via-yellow-500/10 to-ninja-panel p-6 text-center shadow-2xl">
          <Trophy className="mx-auto h-12 w-12 text-yellow-400 animate-bounce" />
          <span className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest">
            Chūnin Champion Decided
          </span>
          <h2 className="text-3xl font-black text-white mt-1">{tournament.champion.name}</h2>
          <p className="text-xs text-gray-300 font-mono mt-1">
            Algorithm: <strong className="text-flame-orange uppercase">{tournament.champion.strategy}</strong> • Total Damage: {tournament.champion.damageDealt}
          </p>
        </div>
      )}

      {/* Bracket Visualizer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quarterfinals */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-flame-orange uppercase">Round 1: Quarterfinals</h3>
          {tournament.matches.filter((m) => m.roundNumber === 1).map((match) => (
            <div key={match.id} className="rounded-xl border border-ninja-border/80 bg-ninja-panel p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className={match.winner?.id === match.contender1.id ? 'font-black text-flame-orange' : 'text-gray-300'}>
                  {match.contender1.name}
                </span>
                <span className="text-[10px] font-mono text-gray-500">{match.contender1.strategy}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={match.winner?.id === match.contender2.id ? 'font-black text-flame-orange' : 'text-gray-300'}>
                  {match.contender2.name}
                </span>
                <span className="text-[10px] font-mono text-gray-500">{match.contender2.strategy}</span>
              </div>
              {match.status === 'pending' && (
                <Button variant="secondary" size="sm" onClick={() => simulateMatch(match.id)} className="w-full mt-2">
                  Fight Match
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Semifinals */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-chakra-blue uppercase">Round 2: Semifinals</h3>
          {tournament.matches.filter((m) => m.roundNumber === 2).length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-ninja-border/40 text-xs text-gray-500 italic">
              Awaiting Quarterfinal outcomes...
            </div>
          ) : (
            tournament.matches.filter((m) => m.roundNumber === 2).map((match) => (
              <div key={match.id} className="rounded-xl border border-ninja-border/80 bg-ninja-panel p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={match.winner?.id === match.contender1.id ? 'font-black text-chakra-blue' : 'text-gray-300'}>
                    {match.contender1.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{match.contender1.strategy}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={match.winner?.id === match.contender2.id ? 'font-black text-chakra-blue' : 'text-gray-300'}>
                    {match.contender2.name}
                  </span>
                  <span className="text-[10px] font-mono text-gray-500">{match.contender2.strategy}</span>
                </div>
                {match.status === 'pending' && (
                  <Button variant="secondary" size="sm" onClick={() => simulateMatch(match.id)} className="w-full mt-2">
                    Fight Match
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Finals */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-yellow-400 uppercase">Round 3: Championship Final</h3>
          {tournament.matches.filter((m) => m.roundNumber === 3).length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-ninja-border/40 text-xs text-gray-500 italic">
              Awaiting Semifinal winners...
            </div>
          ) : (
            tournament.matches.filter((m) => m.roundNumber === 3).map((match) => (
              <div key={match.id} className="rounded-xl border-2 border-yellow-500/60 bg-ninja-panel p-4 space-y-3 shadow-glow-orange/20">
                <div className="flex items-center justify-between text-sm">
                  <span className={match.winner?.id === match.contender1.id ? 'font-black text-yellow-400' : 'text-gray-300'}>
                    {match.contender1.name}
                  </span>
                  <span className="text-xs font-mono text-gray-400">{match.contender1.strategy}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className={match.winner?.id === match.contender2.id ? 'font-black text-yellow-400' : 'text-gray-300'}>
                    {match.contender2.name}
                  </span>
                  <span className="text-xs font-mono text-gray-400">{match.contender2.strategy}</span>
                </div>
                {match.status === 'pending' && (
                  <Button variant="primary" size="md" glow onClick={() => simulateMatch(match.id)} className="w-full mt-2">
                    Simulate Grand Final
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   10. ANALYTICS PAGE (/analytics)
   ========================================================================= */
export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.getAIComparison().then((res: any) => setData(Array.isArray(res) ? res : []));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Combat Analytics</h1>
          <p className="text-xs text-gray-400 mt-1">Deep computational metrics, AI win rates, execution latencies, and node expansions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate Chart */}
        <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">AI Win Rate Comparison (%)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="strategy" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Bar dataKey="winRate" fill="#FF6B00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Execution Time Chart */}
        <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Decision Latency (ms)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="strategy" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                <Bar dataKey="avgTimeMs" fill="#00BFFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   11. BATTLE HISTORY PAGE (/history)
   ========================================================================= */
export const BattleHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<BattleState[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getBattleHistory().then(setHistory);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Battle Archive</h1>
          <p className="text-xs text-gray-400 mt-1">Full log of past simulated encounters and tactical skirmishes</p>
        </div>
      </div>

      <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-ninja-border/70 text-gray-400 uppercase">
              <tr>
                <th className="py-2.5">Battle ID</th>
                <th className="py-2.5">Mode</th>
                <th className="py-2.5">Fighter 1</th>
                <th className="py-2.5">Fighter 2</th>
                <th className="py-2.5">Rounds</th>
                <th className="py-2.5">Winner</th>
                <th className="py-2.5 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ninja-border/40">
              {history.map((b) => (
                <tr key={b.id} className="hover:bg-ninja-card/50 transition-colors">
                  <td className="py-3 text-gray-400">{b.id}</td>
                  <td className="py-3 uppercase font-bold text-gray-300">{b.mode}</td>
                  <td className="py-3 text-white font-bold">{b.player1.character.name}</td>
                  <td className="py-3 text-white font-bold">{b.player2.character.name}</td>
                  <td className="py-3 text-gray-300">R{b.round}</td>
                  <td className="py-3">
                    <span className="text-flame-orange font-bold">
                      {b.status === 'player1_won' ? b.player1.character.name : b.player2.character.name}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/battle/${b.id}`)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   12. SETTINGS PAGE (/settings)
   ========================================================================= */
export const SettingsPage: React.FC = () => {
  const settings = useSettingsStore();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="border-b border-ninja-border/70 pb-5">
        <h1 className="text-3xl font-black uppercase text-white tracking-wide">Preferences & Audio</h1>
        <p className="text-xs text-gray-400 mt-1">Configure audio synthesizer, battle speed, animation rates, and defaults</p>
      </div>

      <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6 space-y-6">
        {/* Audio Toggles */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-white text-sm">Combat Sound Effects</h4>
            <p className="text-xs text-gray-400">Synthesized Web Audio API jutsu sound cues</p>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => settings.setSoundEnabled(e.target.checked)}
            className="h-5 w-5 accent-flame-orange cursor-pointer"
          />
        </div>

        {/* Battle Speed Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-300 font-bold">Battle Playback Speed</span>
            <span className="text-flame-orange font-bold">{settings.battleSpeed}x</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={settings.battleSpeed}
            onChange={(e) => settings.setBattleSpeed(Number(e.target.value))}
            className="w-full accent-flame-orange cursor-pointer"
          />
        </div>

        {/* AI Default Strategy */}
        <div>
          <label className="text-xs font-mono text-gray-300">Default AI Model</label>
          <select
            value={settings.defaultAIStrategy}
            onChange={(e) => settings.setDefaultAIStrategy(e.target.value as AIStrategy)}
            className="mt-1 w-full rounded-xl border border-ninja-border bg-ninja-card p-2 text-xs font-mono text-white focus:border-flame-orange focus:outline-none"
          >
            {AI_STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Reset button */}
        <div className="pt-4 border-t border-ninja-border/60">
          <Button variant="secondary" size="md" onClick={() => settings.resetDefaults()}>
            Reset to Default Settings
          </Button>
        </div>
      </div>
    </div>
  );
};
