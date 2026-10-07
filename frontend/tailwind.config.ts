import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Hex (not CSS vars) so opacity modifiers like bg-teal/10 work. Keep in sync with globals.css.
      colors: {
        teal: { DEFAULT: "#0F4C4A", 2: "#17625F" },
        sun: { DEFAULT: "#FFC530", deep: "#E8A800" },
        ground: "#EEF3F2",
        paper: "#FFFFFF",
        ink: "#161616",
        muted: "#5B6B69",
        line: "#D3DDDB",
        debt: "#C2412D",
        cash: "#1D7A4A",
      },
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
      },
      borderRadius: { panel: "14px", btn: "18px" },
    },
  },
  plugins: [],
};

export default config;
