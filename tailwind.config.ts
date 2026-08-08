import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#FFB800",
          dark: "#E89D00",
        },
        honey: "#FFF3CF",
        cream: "#FFFCF5",
        ink: "#111111",
        muted: "#666666",
        line: "#ECE7DD",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 12px rgba(17, 17, 17, 0.05)",
        card: "0 4px 24px rgba(17, 17, 17, 0.06)",
        lift: "0 12px 32px rgba(17, 17, 17, 0.10)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bee-hover": {
          "0%, 100%": { transform: "translateY(0) rotate(-4deg)" },
          "50%": { transform: "translateY(-6px) rotate(4deg)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        "bee-hover": "bee-hover 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
