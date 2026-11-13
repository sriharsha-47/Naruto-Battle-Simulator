import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ParticlesBackground } from '../common/ParticlesBackground';

export const Layout: React.FC = () => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  if (isLandingPage) {
    return (
      <div className="relative min-h-screen bg-ninja-bg text-gray-100 overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen bg-ninja-bg text-gray-100 antialiased overflow-hidden">
      {/* Background ambient particles */}
      <ParticlesBackground particleCount={30} opacity={0.3} particleColor="orange" />

      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main content column */}
      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <Header />
        <main className="flex-1 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
