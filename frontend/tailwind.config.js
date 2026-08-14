/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'rgba(10, 10, 15, 1)',
        card: 'rgba(20, 20, 30, 0.5)',
        primary: {
          DEFAULT: '#8b5cf6', // Violet
          hover: '#7c3aed',
        },
        secondary: {
          DEFAULT: '#3b82f6', // Blue
          hover: '#2563eb',
        },
        border: 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glow: '0 0 15px rgba(139, 92, 246, 0.15)',
      },
    },
  },
  plugins: [],
}
