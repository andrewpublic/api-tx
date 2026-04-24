/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fff4f0",
          100: "#ffe4d6",
          500: "#fe795d",
          600: "#e05a3f",
          700: "#a5371b",
        },
      },
    },
  },
  plugins: [],
};
