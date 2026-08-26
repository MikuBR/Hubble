/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#18181b',
        text: '#fafafa',
        'text-muted': '#a1a1aa',
        accent: '#6366f1',
        'accent-hover': '#4f46e5',
        border: '#27272a',
        'border-hover': '#3f3f46',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
        info: '#3b82f6',
        'rating-L': '#22c55e',
        'rating-10': '#3b82f6',
        'rating-12': '#06b6d4',
        'rating-14': '#f59e0b',
        'rating-16': '#f97316',
        'rating-18': '#ef4444',
        'prestige-winner': '#fbbf24',
        'prestige-nominee': '#9ca3af',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
