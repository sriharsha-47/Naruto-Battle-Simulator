import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { CharacterBaseStats } from '../../types/character';

interface StatRadarProps {
  stats: CharacterBaseStats;
  compareStats?: CharacterBaseStats;
  name?: string;
  compareName?: string;
}

export const StatRadar: React.FC<StatRadarProps> = ({
  stats,
  compareStats,
  name = 'Stats',
  compareName = 'Compare',
}) => {
  // Normalize stats to 0-100 scale for clean radar presentation
  const data = [
    { subject: 'HP', A: Math.round((stats.hp / 1400) * 100), B: compareStats ? Math.round((compareStats.hp / 1400) * 100) : 0, fullMark: 100 },
    { subject: 'Chakra', A: Math.round((stats.chakra / 1400) * 100), B: compareStats ? Math.round((compareStats.chakra / 1400) * 100) : 0, fullMark: 100 },
    { subject: 'Attack', A: stats.attack, B: compareStats ? compareStats.attack : 0, fullMark: 100 },
    { subject: 'Defense', A: stats.defense, B: compareStats ? compareStats.defense : 0, fullMark: 100 },
    { subject: 'Speed', A: stats.speed, B: compareStats ? compareStats.speed : 0, fullMark: 100 },
  ];

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="#2e2e2e" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#a3a3a3', fontSize: 11, fontWeight: 600 }} />
          <Radar
            name={name}
            dataKey="A"
            stroke="#FF6B00"
            fill="#FF6B00"
            fillOpacity={0.45}
          />
          {compareStats && (
            <Radar
              name={compareName}
              dataKey="B"
              stroke="#00BFFF"
              fill="#00BFFF"
              fillOpacity={0.4}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
