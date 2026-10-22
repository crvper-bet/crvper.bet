/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crvper: {
          bg: '#090e17',
          card: '#0f1826',
          surface: '#142135',
          border: '#1b2c45',
          accent: '#00e701',
          neon: '#10b981',
          green: '#00e701',
          emerald: '#10b981',
          red: '#ef4444',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 210, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 210, 255, 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
