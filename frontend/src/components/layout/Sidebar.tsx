import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Swords,
  Users,
  Compass,
  Cpu,
  Brain,
  GitFork,
  Trophy,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { sound } from '../../utils/sound';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  group?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: Compass },
  { name: 'Shinobi Roster', path: '/characters', icon: Users },
  { name: 'Battle Arena', path: '/battle/setup', icon: Swords, badge: 'PvP/PvE' },
  { name: 'AI Laboratory', path: '/ai-lab', icon: Cpu },
  { name: 'Decision Explainer', path: '/ai-lab/explainer', icon: Brain },
  { name: 'Game Tree Visualizer', path: '/ai-lab/game-tree', icon: GitFork },
  { name: 'Tournament', path: '/tournament', icon: Trophy, badge: '8 Ninja' },
  { name: 'Battle History', path: '/history', icon: History },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-ninja-border/80 bg-ninja-surface/95 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-18 items-center justify-between border-b border-ninja-border/70 px-4 py-4">
        <NavLink
          to="/"
          onClick={() => sound.playClick()}
          className="flex items-center gap-3 overflow-hidden text-decoration-none"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-flame-orange to-sharingan-red p-2 shadow-glow-orange">
            <Flame className="h-6 w-6 text-black fill-black" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-white text-sm">
                SHINOBI <span className="text-flame-orange">ARENA</span>
              </span>
              <span className="text-[10px] tracking-widest text-gray-400 font-mono">
                BATTLE SIMULATOR
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Nav List */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => sound.playClick()}
              className={({ isActive }) =>
                `group relative flex items-center gap-3.5 rounded-xl px-3 py-2.5 font-semibold text-xs tracking-wide transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-flame-orange/20 to-transparent text-flame-orange border-l-4 border-flame-orange shadow-[inset_1px_0_0_rgba(255,107,0,0.4)]'
                    : 'text-gray-400 hover:bg-ninja-card/80 hover:text-gray-100'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && <span className="truncate">{item.name}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-ninja-border px-2 py-0.5 text-[9px] font-mono text-gray-300">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="border-t border-ninja-border/70 p-3">
        <button
          onClick={() => {
            sound.playClick();
            setCollapsed(!collapsed);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-ninja-card/60 py-2 text-xs font-semibold text-gray-400 hover:bg-ninja-card hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>
      </div>
    </aside>
  );
};
