import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ykb: {
          page: "#1366B2",
          primary: "#004990",
          footer: "#0455A5",
          secondary: "#0AA3F1",
          "step-inactive": "#CFCFCF",
          "input-border": "#B6B6B6",
          "kvkk-bg": "#F5F5F5",
          promo: "#FFF8E1",
          "promo-accent": "#F5A623",
        },
      },
      fontFamily: {
        ubuntu: ["var(--font-ubuntu)", "Ubuntu", "sans-serif"],
      },
      maxWidth: {
        card: "940px",
      },
    },
  },
  plugins: [],
};

export default config;
