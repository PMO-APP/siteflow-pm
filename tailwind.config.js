/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0c1014',
          2: '#111820',
          3: '#161f28',
          4: '#1c2a36',
          5: '#22333f',
        },
        gold: {
          DEFAULT: '#c49e48',
          2: '#e3c06a',
          dim: 'rgba(196,158,72,0.15)',
        },
        cream: {
          DEFAULT: '#ede8de',
          2: '#bfb9ae',
        },
        dust: '#6e7d8c',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderColor: {
        gold: 'rgba(196,158,72,0.2)',
        subtle: 'rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
