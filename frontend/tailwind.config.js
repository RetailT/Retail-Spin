/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B00',
        'primary-dark': '#E05E00',
        surface: '#FFFFFF',
        background: '#F7F7FB'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(0, 0, 0, 0.15)'
      }
    }
  },
  plugins: []
};
