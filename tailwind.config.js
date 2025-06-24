/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fuel: {
          green: '#00F58C',
          black: '#000000',
          gray: '#1A1A1A',
        }
      }
    },
  },
  plugins: [],
}