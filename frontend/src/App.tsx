import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import {
  CharactersPage,
  BattleSetupPage,
  BattleArenaPage,
  AILabPage,
  AIDecisionExplainerPage,
  GameTreeVisualizerPage,
  TournamentPage,
  AnalyticsPage,
  BattleHistoryPage,
  SettingsPage,
} from './pages/Pages';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Characters & Comparison */}
        <Route path="/characters" element={<CharactersPage />} />

        {/* Battle Arena & Setup */}
        <Route path="/battle/setup" element={<BattleSetupPage />} />
        <Route path="/battle/:id" element={<BattleArenaPage />} />

        {/* AI Laboratory, Decision Explainer, and Game Tree */}
        <Route path="/ai-lab" element={<AILabPage />} />
        <Route path="/ai-lab/explainer" element={<AIDecisionExplainerPage />} />
        <Route path="/ai-lab/game-tree" element={<GameTreeVisualizerPage />} />

        {/* Tournament Bracket */}
        <Route path="/tournament" element={<TournamentPage />} />

        {/* Analytics & Metrics */}
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Match History Archive */}
        <Route path="/history" element={<BattleHistoryPage />} />

        {/* User Settings */}
        <Route path="/settings" element={<SettingsPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
