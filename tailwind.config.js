/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        nastaliq: ["'Noto Nastaliq Urdu'", "serif"],
      },
    },
  },
  plugins: [],
};
