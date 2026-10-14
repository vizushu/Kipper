import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral hospitality palette — paper, stone, espresso, clay.
        paper: "#FAF8F5",
        cream: "#F3EFE8",
        ink: "#1C1917",
        espresso: "#292524",
        clay: {
          DEFAULT: "#A8552F",
          dark: "#8A4526",
          soft: "#F5E9DF",
        },
        moss: "#4D5B4A",
      },
      fontFamily: {
        // CSS variables are set by next/font/google in src/app/layout.tsx.
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        // Restrained shadows only.
        card: "0 1px 2px rgba(28,25,23,0.05), 0 4px 16px rgba(28,25,23,0.06)",
        lift: "0 2px 4px rgba(28,25,23,0.06), 0 12px 32px rgba(28,25,23,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
