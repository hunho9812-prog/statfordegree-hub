import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Helvetica",
          '"Apple Color Emoji"',
          "Arial",
          "sans-serif",
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
      },
      colors: {
        notion: {
          bg: "#ffffff",
          sidebar: "#f7f6f3",
          text: "#37352f",
          muted: "#9b9a97",
          border: "#e9e9e7",
          hover: "rgba(55, 53, 47, 0.08)",
          red: "#e03e3e",
          orange: "#d9730d",
          yellow: "#dfab01",
          green: "#0f7b6c",
          blue: "#0b6e99",
          purple: "#6940a5",
          pink: "#ad1a72",
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: "#37352f",
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
