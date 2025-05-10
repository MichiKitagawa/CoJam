// frontend/tailwind.config.js
const colors = require('tailwindcss/colors')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/globals.css',
    
  ],
  theme: {
    extend: {
      // 既存のカスタムカラーを残しつつ…
      colors: {
        black: '#000000',
        // ここで default の neutral パレットを丸ごと取り込む
        neutral: colors.neutral,
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
    },
  },
  plugins: [],
}
