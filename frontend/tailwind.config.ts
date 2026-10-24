import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { ink: "#12243a", teal: "#0d9488" } } }, plugins: [] };
export default config;
