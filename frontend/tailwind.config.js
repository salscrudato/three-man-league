/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark-light balance
        page: '#FAFAFA',          // Near white base
        surface: '#FFFFFF',       // Pure white cards
        subtle: '#F4F4F5',        // Zinc-100
        elevated: '#FFFFFF',      // Elevated surfaces
        muted: '#FAFAFA',         // Very light muted bg

        // Primary accent - Refined emerald
        primary: {
          DEFAULT: '#059669',     // Emerald-600 (deeper)
          soft: '#ECFDF5',        // Emerald-50
          hover: '#047857',       // Emerald-700
          active: '#065F46',      // Emerald-800
          muted: '#D1FAE5',       // Emerald-100
          dark: '#064E3B',        // Emerald-900
        },

        // Secondary accent - Cool slate
        secondary: {
          DEFAULT: '#3F3F46',     // Zinc-700
          soft: '#F4F4F5',        // Zinc-100
          hover: '#27272A',       // Zinc-800
        },

        // Neutral text - Zinc scale (warmer than slate)
        text: {
          primary: '#18181B',     // Zinc-900
          secondary: '#52525B',   // Zinc-600
          muted: '#71717A',       // Zinc-500
          subtle: '#A1A1AA',      // Zinc-400
          inverted: '#FFFFFF',
        },

        // Border colors - Zinc scale
        border: {
          DEFAULT: '#E4E4E7',     // Zinc-200
          subtle: '#F4F4F5',      // Zinc-100
          strong: '#D4D4D8',      // Zinc-300
        },

        // Semantic colors - refined
        success: {
          DEFAULT: '#059669',
          soft: '#ECFDF5',
          text: '#065F46',
        },
        warning: {
          DEFAULT: '#D97706',
          soft: '#FFFBEB',
          text: '#92400E',
        },
        error: {
          DEFAULT: '#DC2626',
          soft: '#FEF2F2',
          text: '#991B1B',
        },
        info: {
          DEFAULT: '#2563EB',
          soft: '#EFF6FF',
          text: '#1E40AF',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '600', letterSpacing: '-0.025em' }],
        'section-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        'card-title': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        'body': ['0.8125rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        'body-sm': ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        'caption': ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }],
        'tiny': ['0.625rem', { lineHeight: '0.875rem', fontWeight: '500' }],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.03), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'dropdown': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.15)',
        'inner-soft': 'inset 0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'glow-primary': '0 0 20px -5px rgb(5 150 105 / 0.3)',
        'glow-sm': '0 0 10px -3px rgb(5 150 105 / 0.2)',
        'ring': '0 0 0 2px rgb(5 150 105 / 0.15)',
      },
      borderRadius: {
        'card': '0.625rem',   // 10px
        'button': '0.375rem', // 6px
        'input': '0.375rem',  // 6px
        'badge': '0.25rem',   // 4px
        'full': '9999px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        'container': '68rem', // 1088px - more compact
      },
      ringColor: {
        primary: '#059669',
      },
      animation: {
        'fade-in': 'fadeIn 0.12s ease-out',
        'fade-in-up': 'fadeInUp 0.15s ease-out',
        'slide-up': 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};

