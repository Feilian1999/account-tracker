/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      colors: {
        'fab-violet': 'rgba(139,92,246,0.5)',
        'fab-blue': 'rgba(37,99,235,0.5)',
        'fab-indigo': 'rgba(79,70,229,0.5)',
        'fab-emerald': 'rgba(5,150,105,0.5)',
      }
    },
  },
  plugins: [],
}
