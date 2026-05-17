import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0a0a",
          soft: "#1a1a1a",
        },
        cream: "#fafaf7",
        pastel: {
          rose: "#fbdce0",
          peach: "#fbe1d2",
          lavender: "#dde2fb",
          mint: "#d5ecdf",
          sky: "#d4e6fb",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui"],
        display: ["var(--font-jakarta)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        "2xl": "20px",
        "3xl": "28px",
        "4xl": "36px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        soft: "0 4px 24px 0 rgba(0, 0, 0, 0.04)",
        pop: "0 12px 40px -8px rgba(0, 0, 0, 0.12)",
      },
      backgroundImage: {
        "app-gradient":
          "linear-gradient(135deg, #e9d5ff 0%, #fce7f3 50%, #ffe4e6 100%)",
        "card-rose": "linear-gradient(135deg, #fbdce0 0%, #fdeaee 100%)",
        "card-lavender": "linear-gradient(135deg, #dde2fb 0%, #ebeefe 100%)",
        "card-peach": "linear-gradient(135deg, #fbe1d2 0%, #fceedb 100%)",
        "card-mint": "linear-gradient(135deg, #d5ecdf 0%, #e6f4ec 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
