import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { navy: "#10233F", brand: "#2563EB" }, boxShadow: { soft: "0 8px 30px rgba(15,23,42,.06)" } } }, plugins: [] };
export default config;
