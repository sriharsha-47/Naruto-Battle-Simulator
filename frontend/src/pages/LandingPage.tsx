import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ParticlesBackground } from '../components/common/ParticlesBackground';
import { Button } from '../components/common/Button';
import { Swords, Users, Cpu, Flame, Shield, Trophy } from 'lucide-react';
import { sound } from '../utils/sound';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleEnter = (path: string) => {
    sound.playClick();
    navigate(path);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 select-none">
      {/* Dynamic Shinobi Ember Particles */}
      <ParticlesBackground particleCount={70} particleColor="mixed" opacity={0.65} />

      {/* Subtle Ninja Radial Glow Backdrop */}
      <div className="pointer-events-none absolute h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-flame-orange/15 to-chakra-blue/15 blur-[120px]" />

      {/* Main Hero Container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        className="relative z-10 mx-auto max-w-4xl text-center"
      >
        {/* Crest Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-flame-orange/40 bg-flame-orange/10 px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-widest text-flame-orange shadow-glow-orange mb-8">
          <Flame className="h-4 w-4 fill-flame-orange" />
          <span>Advanced Shinobi Battle Engine & AI Laboratory</span>
        </div>

        {/* Big Epic Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-wider text-white text-glow-orange leading-tight font-ninja">
          THE WILL OF <span className="text-flame-orange">SHINOBI</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl text-gray-300 font-medium tracking-wide leading-relaxed">
          Every move has a consequence. Every battle has a strategy.
        </p>

        {/* 3 Glowing CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-5">
          <Button
            variant="primary"
            size="xl"
            glow
            leftIcon={<Swords className="h-5 w-5" />}
            onClick={() => handleEnter('/battle/setup')}
            className="w-full sm:w-auto"
          >
            ENTER THE BATTLE
          </Button>

          <Button
            variant="chakra"
            size="xl"
            glow
            leftIcon={<Users className="h-5 w-5" />}
            onClick={() => handleEnter('/characters')}
            className="w-full sm:w-auto"
          >
            EXPLORE THE SHINOBI
          </Button>

          <Button
            variant="secondary"
            size="xl"
            leftIcon={<Cpu className="h-5 w-5" />}
            onClick={() => handleEnter('/ai-lab')}
            className="w-full sm:w-auto"
          >
            AI LABORATORY
          </Button>
        </div>

        {/* Shinobi Features Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
          <div
            onClick={() => handleEnter('/battle/setup')}
            className="group cursor-pointer rounded-2xl border border-ninja-border/70 bg-ninja-surface/80 p-5 backdrop-blur-md hover:border-flame-orange/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-flame-orange/20 text-flame-orange mb-3 group-hover:scale-110 transition-transform">
              <Swords className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">Combat Arena</h4>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Tactical turn-based battles with animated jutsu, critical strikes, and shields.
            </p>
          </div>

          <div
            onClick={() => handleEnter('/ai-lab')}
            className="group cursor-pointer rounded-2xl border border-ninja-border/70 bg-ninja-surface/80 p-5 backdrop-blur-md hover:border-chakra-blue/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chakra-blue/20 text-chakra-blue mb-3 group-hover:scale-110 transition-transform">
              <Cpu className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">7 AI Decision Models</h4>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              Minimax, Alpha-Beta Pruning, MCTS, Expectiminimax, and learned Q-heuristic evaluators.
            </p>
          </div>

          <div
            onClick={() => handleEnter('/tournament')}
            className="group cursor-pointer rounded-2xl border border-ninja-border/70 bg-ninja-surface/80 p-5 backdrop-blur-md hover:border-vitality-green/50 hover:bg-ninja-card transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vitality-green/20 text-vitality-green mb-3 group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-white text-base">Chūnin Exams Tournament</h4>
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              8-ninja elimination bracket pitting tactical AI algorithms against each other.
            </p>
          </div>
        </div>

        {/* Enter Dashboard shortcut */}
        <div className="mt-10">
          <button
            onClick={() => handleEnter('/dashboard')}
            className="text-xs font-mono font-semibold text-gray-400 hover:text-flame-orange transition-colors uppercase tracking-widest inline-flex items-center gap-1.5"
          >
            <span>Proceed Directly to Shinobi Command Dashboard →</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
