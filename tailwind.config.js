/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  // Força dark mode via classe — NativeWind usa isso
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── DoMore Palette ───────────────────────────────────────────────
        neon:     '#AAFF00',
        bg:       '#0A0A0F',
        surface:  '#17171D',
        surface2: '#1E1E26',
        card:     '#1A1A22',
        card2:    '#20202A',
        // Text
        text:     '#F2F2FF',
        text2:    '#C8C8E0',
        muted:    '#7A7A96',
        muted2:   '#4A4A62',
        // Borders
        border:   '#252530',
        border2:  '#303040',
        // Finance
        income:   '#00E5A0',
        expense:  '#FF6060',
        savings:  '#C084FC',
        credit:   '#FFBB45',
      },
    },
  },
  plugins: [],
};
