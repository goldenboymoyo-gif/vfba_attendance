/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: '#A61E22', dark: '#7D171A' },
        cream: '#F7F3EA',
        ink: '#1C1917',
        gold: '#A67C2E',
        surface: {
          light: '#FFFFFF',
          'light-2': '#F6F3EE',
          dark: '#191615',
          'dark-2': '#201C1A',
        },
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,25,23,.04), 0 2px 10px -4px rgba(28,25,23,.06)',
        lg2: '0 16px 40px -18px rgba(28,25,23,.28)',
      },
    },
  },
  plugins: [],
};
