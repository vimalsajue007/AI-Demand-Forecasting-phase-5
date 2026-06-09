export default {
  darkMode:"class",
  content:["./index.html","./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { primary: { 50:"#f0fdf4",100:"#dcfce7",200:"#bbf7d0",300:"#86efac",400:"#4ade80",500:"#22c55e",600:"#16a34a",700:"#15803d",800:"#166534",900:"#14532d",950:"#052e16" } },
      fontFamily: { sans:["'DM Sans'","sans-serif"], display:["'Syne'","sans-serif"], mono:["'JetBrains Mono'","monospace"] },
      boxShadow: { glass:"0 8px 32px 0 rgba(22,101,52,0.1)", "green-glow":"0 0 20px rgba(34,197,94,0.3)" },
    },
  },
  plugins:[],
};
