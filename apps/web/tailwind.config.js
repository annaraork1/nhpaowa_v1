/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          soft: 'var(--sidebar-soft)',
          muted: 'var(--sidebar-muted)',
        },
        brand: 'var(--brand)',
        'brand-soft': 'var(--brand-soft)',
        'brand-muted': 'var(--brand-muted)',
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
        display: ['"DM Sans"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px color-mix(in srgb, var(--shadow) 8%, transparent), 0 8px 24px color-mix(in srgb, var(--shadow) 12%, transparent)',
      },
    },
  },
  plugins: [],
};
