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
          bg: '#f8fafc',          // Pure clean canvas
          card: '#ffffff',        // Crisp white card
          surface: '#f0f9ff',     // Ice blue tint
          border: '#e0f2fe',      // Light sky blue border
          accent: '#0284c7',      // Sky blue vibrant accent
          neon: '#0ea5e9',        // Radiant glacier blue
          green: '#10b981',       // Emerald success/win
          emerald: '#10b981',
          red: '#ef4444',
          gold: '#f59e0b',
        },
        glacier: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
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
          '0%': { boxShadow: '0 0 5px rgba(56, 189, 248, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}
