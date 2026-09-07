/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'primary-yellow': '#FFF3C4',
        'background-cream': '#FFFDF7',
        'text-dark': '#2B2B2B',
        'accent-coral': '#FF8A73',
      },
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
        display: ['Fredoka', 'sans-serif'],
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 138, 115, 0.6)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255, 138, 115, 0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        glow: 'glow 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
