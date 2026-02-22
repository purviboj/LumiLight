/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'lumi-bg': '#0A0F1C',
        'lumi-accent': '#3B82F6'
      }
    }
  },
  plugins: []
};
