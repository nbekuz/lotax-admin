/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    screens: {
      md: '768px',
      lg: '1200px',
      xl: '1440px',
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--lotax-primary)',
          hover: 'var(--lotax-primary-hover)',
          soft: 'var(--lotax-primary-soft)',
          dark: 'var(--lotax-text)',
        },
        surface: {
          DEFAULT: 'var(--lotax-bg)',
          card: 'var(--lotax-card)',
        },
        line: 'var(--lotax-border)',
        ink: {
          DEFAULT: 'var(--lotax-text)',
          muted: 'var(--lotax-text-secondary)',
          tertiary: 'var(--lotax-text-tertiary)',
        },
        danger: 'var(--lotax-danger)',
        success: 'var(--lotax-success)',
        warning: 'var(--lotax-warning)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        title: ['clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)', { lineHeight: '1.25', fontWeight: '650' }],
        section: ['clamp(1.05rem, 1rem + 0.3vw, 1.2rem)', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.5' }],
        caption: ['0.8125rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        card: 'var(--lotax-radius-lg)',
        control: 'var(--lotax-radius)',
        dialog: 'var(--lotax-radius-xl)',
      },
      boxShadow: {
        card: 'var(--lotax-shadow)',
        'card-hover': 'var(--lotax-shadow-hover)',
      },
      transitionDuration: {
        fast: '160ms',
      },
      spacing: {
        'page-mobile': '16px',
        'page-tablet': '24px',
        'page-desktop': '32px',
      },
    },
  },
  plugins: [],
}
