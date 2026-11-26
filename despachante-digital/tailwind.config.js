/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2F4F7', ink: '#0F1B2D', mute: '#5B6678', line: '#D8DEE6',
        verde: { DEFAULT: '#0B6B4F', dark: '#084F3a', soft: '#E3F2EC' },
        sol: { DEFAULT: '#F5C400', soft: '#FFF6CC' },
        rubi: '#C8102E',
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] },
    },
  },
  plugins: [],
};
