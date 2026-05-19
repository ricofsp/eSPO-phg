/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semua warna ini di-resolve via CSS variable — otomatis switch light/dark
        dark: {
          primary:        'var(--c-bg)',
          secondary:      'var(--c-surface)',
          card:           'var(--c-card)',
          hover:          'var(--c-hover)',
          border:         'var(--c-border)',
          'border-hover': 'var(--c-border-hover)',
        },
        ink: {
          DEFAULT: 'var(--c-text)',
          muted:   'var(--c-text-muted)',
          faint:   'var(--c-text-faint)',
        },
        accent: {
          DEFAULT: '#F97316',
          hover:   '#EA6B0C',
          light:   '#FED7AA',
          dark:    '#C2410C',
          muted:   '#7C3206',
        },
        status: {
          aktif:   '#16A34A',
          pending: '#D97706',
          arsip:   '#64748B',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        mono:    ['"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      animation: {
        'fade-in':   'fadeIn 0.2s ease-out',
        'slide-up':  'slideUp 0.25s ease-out',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                                 to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
