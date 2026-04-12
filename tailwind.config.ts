import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    screens: {
      'xs': '320px',   // Extra small devices (small phones)
      'sm': '480px',   // Small devices (large phones) 
      'md': '768px',   // Medium devices (tablets)
      'lg': '1024px',  // Large devices (laptops)
      'xl': '1280px',  // Extra large devices (desktops)
      '2xl': '1536px', // 2X large devices (large desktops)
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'brand-yellow': '#FFCC00',
        'brand-red': '#FF4D4D',
        'brand-blue': '#1363DF',
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // Stitch PDF Studio Colors
        "surface-variant": "#2e3447",
        "on-primary-container": "#006970",
        "primary-container": "#00f0ff",
        "secondary-fixed-dim": "#ebb2ff",
        "error": "#ffb4ab",
        "secondary-container": "#b600f8",
        "surface-dim": "#0c1324",
        "surface-bright": "#33394c",
        "on-surface": "#dce1fb",
        "inverse-primary": "#006970",
        "surface-container-highest": "#2e3447",
        "on-secondary-fixed": "#320047",
        "surface": "#0c1324",
        "tertiary-fixed": "#dee0ff",
        "error-container": "#93000a",
        "tertiary-container": "#d3d7ff",
        "on-tertiary": "#001d93",
        "on-surface-variant": "#b9cacb",
        "inverse-on-surface": "#2a3043",
        "on-primary": "#00363a",
        "surface-container": "#191f31",
        "secondary-fixed": "#f8d8ff",
        "outline-variant": "#3b494b",
        "primary-fixed": "#7df4ff",
        "on-background": "#dce1fb",
        "tertiary-fixed-dim": "#bbc3ff",
        "surface-container-high": "#23293c",
        "surface-tint": "#00dbe9",
        "surface-container-low": "#151b2d",
        "on-error-container": "#ffdad6",
        "tertiary": "#f7f5ff",
        "on-tertiary-fixed-variant": "#002ccd",
        "surface-container-lowest": "#070d1f",
        "on-secondary-fixed-variant": "#74009f",
        "on-tertiary-container": "#2948ef",
        "on-error": "#690005",
        "on-secondary-container": "#fff6fc",
        "on-primary-fixed-variant": "#004f54",
        "on-tertiary-fixed": "#000f5d",
        "on-primary-fixed": "#002022",
        "on-secondary": "#520072",
        "primary-fixed-dim": "#00dbe9",
        "inverse-surface": "#dce1fb",
        "outline": "#849495",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        bengali: ["var(--font-bengali)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        headline: ["Space Grotesk", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
        display: ["Space Grotesk", "sans-serif"],
      },
      aspectRatio: {
        'shorts': '9 / 16',
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
