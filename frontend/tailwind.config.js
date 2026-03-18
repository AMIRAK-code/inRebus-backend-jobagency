/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce8ff',
          200: '#b9d0ff',
          300: '#85acff',
          400: '#527dff',
          500: '#2d52f5',
          600: '#1c35eb',
          700: '#1526d8',
          800: '#1722af',
          900: '#182289',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
