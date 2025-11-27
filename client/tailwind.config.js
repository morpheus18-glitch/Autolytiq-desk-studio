/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../shared/design-system/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Base colors with alpha support
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',

        // Primary colors
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          border: 'var(--primary-border)',
        },

        // Secondary colors
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
          foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)',
          border: 'var(--secondary-border)',
        },

        // Destructive (error) colors
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
          border: 'var(--destructive-border)',
        },

        // Success colors
        success: {
          DEFAULT: 'hsl(var(--success) / <alpha-value>)',
          foreground: 'hsl(var(--success-foreground) / <alpha-value>)',
          border: 'var(--success-border)',
        },

        // Warning colors
        warning: {
          DEFAULT: 'hsl(var(--warning) / <alpha-value>)',
          foreground: 'hsl(var(--warning-foreground) / <alpha-value>)',
          border: 'var(--warning-border)',
        },

        // Info colors
        info: {
          DEFAULT: 'hsl(var(--info) / <alpha-value>)',
          foreground: 'hsl(var(--info-foreground) / <alpha-value>)',
        },

        // Muted colors
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
          border: 'var(--muted-border)',
        },

        // Accent colors
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
          border: 'var(--accent-border)',
        },

        // Popover colors
        popover: {
          DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
          foreground: 'hsl(var(--popover-foreground) / <alpha-value>)',
          border: 'hsl(var(--popover-border) / <alpha-value>)',
        },

        // Card colors
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
          border: 'hsl(var(--card-border) / <alpha-value>)',
        },

        // Sidebar colors
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
          border: 'hsl(var(--sidebar-border) / <alpha-value>)',
          ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
        },
        'sidebar-primary': {
          DEFAULT: 'hsl(var(--sidebar-primary) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
        },
        'sidebar-accent': {
          DEFAULT: 'hsl(var(--sidebar-accent) / <alpha-value>)',
          foreground: 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
        },

        // Chart colors
        chart: {
          1: 'hsl(var(--chart-1) / <alpha-value>)',
          2: 'hsl(var(--chart-2) / <alpha-value>)',
          3: 'hsl(var(--chart-3) / <alpha-value>)',
          4: 'hsl(var(--chart-4) / <alpha-value>)',
          5: 'hsl(var(--chart-5) / <alpha-value>)',
        },

        // Status colors (for presence indicators, badges)
        status: {
          online: 'rgb(34 197 94)',
          away: 'rgb(245 158 11)',
          busy: 'rgb(239 68 68)',
          offline: 'rgb(156 163 175)',
        },
      },

      // Consistent border radius
      borderRadius: {
        lg: '0.75rem', // 12px
        md: '0.5rem', // 8px
        sm: '0.25rem', // 4px
      },

      // Font families
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
        serif: ['Georgia', 'serif'],
        mono: [
          'JetBrains Mono',
          '"SF Mono"',
          'Monaco',
          '"Cascadia Code"',
          '"Roboto Mono"',
          'Consolas',
          'monospace',
        ],
      },

      // Keyframes for animations
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(10px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },

      // Animation utilities
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.2s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.2s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.2s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
      },

      // Consistent spacing scale (optional additions)
      spacing: {
        18: '4.5rem',
        88: '22rem',
        112: '28rem',
        128: '32rem',
      },
    },
  },
  plugins: [],
};
