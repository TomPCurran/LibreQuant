import type { Config } from "tailwindcss";

const config = {
  // Add this line to enable class-based dark mode
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          teal: "#0d9488",
          rose: "#e11d48",
          gray: "#6e6e73",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "grid-pattern": "var(--grid-pattern)",
      },
      keyframes: {
        "soft-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.01)" },
        },
      },
      animation: {
        "soft-pulse": "soft-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
} satisfies Config;

export default config;
