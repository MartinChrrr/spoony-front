/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#F7F0E8",
        "brown-dark": "#6B5744",
        "brown-medium": "#8B7355",
        "brown-light": "#C4B5A0",
        orange: "#C45E08",
        "orange-light": "#FFAB5C",
        white: "#FFFFFF",
        error: "#C62828",
        success: "#388E3C",
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
