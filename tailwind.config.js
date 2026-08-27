/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#173541',
          secondary: '#557C86',
          tertiary: '#7299A8',
          light: '#85ADBB',
          accent: '#B49796',
          bg: '#FAFAF8',
        },
        ink: {
          primary: '#173541',
          secondary: '#557C86',
        }
      },
      borderRadius: {
        'tight': '4px',
        'control': '8px',
        'surface': '12px',
        'container': '16px',
      }
    },
  },
  plugins: [],
}

