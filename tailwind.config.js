/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './packages/renderer/index.html',
    './packages/renderer/**/*.{ts,tsx}',
    './packages/main/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        orb: {
          dark: '#0a0a0b',
          panel: '#141416',
          sidebar: '#0f0f11',
          border: '#27272a',
          accent: '#ffffff',
          muted: '#a1a1aa',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
