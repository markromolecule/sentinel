/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#323d8f',
        background: '#fff',
        foreground: '#11181C',
        muted: '#f4f4f5',
        border: '#e4e4e7',
        icon: '#687076',
        dark: {
          background: '#0f0f10',
          foreground: '#ECEDEE',
          muted: '#27272a',
          border: '#27272a',
          card: '#18181b',
        },
      },
    },
  },
  plugins: [],
};
