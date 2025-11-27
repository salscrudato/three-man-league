/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme backgrounds
        page: '#F8FAFC',        // Very light neutral (slate-50)
        surface: '#FFFFFF',      // White cards
        subtle: '#F1F5F9',       // Light gray sections (slate-100)
        elevated: '#FFFFFF',     // Elevated surfaces

        // Primary accent - Emerald/Teal sports theme
        primary: {
          DEFAULT: '#059669',    // emerald-600
          soft: '#D1FAE5',       // emerald-100
          hover: '#047857',      // emerald-700
          active: '#065F46',     // emerald-800
          muted: '#A7F3D0',      // emerald-200
        },

        // Secondary accent - Blue for additional emphasis
        secondary: {
          DEFAULT: '#0284C7',    // sky-600
          soft: '#E0F2FE',       // sky-100
          hover: '#0369A1',      // sky-700
        },

        // Neutral text colors
        text: {
          primary: '#1E293B',    // slate-800 - Strong dark gray
          secondary: '#475569',  // slate-600 - Medium gray
          muted: '#64748B',      // slate-500 - Labels
          subtle: '#94A3B8',     // slate-400 - Very subtle
          inverted: '#FFFFFF',   // White text on dark
        },

        // Border colors
        border: {
          DEFAULT: '#E2E8F0',    // slate-200 - Default border
          subtle: '#F1F5F9',     // slate-100 - Very subtle
          strong: '#CBD5E1',     // slate-300 - Strong border
        },

        // Feedback colors
        success: {
          DEFAULT: '#059669',    // emerald-600
          soft: '#ECFDF5',       // emerald-50
          text: '#065F46',       // emerald-800
        },
        warning: {
          DEFAULT: '#D97706',    // amber-600
          soft: '#FFFBEB',       // amber-50
          text: '#92400E',       // amber-800
        },
        error: {
          DEFAULT: '#DC2626',    // red-600
          soft: '#FEF2F2',       // red-50
          text: '#991B1B',       // red-800
        },
        info: {
          DEFAULT: '#0284C7',    // sky-600
          soft: '#F0F9FF',       // sky-50
          text: '#075985',       // sky-800
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'page-title': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],  // 30px
        'section-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }], // 20px
        'card-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],        // 16px
        'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],         // 15px
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],      // 14px
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],          // 12px
        'tiny': ['0.6875rem', { lineHeight: '0.875rem', fontWeight: '400' }],       // 11px
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
      },
      borderRadius: {
        'card': '0.75rem',   // 12px
        'button': '0.5rem',  // 8px
        'input': '0.5rem',   // 8px
        'badge': '0.375rem', // 6px
        'full': '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        'container': '72rem', // 1152px
      },
      ringColor: {
        primary: '#059669',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};

