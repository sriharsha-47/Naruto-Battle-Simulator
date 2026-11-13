import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Swords,
  Trophy,
  Brain,
  Flame,
  Users,
  ArrowRight,
  TrendingUp,
  Cpu,
  History,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { GlowingCard } from '../components/common/GlowingCard';
import { CharacterVisual } from '../components/character/CharacterVisual';
import { api } from '../api/client';
import { BattleState } from '../types/battle';
import { AI_STRATEGIES } from '../api/mockData';
import { ensureAllBenchmarks, loadBenchmarks, BenchmarkResult } from '../utils/benchmark';
import { computeDashboardStats } from '../utils/dashboardStats';
import { sound } from '../utils/sound';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [recentBattles, setRecentBattles] = useState<BattleState[]>([]);
  const [history, setHistory] = useState<BattleState[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, BenchmarkResult>>(() => loadBenchmarks());

  useEffect(() => {
    const loadData = async () => {
      const all = await api.getBattleHistory();
      setHistory(all);
      setRecentBattles(all.slice(0, 5));
      // Real benchmark results (runs only the algorithms not yet cached)
      setBenchmarks(await ensureAllBenchmarks(100));
    };
    loadData();
  }, []);

  const stats = computeDashboardStats(history, benchmarks);
  const topAIName = stats.topAI
    ? (AI_STRATEGIES.find((a) => a.id === stats.topAI!.strategy)?.name || stats.topAI.strategy)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-ninja-border/80 bg-gradient-to-r from-ninja-panel via-ninja-surface to-ninja-panel p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-flame-orange/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-flame-orange/20 px-3 py-1 text-xs font-mono font-bold text-flame-orange border border-flame-orange/30 mb-2">
              <Flame className="h-3.5 w-3.5" /> Konoha Shinobi Headquarters
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wide">
              Shinobi Tactical Command
            </h1>
            <p className="mt-2 text-sm text-gray-300 max-w-xl">
              Monitor ninja combat telemetry, launch adversarial AI simulations, and master game-theoretic jutsu strategies.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              glow
              leftIcon={<Swords className="h-5 w-5" />}
              onClick={() => {
                sound.playClick();
                navigate('/battle/setup');
              }}
            >
              Start New Battle
            </Button>
            <Button
              variant="secondary"
              size="lg"
              leftIcon={<Trophy className="h-5 w-5" />}
              onClick={() => {
                sound.playClick();
                navigate('/tournament');
              }}
            >
              Tournament
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Battles */}
        <GlowingCard glowColor="orange">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Battles</span>
            <Swords className="h-4 w-4 text-flame-orange" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalBattles.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-vitality-green font-mono">
            <TrendingUp className="h-3 w-3" /> {stats.completed} completed · {stats.inProgress} in progress
          </div>
        </GlowingCard>

        {/* Victories / Win Rate */}
        <GlowingCard glowColor="green">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Shinobi Win Rate</span>
            <Trophy className="h-4 w-4 text-vitality-green" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.shinobiWinRate === null ? '—' : `${stats.shinobiWinRate}%`}
          </div>
          <div className="mt-2 text-[11px] text-gray-400 font-mono">
            Player 1: {stats.p1Wins}W · {stats.p2Wins}L · {stats.draws}D
          </div>
        </GlowingCard>

        {/* Strongest AI Strategy */}
        <GlowingCard glowColor="purple">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Top AI Model</span>
            <Brain className="h-4 w-4 text-curse-purple" />
          </div>
          <div className="text-xl font-black text-white">
            {topAIName ?? 'Calculating…'}
          </div>
          <div className="mt-2 text-[11px] text-curse-purple font-mono font-bold">
            {stats.topAI ? `${stats.topAI.winRate}% win rate vs Greedy` : 'Running benchmark…'}
          </div>
        </GlowingCard>

        {/* Most Used Ninja */}
        <GlowingCard glowColor="orange">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Most Picked</span>
            <Users className="h-4 w-4 text-flame-orange" />
          </div>
          {stats.topCharacter ? (
            <div className="flex items-center gap-2">
              <CharacterVisual character={stats.topCharacter} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{stats.topCharacter.name}</div>
                <div className="text-[10px] text-gray-400 font-mono">{stats.topCharacterPicks} Deployments</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">No battles yet</div>
          )}
        </GlowingCard>

        {/* Jutsu Executed */}
        <GlowingCard glowColor="blue">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jutsu Simulated</span>
            <Zap className="h-4 w-4 text-chakra-blue" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {stats.totalJutsu.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-chakra-blue font-mono font-bold">
            Avg {stats.avgJutsuPerBattle} per battle
          </div>
        </GlowingCard>
      </div>

      {/* Quick Launchpad & Roster Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Launch Cards */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Tactical Operations
          </h3>

          <div
            onClick={() => {
              sound.playClick();
              navigate('/characters');
            }}
            className="flex items-center justify-between rounded-xl border border-ninja-border/70 bg-ninja-panel p-4 cursor-pointer hover:border-flame-orange/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-flame-orange/20 p-2.5 text-flame-orange">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Shinobi Roster</h4>
                <p className="text-xs text-gray-400">10 elite ninja &jutsu comparisons</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>

          <div
            onClick={() => {
              sound.playClick();
              navigate('/ai-lab');
            }}
            className="flex items-center justify-between rounded-xl border border-ninja-border/70 bg-ninja-panel p-4 cursor-pointer hover:border-chakra-blue/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-chakra-blue/20 p-2.5 text-chakra-blue">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">AI Laboratory</h4>
                <p className="text-xs text-gray-400">Head-to-head algorithm benchmarks</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>

          <div
            onClick={() => {
              sound.playClick();
              navigate('/ai-lab/game-tree');
            }}
            className="flex items-center justify-between rounded-xl border border-ninja-border/70 bg-ninja-panel p-4 cursor-pointer hover:border-curse-purple/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-curse-purple/20 p-2.5 text-curse-purple">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">Game Tree Explorer</h4>
                <p className="text-xs text-gray-400">Interactive minimax & alpha-beta tree</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Recent Battles Table */}
        <div className="lg:col-span-2 rounded-2xl border border-ninja-border/80 bg-ninja-panel/90 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-ninja-border/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-flame-orange" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Recent Engagements
              </h3>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                navigate('/history');
              }}
              className="text-xs font-mono text-flame-orange hover:underline"
            >
              View Full History →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-ninja-border/70 text-gray-400 uppercase">
                <tr>
                  <th className="py-2">Mode</th>
                  <th className="py-2">Combatants</th>
                  <th className="py-2">Rounds</th>
                  <th className="py-2">Outcome</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ninja-border/40">
                {recentBattles.map((b) => (
                  <tr key={b.id} className="hover:bg-ninja-card/50 transition-colors">
                    <td className="py-3">
                      <span className="rounded bg-ninja-border px-2 py-0.5 text-[10px] uppercase font-bold text-gray-300">
                        {b.mode}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 font-bold text-white">
                        <span>{b.player1.character.name}</span>
                        <span className="text-gray-500 font-normal">vs</span>
                        <span>{b.player2.character.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-300">Round {b.round}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === 'player1_won'
                            ? 'bg-flame-orange/20 text-flame-orange'
                            : b.status === 'player2_won'
                            ? 'bg-chakra-blue/20 text-chakra-blue'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {b.status === 'player1_won'
                          ? `${b.player1.character.name} Won`
                          : b.status === 'player2_won'
                          ? `${b.player2.character.name} Won`
                          : b.status === 'draw'
                          ? 'Draw'
                          : 'In Progress'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          sound.playClick();
                          navigate(`/battle/${b.id}`);
                        }}
                      >
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
    </motion.div>
  );
};
