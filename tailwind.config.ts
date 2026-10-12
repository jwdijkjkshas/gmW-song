import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#0a0a0c", moon: "#b7a4f5", rose: "#d6a9c4", mute: "#8a8a96" } } },
  plugins: [],
} satisfies Config;
