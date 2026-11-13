import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Swords, Users, Brain, Cpu, GitFork, Trophy, History, Settings as SettingsIcon,
  Shield, Zap, Flame, Heart, RotateCcw, Play, CheckCircle2, AlertTriangle, ArrowRight,
  Filter, Search, Download, HelpCircle, ChevronRight, Award
} from 'lucide-react';

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
import { computeAIDecision, generateGameTree, hasUnlimitedChakra } from '../utils/aiEngine';
import { BenchmarkResult, ALL_STRATEGIES, runBenchmark, runAllBenchmarks, loadBenchmarks, saveBenchmark } from '../utils/benchmark';

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
    error,
    isAIThinking,
    damagePopups,
    shakeScreen,
    flashScreen,
    performAction,
    loadBattle,
    clearPopups,
    startBattle,
  } = useBattleStore();

  const [modalDismissed, setModalDismissed] = useState(false);

  // FIX: reload whenever the URL id differs from the battle in the store (not only when it is empty)
  useEffect(() => {
    if (id && battle?.id !== id) {
      loadBattle(id);
    }
  }, [id, battle?.id, loadBattle]);

  useEffect(() => {
    setModalDismissed(false);
  }, [battle?.id]);

  // FIX: show an error instead of loading forever when the battle cannot be found
  if (!isLoading && !battle && error) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-10 w-10 text-sharingan-red" />
        <p className="text-sm text-gray-300">{error}</p>
        <Button variant="secondary" size="md" onClick={() => navigate('/history')}>
          Back to Battle Archive
        </Button>
      </div>
    );
  }

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
    const newBattle = await startBattle({
      mode: battle.mode,
      player1CharacterId: p1.character.id,
      player2CharacterId: p2.character.id,
      player1IsAI: p1.isAI,
      player1Strategy: p1.aiStrategy,
      player2Strategy: p2.aiStrategy,
    });
    navigate(`/battle/${newBattle.id}`);
  };

  return (
    <div className={`relative flex flex-col gap-6 ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Full screen flash on ultimate */}
      {flashScreen && (
        <div className="pointer-events-none fixed inset-0 z-40 bg-white/40 animate-flash" />
      )}

      {/* Game Over Modal */}
      {!modalDismissed && (
        <GameOverModal battle={battle} onRematch={handleRematch} onClose={() => setModalDismissed(true)} />
      )}

      {/* Arena Header Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-ninja-border/70 bg-ninja-surface/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="rounded bg-flame-orange/20 px-2.5 py-1 text-xs font-mono font-bold text-flame-orange border border-flame-orange/30 uppercase">
            {battle.mode === 'practice' ? 'Training Dojo' : battle.mode.replace('_', ' ')}
          </span>
          {hasUnlimitedChakra(battle) && (
            <span className="rounded bg-chakra-blue/20 px-2.5 py-1 text-xs font-mono font-bold text-chakra-blue border border-chakra-blue/30">
              ∞ Unlimited Chakra
            </span>
          )}
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
              <ChakraBar currentChakra={p1.currentChakra} maxChakra={p1.maxChakra} unlimited={hasUnlimitedChakra(battle)} />
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
              <ChakraBar currentChakra={p2.currentChakra} maxChakra={p2.maxChakra} isFlipped unlimited={hasUnlimitedChakra(battle)} />
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
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkResult>>(() => loadBenchmarks());

  const stratInfo = AI_STRATEGIES.find((s) => s.id === activeStrategy) || AI_STRATEGIES[0];
  const simResult = benchmarks[activeStrategy] || null;
  const busy = isRunningSim || isRunningAll;

  // Real benchmark: 100 full battles of the selected algorithm vs Greedy
  const runQuickSimulation = async () => {
    sound.playClick();
    setIsRunningSim(true);
    setProgressLabel('Simulating 100 battles...');
    const result = await runBenchmark(activeStrategy, 100, 'greedy', (d, t) =>
      setProgressLabel(`Simulating battles... ${d}/${t}`)
    );
    saveBenchmark(result);
    setBenchmarks((prev) => ({ ...prev, [result.strategy]: result }));
    setIsRunningSim(false);
  };

  // Real benchmark of every algorithm vs Greedy
  const runAllSimulations = async () => {
    sound.playClick();
    setIsRunningAll(true);
    const all = await runAllBenchmarks(100, (strategy, d, t) =>
      setProgressLabel(`${strategy}: ${d}/${t}`)
    );
    setBenchmarks(all);
    setIsRunningAll(false);
  };

  const leaderboard = ALL_STRATEGIES.map((id) => benchmarks[id]).filter(Boolean) as BenchmarkResult[];
  leaderboard.sort((a, b) => b.winRate - a.winRate);

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
              {busy ? (
                <LoadingSpinner size="md" variant="sharingan" text={progressLabel || 'Simulating 100 battles...'} />
              ) : simResult ? (
                <div className="text-center space-y-2">
                  <div className="text-xs font-mono text-gray-400">{stratInfo.name}</div>
                  <div className="text-3xl font-black text-vitality-green font-mono">{simResult.winRate}%</div>
                  <div className="text-xs font-mono text-gray-300">
                    {activeStrategy === 'greedy' ? 'Win Rate vs Greedy (mirror match)' : 'Win Rate vs Greedy'}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    Wins: {simResult.wins} | Losses: {simResult.losses} | Draws: {simResult.draws}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">Avg {simResult.avgTurns} jutsu / battle</div>
                </div>
              ) : (
                <div className="text-xs text-gray-400 text-center italic">
                  No benchmark yet for {stratInfo.name}. Press Run to test it.
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            glow
            leftIcon={<Play className="h-4 w-4" />}
            disabled={busy}
            onClick={runQuickSimulation}
            className="w-full mt-6"
          >
            {isRunningSim ? 'Simulating...' : 'Run 100 Test Battles'}
          </Button>
          <Button variant="secondary" size="md" disabled={busy} onClick={runAllSimulations} className="w-full mt-3">
            {isRunningAll ? 'Benchmarking all...' : 'Benchmark All 4 Algorithms'}
          </Button>
        </div>
      </div>

      {/* Leaderboard of every algorithm vs Greedy */}
      {leaderboard.length > 0 && (
        <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-6">
          <h3 className="text-sm font-bold uppercase text-white mb-4">Benchmark Leaderboard (100 battles each vs Greedy)</h3>
          <div className="space-y-2">
            {leaderboard.map((r) => (
              <div key={r.strategy} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-32 text-gray-300 truncate">
                  {AI_STRATEGIES.find((a) => a.id === r.strategy)?.name || r.strategy}
                </span>
                <div className="flex-1 h-2 rounded bg-ninja-card overflow-hidden">
                  <div className="h-full bg-flame-orange" style={{ width: `${r.winRate}%` }} />
                </div>
                <span className="w-14 text-right font-bold text-white">{r.winRate}%</span>
                <span className="w-32 text-right text-gray-500">
                  {r.wins}W {r.losses}L {r.draws}D
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [depth, setDepth] = useState<number>(3);
  const [strategy, setStrategy] = useState<AIStrategy>('alpha_beta');
  const [source, setSource] = useState<'battle' | 'custom'>(battle ? 'battle' : 'custom');
  const [fighterA, setFighterA] = useState<string>(CHARACTERS[0].id);
  const [fighterB, setFighterB] = useState<string>(CHARACTERS[1].id);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string>('root');

  // Build the battle state the tree is generated from
  const state: BattleState = useMemo(() => {
    if (source === 'battle' && battle) return battle;
    const mk = (id: string, isAI: boolean) => {
      const c = CHARACTERS.find((ch) => ch.id === id) || CHARACTERS[0];
      return {
        character: c, currentHp: c.stats.maxHp, maxHp: c.stats.maxHp,
        currentChakra: c.stats.maxChakra, maxChakra: c.stats.maxChakra,
        shield: 0, statusEffects: [], cooldowns: {}, isAI,
      };
    };
    return {
      id: 'demo', mode: 'pve', round: 1, turn: 1, currentTurn: 'player1',
      player1: mk(fighterA, false), player2: mk(fighterB, true),
      status: 'ongoing', logs: [], createdAt: '',
    } as BattleState;
  }, [source, battle, fighterA, fighterB]);

  const tree = useMemo(() => generateGameTree(state, strategy, depth), [state, strategy, depth]);

  // Reset view whenever the tree changes
  useEffect(() => {
    setCollapsed(new Set());
    setSelectedId('root');
  }, [tree]);

  // ---- statistics ----
  const stats = useMemo(() => {
    let total = 0, pruned = 0;
    const walk = (n: GameTreeNode) => {
      total++;
      if (n.isPruned) pruned++;
      n.children?.forEach(walk);
    };
    walk(tree);
    return { total, pruned, evaluated: total - pruned };
  }, [tree]);

  const allNodes = useMemo(() => {
    const map = new Map<string, GameTreeNode>();
    const walk = (n: GameTreeNode) => { map.set(n.id, n); n.children?.forEach(walk); };
    walk(tree);
    return map;
  }, [tree]);
  const selected = allNodes.get(selectedId) || tree;

  // ---- layout (horizontal tree: root on the left, depth grows to the right) ----
  const NODE_W = 176, NODE_H = 42, X_GAP = 70, Y_GAP = 12, PAD = 20;
  const layout = useMemo(() => {
    interface Laid { node: GameTreeNode; x: number; y: number; parent?: Laid; hiddenCount: number }
    const laid: Laid[] = [];
    let leaf = 0;
    const countAll = (n: GameTreeNode): number => (n.children || []).reduce((s, c) => s + 1 + countAll(c), 0);
    const place = (node: GameTreeNode, d: number, parent?: Laid): Laid => {
      const isCollapsed = collapsed.has(node.id);
      const kids = isCollapsed ? [] : node.children || [];
      const me: Laid = { node, x: PAD + d * (NODE_W + X_GAP), y: 0, parent, hiddenCount: isCollapsed ? countAll(node) : 0 };
      laid.push(me);
      if (kids.length === 0) {
        me.y = PAD + leaf * (NODE_H + Y_GAP);
        leaf++;
      } else {
        const placed = kids.map((k) => place(k, d + 1, me));
        me.y = (placed[0].y + placed[placed.length - 1].y) / 2;
      }
      return me;
    };
    place(tree, 0);
    const width = PAD * 2 + (depth + 1) * NODE_W + depth * X_GAP;
    const height = PAD * 2 + Math.max(1, leaf) * (NODE_H + Y_GAP);
    return { laid, width, height };
  }, [tree, collapsed, depth]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const collapseAll = () => {
    const ids = new Set<string>();
    tree.children?.forEach((c) => { if (c.children && c.children.length) ids.add(c.id); });
    setCollapsed(ids);
  };

  const colorFor = (n: GameTreeNode) =>
    n.id === 'root' ? '#FF6B00' : n.type === 'max' ? '#00BFFF' : '#8B5CF6';
  const short = (t: string, max = 22) => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  const fmt = (v?: number) => (v === undefined ? '—' : v === Infinity ? '+∞' : v === -Infinity ? '-∞' : String(v));

  const selectCls = 'rounded-xl border border-ninja-border bg-ninja-panel px-3 py-2 text-xs font-mono text-white focus:border-flame-orange focus:outline-none';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-ninja-border/70 pb-5">
        <div>
          <h1 className="text-3xl font-black uppercase text-white tracking-wide">Game Tree Visualizer</h1>
          <p className="text-xs text-gray-400 mt-1">
            Full Minimax / Alpha-Beta search tree. Click a node to inspect it, click the ± button to fold or unfold a branch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as AIStrategy)} className={selectCls}>
            <option value="alpha_beta">Alpha-Beta (Pruned)</option>
            <option value="minimax">Full Minimax (Unpruned)</option>
          </select>

          <div className="flex items-center gap-2 bg-ninja-panel px-3 py-1.5 rounded-xl border border-ninja-border text-xs font-mono">
            <span className="text-gray-400">Depth:</span>
            <button onClick={() => setDepth(Math.max(1, depth - 1))} className="px-1 text-flame-orange font-bold">-</button>
            <span className="text-white font-bold">{depth}</span>
            <button onClick={() => setDepth(Math.min(3, depth + 1))} className="px-1 text-flame-orange font-bold">+</button>
          </div>

          <select value={source} onChange={(e) => setSource(e.target.value as 'battle' | 'custom')} className={selectCls}>
            <option value="custom">Custom matchup</option>
            {battle && <option value="battle">Current battle state</option>}
          </select>

          {source === 'custom' && (
            <>
              <select value={fighterA} onChange={(e) => setFighterA(e.target.value)} className={selectCls}>
                {CHARACTERS.map((c) => <option key={c.id} value={c.id}>MAX: {c.name}</option>)}
              </select>
              <select value={fighterB} onChange={(e) => setFighterB(e.target.value)} className={selectCls}>
                {CHARACTERS.map((c) => <option key={c.id} value={c.id}>MIN: {c.name}</option>)}
              </select>
            </>
          )}

          <Button variant="secondary" size="sm" onClick={() => setCollapsed(new Set())}>Expand all</Button>
          <Button variant="secondary" size="sm" onClick={collapseAll}>Collapse to level 1</Button>
        </div>
      </div>

      {/* Stats + legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Total nodes', value: stats.total, color: 'text-white' },
          { label: 'Evaluated', value: stats.evaluated, color: 'text-vitality-green' },
          { label: 'Pruned (skipped)', value: stats.pruned, color: 'text-sharingan-red' },
          { label: 'Best root score', value: tree.score, color: 'text-flame-orange' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-ninja-border/80 bg-ninja-panel p-3">
            <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-mono text-gray-300">
        <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#00BFFF] mr-1.5" />MAX move (your fighter)</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#8B5CF6] mr-1.5" />MIN reply (opponent)</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#FF6B00] mr-1.5" />Best path (principal variation)</span>
        <span><span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-gray-400 mr-1.5" />Pruned branch</span>
      </div>

      {/* SVG tree */}
      <div className="overflow-auto max-h-[70vh] rounded-2xl border border-ninja-border/80 bg-ninja-surface shadow-2xl">
        <svg width={layout.width} height={layout.height} style={{ display: 'block' }}>
          {/* edges */}
          {layout.laid.filter((l) => l.parent).map((l) => {
            const p = l.parent!;
            const x1 = p.x + NODE_W, y1 = p.y + NODE_H / 2;
            const x2 = l.x, y2 = l.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const best = l.node.isBestPath;
            return (
              <path
                key={`e-${l.node.id}`}
                d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
                fill="none"
                stroke={best ? '#FF6B00' : l.node.isPruned ? '#555' : '#3a3a3a'}
                strokeWidth={best ? 3 : 1.5}
                strokeDasharray={l.node.isPruned ? '5 4' : undefined}
              />
            );
          })}

          {/* nodes */}
          {layout.laid.map((l) => {
            const n = l.node;
            const c = colorFor(n);
            const hasKids = !!(n.children && n.children.length);
            const isSel = n.id === selectedId;
            return (
              <g key={n.id} opacity={n.isPruned ? 0.45 : 1}>
                <rect
                  x={l.x} y={l.y} width={NODE_W} height={NODE_H} rx={10}
                  fill={n.isBestPath ? '#2a1800' : '#181818'}
                  stroke={isSel ? '#fff' : c}
                  strokeWidth={n.isBestPath || isSel ? 2.5 : 1.5}
                  strokeDasharray={n.isPruned ? '5 4' : undefined}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedId(n.id)}
                />
                <text x={l.x + 10} y={l.y + 17} fontSize={11} fontWeight={700} fill="#fff" style={{ pointerEvents: 'none' }}>
                  {short(n.name)}
                </text>
                <text x={l.x + 10} y={l.y + 33} fontSize={10} fontFamily="monospace" fill={n.isPruned ? '#EF4444' : c} style={{ pointerEvents: 'none' }}>
                  {n.isPruned ? '✂ pruned' : `score ${fmt(n.score)}`}
                  {l.hiddenCount > 0 ? `  (+${l.hiddenCount} hidden)` : ''}
                </text>
                {hasKids && !n.isPruned && (
                  <g style={{ cursor: 'pointer' }} onClick={() => toggle(n.id)}>
                    <circle cx={l.x + NODE_W} cy={l.y + NODE_H / 2} r={9} fill="#111" stroke={c} strokeWidth={1.5} />
                    <text x={l.x + NODE_W} y={l.y + NODE_H / 2 + 4} fontSize={13} fontWeight={700} textAnchor="middle" fill={c} style={{ pointerEvents: 'none' }}>
                      {collapsed.has(n.id) ? '+' : '−'}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected node inspector */}
      <div className="rounded-2xl border border-ninja-border/80 bg-ninja-panel p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Selected node</h3>
        <div className="text-base font-black text-white">{selected.name}</div>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs font-mono text-gray-300">
          <div>Depth: <span className="text-white">{selected.depth}</span></div>
          <div>Type: <span className="text-white uppercase">{selected.type}</span></div>
          <div>Score: <span className="text-white">{fmt(selected.score)}</span></div>
          <div>α: <span className="text-white">{fmt(selected.alpha)}</span></div>
          <div>β: <span className="text-white">{fmt(selected.beta)}</span></div>
        </div>
        <p className="mt-3 text-xs text-gray-400">{selected.details}</p>
      </div>
    </div>
  );
};

/* =========================================================================
   9. TOURNAMENT PAGE (/tournament)
   ========================================================================= */
export const TournamentPage: React.FC = () => {
  const {
    tournament, isRunning, slots,
    setSlot, randomizeSlots, resetSlots, startTournament,
    simulateMatch, simulateFullTournament, resetTournament,
  } = useTournamentStore();

  /* ---------- SETUP SCREEN: user chooses every fighter + AI engine ---------- */
  if (!tournament) {
    const selectCls = 'w-full rounded-lg border border-ninja-border bg-ninja-card px-2.5 py-2 text-xs text-white focus:border-flame-orange focus:outline-none';
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-ninja-border/70 pb-5">
          <div>
            <h1 className="text-3xl font-black uppercase text-white tracking-wide">Chūnin Exams Tournament</h1>
            <p className="text-xs text-gray-400 mt-1">Set up the bracket: pick a shinobi and an AI engine for each of the 8 seats. Seats 1v2, 3v4, 5v6, 7v8 meet in Round 1.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="md" onClick={() => randomizeSlots()}>Randomize</Button>
            <Button variant="secondary" size="md" onClick={() => resetSlots()}>Defaults</Button>
            <Button variant="primary" size="md" glow leftIcon={<Play className="h-4 w-4" />} onClick={() => startTournament()}>
              Start Tournament
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((m) => (
            <div key={m} className="rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-4 space-y-3">
              <h3 className="text-xs font-mono font-bold text-flame-orange uppercase">Round 1 · Match {m + 1}</h3>
              {[m * 2, m * 2 + 1].map((i, k) => (
                <div key={i} className="space-y-2">
                  {k === 1 && <div className="text-center text-[10px] font-black tracking-widest text-gray-500">VS</div>}
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={slots[i].characterId}
                      onChange={(e) => setSlot(i, { characterId: e.target.value })}
                      className={selectCls}
                    >
                      {CHARACTERS.map((c) => (
                        <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>
                      ))}
                    </select>
                    <select
                      value={slots[i].strategy}
                      onChange={(e) => setSlot(i, { strategy: e.target.value as AIStrategy })}
                      className={selectCls}
                    >
                      {AI_STRATEGIES.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            Back to Setup
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
                      {b.status === 'player1_won'
                        ? b.player1.character.name
                        : b.status === 'player2_won'
                        ? b.player2.character.name
                        : b.status === 'draw'
                        ? 'Draw'
                        : 'In Progress'}
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
