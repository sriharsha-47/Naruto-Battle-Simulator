/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ninja: {
          bg: '#0a0a0a',
          surface: '#111111',
          panel: '#181818',
          card: '#1f1f1f',
          border: '#2a2a2a',
          muted: '#888888',
        },
        chakra: {
          blue: '#00BFFF',
          cyan: '#38bdf8',
          deep: '#0088FF',
          glow: 'rgba(0, 191, 255, 0.4)',
        },
        flame: {
          orange: '#FF6B00',
          amber: '#FF8C00',
          yellow: '#FFD700',
          glow: 'rgba(255, 107, 0, 0.4)',
        },
        sharingan: {
          red: '#EF4444',
          crimson: '#DC2626',
          dark: '#991B1B',
          glow: 'rgba(239, 68, 68, 0.4)',
        },
        curse: {
          purple: '#8B5CF6',
          violet: '#7C3AED',
          indigo: '#4F46E5',
          glow: 'rgba(139, 92, 246, 0.4)',
        },
        vitality: {
          green: '#22C55E',
          emerald: '#10B981',
          heal: '#16A34A',
          glow: 'rgba(34, 197, 94, 0.4)',
        }
      },
      fontFamily: {
        ninja: ['Montserrat', 'Impact', 'system-ui', 'sans-serif'],
        display: ['Cinzel', 'Trajan Pro', 'Georgia', 'serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 20px rgba(255, 107, 0, 0.5), 0 0 40px rgba(255, 107, 0, 0.2)',
        'glow-blue': '0 0 20px rgba(0, 191, 255, 0.5), 0 0 40px rgba(0, 191, 255, 0.2)',
        'glow-purple': '0 0 20px rgba(139, 92, 246, 0.5), 0 0 40px rgba(139, 92, 246, 0.2)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.5), 0 0 40px rgba(34, 197, 94, 0.2)',
        'card-elevated': '0 10px 30px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'chakra-flow': 'chakraFlow 2s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'flash': 'flash 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-10px)' },
          '40%': { transform: 'translateX(10px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        flash: {
          '0%': { opacity: '0.9' },
          '100%': { opacity: '0' },
        },
        chakraFlow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(0, 191, 255, 0.6))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(0, 191, 255, 0.9))' },
        }
      }
    },
  },
  plugins: [],
}
