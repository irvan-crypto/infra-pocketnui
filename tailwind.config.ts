import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#1a56db",
          600: "#1a56db",
          700: "#11398f",
          800: "#0f2f72",
          900: "#0c275f",
          950: "#081b42",
        },
        sidebar: {
          DEFAULT: "#1a56db",
          hover: "#2563eb",
          active: "#11398f",
        },
        brand: {
          50: "#e8effc",
          100: "#dbe8fb",
          200: "#bcd1f7",
          300: "#8eb3f0",
          400: "#5b8ae8",
          500: "#1a56db",
          600: "#1243af",
          700: "#11398f",
          800: "#0f2f72",
          900: "#0c275f",
        },
      },
      boxShadow: {
        soft: "0 20px 50px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};
export default config;