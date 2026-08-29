/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        office: {
          50: '#f2f7fa',
          100: '#dceaf2',
          500: '#1d668c',
          600: '#155475',
          700: '#0f3d5e',
          800: '#0d334e',
          900: '#09263b',
        },
      },
      boxShadow: {
        panel: '0 4px 20px rgba(15, 61, 94, 0.08)',
      },
    },
  },
  plugins: [],
};
