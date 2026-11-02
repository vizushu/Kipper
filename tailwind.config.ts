import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm neutral hospitality palette — paper, stone, espresso, clay.
        paper: "#F6F3EB",
        panel: "#FFFCF6",
        line: "#C7CDBF",
        cream: "#E8E9DF",
        ink: "#283D32",
        espresso: "#283D32",
        clay: {
          DEFAULT: "#344D3C",
          dark: "#283D32",
          soft: "#E8E9DF",
        },
        moss: "#586451",
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
