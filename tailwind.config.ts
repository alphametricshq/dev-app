import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "hsl(220 18% 7%)",
          subtle: "hsl(220 16% 10%)",
          card: "hsl(220 14% 12%)",
          hover: "hsl(220 14% 15%)",
        },
        border: {
          DEFAULT: "hsl(220 12% 18%)",
          strong: "hsl(220 12% 24%)",
        },
        fg: {
          DEFAULT: "hsl(220 10% 95%)",
          muted: "hsl(220 8% 65%)",
          subtle: "hsl(220 8% 45%)",
        },
        accent: {
          DEFAULT: "hsl(265 85% 65%)",
          hover: "hsl(265 85% 70%)",
          subtle: "hsl(265 50% 25%)",
        },
        success: "hsl(150 60% 50%)",
        warning: "hsl(40 90% 60%)",
        danger: "hsl(0 70% 60%)",
        github: {
          0: "hsl(220 14% 14%)",
          1: "hsl(140 40% 25%)",
          2: "hsl(140 50% 35%)",
          3: "hsl(140 60% 45%)",
          4: "hsl(140 70% 55%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
