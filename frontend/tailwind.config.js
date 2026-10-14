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
        steel: {
          50: '#f4f6f8',
          100: '#e5e9ee',
          200: '#cbd4df',
          300: '#a3b5c8',
          400: '#7591ad',
          500: '#537293',
          600: '#3f5876',
          700: '#34475f',
          800: '#2d3c4e',
          900: '#1b2533',
          950: '#0f1722',
        },
        plant: {
          bg: '#0a0e17',
          card: '#121926',
          border: '#1f2a3d',
          accent: '#0284c7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace']
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2.5s ease-in-out infinite alternate',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
