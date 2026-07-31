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
          DEFAULT: '#F7931A',
          hover: '#E8860F',
          soft: 'rgba(247, 147, 26, 0.1)',
          dark: '#111111',
        },
        surface: {
          DEFAULT: '#F8F9FB',
          card: '#FFFFFF',
        },
        line: '#ECECEC',
        ink: {
          DEFAULT: '#111111',
          muted: '#6B7280',
        },
        danger: '#EF4444',
        success: '#22C55E',
        warning: '#F59E0B',
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
        title: ['clamp(1.75rem, 1.5rem + 1.2vw, 2.25rem)', { lineHeight: '1.2', fontWeight: '600' }],
        section: ['clamp(1.25rem, 1.15rem + 0.4vw, 1.375rem)', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)', { lineHeight: '1.5' }],
        caption: ['clamp(0.75rem, 0.72rem + 0.1vw, 0.8125rem)', { lineHeight: '1.4' }],
      },
      borderRadius: {
        card: '16px',
        dialog: '24px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 17, 0.04), 0 4px 16px rgba(17, 17, 17, 0.04)',
        'card-hover':
          '0 4px 12px rgba(17, 17, 17, 0.06), 0 12px 32px rgba(17, 17, 17, 0.06)',
      },
      transitionDuration: {
        fast: '150ms',
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
