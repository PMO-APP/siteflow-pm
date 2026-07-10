/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0f1115',
          2: '#151922',
          3: '#1b202b',
          4: '#222936',
          5: '#2b3442',
        },
        primary: {
          DEFAULT: '#3b82f6',
          2: '#60a5fa',
          dim: 'rgba(59,130,246,0.12)',
        },
        success: {
          DEFAULT: '#22c55e',
          dim: 'rgba(34,197,94,0.12)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          dim: 'rgba(245,158,11,0.12)',
        },
        danger: {
          DEFAULT: '#ef4444',
          dim: 'rgba(239,68,68,0.12)',
        },
        cream: {
          DEFAULT: '#f8fafc',
          2: '#cbd5e1',
        },
        dust: '#94a3b8',
        slateLine: '#262b36',

        // Backward compatibility only.
        // Existing .btn-gold / text-gold classes will now render as primary blue,
        // so the gold accent is removed system-wide without breaking old pages.
        gold: {
          DEFAULT: '#3b82f6',
          2: '#60a5fa',
          dim: 'rgba(59,130,246,0.12)',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderColor: {
        primary: 'rgba(59,130,246,0.18)',
        subtle: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
}
