/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            a: {
              color: '#3b82f6',
              '&:hover': {
                color: '#2563eb',
              },
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
        dark: {
          css: {
            color: '#f3f4f6',
            a: {
              color: '#60a5fa',
              '&:hover': {
                color: '#93c5fd',
              },
            },
            h1: {
              color: '#f3f4f6',
            },
            h2: {
              color: '#f3f4f6',
            },
            h3: {
              color: '#f3f4f6',
            },
            h4: {
              color: '#f3f4f6',
            },
            blockquote: {
              color: '#d1d5db',
              borderLeftColor: '#4b5563',
            },
            'thead, tbody tr': {
              borderBottomColor: '#374151',
            },
            strong: {
              color: '#f3f4f6',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // You'll need to install this plugin
  ],
}