/**
 * Design System Tokens
 *
 * Centralized design tokens for the Autolytiq platform.
 * These tokens define the visual language and ensure consistency across all components.
 *
 * Usage:
 * - Import tokens in components: `import { spacing, colors, typography } from '@/design-system/tokens'`
 * - Reference in Tailwind: Tokens are mapped to CSS custom properties
 * - Theme-aware: Colors adapt to light/dark mode automatically
 */

/**
 * Color System
 *
 * Professional palette optimized for dealership management.
 * All colors are HSL-based for easy theming and accessibility.
 */
export const colors = {
  // Primary - Professional Blue (Trust, reliability)
  primary: {
    50: 'hsl(214, 100%, 97%)',
    100: 'hsl(214, 95%, 93%)',
    200: 'hsl(213, 97%, 87%)',
    300: 'hsl(212, 96%, 78%)',
    400: 'hsl(213, 94%, 68%)',
    500: 'hsl(217, 91%, 60%)', // Base - #2563EB
    600: 'hsl(221, 83%, 53%)',
    700: 'hsl(224, 76%, 48%)',
    800: 'hsl(226, 71%, 40%)',
    900: 'hsl(224, 64%, 33%)',
    950: 'hsl(226, 57%, 21%)',
  },

  // Secondary - Slate Gray (Professional, neutral)
  secondary: {
    50: 'hsl(210, 40%, 98%)',
    100: 'hsl(210, 40%, 96%)',
    200: 'hsl(214, 32%, 91%)',
    300: 'hsl(213, 27%, 84%)',
    400: 'hsl(215, 20%, 65%)',
    500: 'hsl(215, 16%, 47%)', // Base - #64748B
    600: 'hsl(215, 19%, 35%)',
    700: 'hsl(215, 25%, 27%)',
    800: 'hsl(217, 33%, 17%)',
    900: 'hsl(222, 47%, 11%)',
    950: 'hsl(229, 84%, 5%)',
  },

  // Accent - Amber (Action, attention)
  accent: {
    50: 'hsl(48, 100%, 96%)',
    100: 'hsl(48, 96%, 89%)',
    200: 'hsl(48, 97%, 77%)',
    300: 'hsl(46, 97%, 65%)',
    400: 'hsl(43, 96%, 56%)',
    500: 'hsl(38, 92%, 50%)', // Base - #F59E0B
    600: 'hsl(32, 95%, 44%)',
    700: 'hsl(26, 90%, 37%)',
    800: 'hsl(23, 83%, 31%)',
    900: 'hsl(22, 78%, 26%)',
    950: 'hsl(21, 92%, 14%)',
  },

  // Semantic Colors
  success: {
    50: 'hsl(142, 76%, 96%)',
    100: 'hsl(141, 84%, 93%)',
    200: 'hsl(141, 79%, 85%)',
    300: 'hsl(142, 77%, 73%)',
    400: 'hsl(142, 69%, 58%)',
    500: 'hsl(142, 71%, 45%)', // Base - #10B981
    600: 'hsl(142, 76%, 36%)',
    700: 'hsl(142, 72%, 29%)',
    800: 'hsl(143, 64%, 24%)',
    900: 'hsl(144, 61%, 20%)',
    950: 'hsl(145, 80%, 10%)',
  },

  error: {
    50: 'hsl(0, 86%, 97%)',
    100: 'hsl(0, 93%, 94%)',
    200: 'hsl(0, 96%, 89%)',
    300: 'hsl(0, 94%, 82%)',
    400: 'hsl(0, 91%, 71%)',
    500: 'hsl(0, 84%, 60%)', // Base - #EF4444
    600: 'hsl(0, 72%, 51%)',
    700: 'hsl(0, 74%, 42%)',
    800: 'hsl(0, 70%, 35%)',
    900: 'hsl(0, 63%, 31%)',
    950: 'hsl(0, 75%, 16%)',
  },

  warning: {
    50: 'hsl(33, 100%, 96%)',
    100: 'hsl(34, 100%, 92%)',
    200: 'hsl(32, 98%, 83%)',
    300: 'hsl(31, 97%, 72%)',
    400: 'hsl(27, 96%, 61%)',
    500: 'hsl(25, 95%, 53%)', // Base - #F97316
    600: 'hsl(21, 90%, 48%)',
    700: 'hsl(17, 88%, 40%)',
    800: 'hsl(15, 79%, 34%)',
    900: 'hsl(15, 75%, 28%)',
    950: 'hsl(13, 81%, 15%)',
  },

  info: {
    50: 'hsl(204, 100%, 97%)',
    100: 'hsl(204, 94%, 94%)',
    200: 'hsl(201, 94%, 86%)',
    300: 'hsl(199, 95%, 74%)',
    400: 'hsl(198, 93%, 60%)',
    500: 'hsl(199, 89%, 48%)',
    600: 'hsl(200, 98%, 39%)',
    700: 'hsl(201, 96%, 32%)',
    800: 'hsl(201, 90%, 27%)',
    900: 'hsl(202, 80%, 24%)',
    950: 'hsl(204, 80%, 16%)',
  },

  // Neutral - For backgrounds, borders, text
  neutral: {
    50: 'hsl(0, 0%, 98%)',
    100: 'hsl(0, 0%, 96%)',
    200: 'hsl(0, 0%, 90%)',
    300: 'hsl(0, 0%, 83%)',
    400: 'hsl(0, 0%, 64%)',
    500: 'hsl(0, 0%, 45%)',
    600: 'hsl(0, 0%, 32%)',
    700: 'hsl(0, 0%, 25%)',
    800: 'hsl(0, 0%, 15%)',
    900: 'hsl(0, 0%, 9%)',
    950: 'hsl(0, 0%, 4%)',
  },
} as const;

/**
 * Typography Scale
 *
 * Type scale based on a 1.25 ratio (Major Third)
 * Optimized for readability on screens 13" - 27"
 */
export const typography = {
  // Font Families
  fontFamily: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'JetBrains Mono, "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },

  // Font Sizes (with line heights)
  fontSize: {
    xs: {
      size: '0.75rem', // 12px
      lineHeight: '1rem', // 16px
      letterSpacing: '0.01em',
    },
    sm: {
      size: '0.875rem', // 14px
      lineHeight: '1.25rem', // 20px
      letterSpacing: '0em',
    },
    base: {
      size: '1rem', // 16px
      lineHeight: '1.5rem', // 24px
      letterSpacing: '0em',
    },
    lg: {
      size: '1.125rem', // 18px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.01em',
    },
    xl: {
      size: '1.25rem', // 20px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.01em',
    },
    '2xl': {
      size: '1.5rem', // 24px
      lineHeight: '2rem', // 32px
      letterSpacing: '-0.02em',
    },
    '3xl': {
      size: '1.875rem', // 30px
      lineHeight: '2.25rem', // 36px
      letterSpacing: '-0.02em',
    },
    '4xl': {
      size: '2.25rem', // 36px
      lineHeight: '2.5rem', // 40px
      letterSpacing: '-0.03em',
    },
    '5xl': {
      size: '3rem', // 48px
      lineHeight: '1', // 48px
      letterSpacing: '-0.03em',
    },
    '6xl': {
      size: '3.75rem', // 60px
      lineHeight: '1', // 60px
      letterSpacing: '-0.04em',
    },
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

/**
 * Spacing Scale
 *
 * 8-point grid system (4px base unit)
 * Provides consistent rhythm and alignment
 */
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

/**
 * Border Radius
 *
 * Rounded corners for modern, friendly UI
 */
export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  DEFAULT: '0.5rem', // 8px
  md: '0.625rem', // 10px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem', // 32px
  full: '9999px',
} as const;

/**
 * Shadow System
 *
 * Elevation system for depth and hierarchy
 * Based on Material Design 3 principles
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Elevation-specific (semantic)
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

/**
 * Z-Index Scale
 *
 * Layering system for overlapping elements
 */
export const zIndex = {
  auto: 'auto',
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50,

  // Semantic z-index
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

/**
 * Transition Durations
 *
 * Consistent timing for animations and transitions
 */
export const transitions = {
  // Durations
  duration: {
    instant: '75ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  // Easing functions
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Semantic easing
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  // Common transition properties
  default: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  colors:
    'background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: 'opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  shadow: 'box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Breakpoints
 *
 * Responsive design breakpoints
 * Mobile-first approach
 */
export const breakpoints = {
  xs: '475px', // Small phones
  sm: '640px', // Phones
  md: '768px', // Tablets
  lg: '1024px', // Laptops
  xl: '1280px', // Desktops
  '2xl': '1536px', // Large desktops

  // Semantic breakpoints
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
} as const;

/**
 * Container Widths
 *
 * Max widths for content containers
 */
export const containers = {
  xs: '20rem', // 320px
  sm: '24rem', // 384px
  md: '28rem', // 448px
  lg: '32rem', // 512px
  xl: '36rem', // 576px
  '2xl': '42rem', // 672px
  '3xl': '48rem', // 768px
  '4xl': '56rem', // 896px
  '5xl': '64rem', // 1024px
  '6xl': '72rem', // 1152px
  '7xl': '80rem', // 1280px
  full: '100%',
} as const;

/**
 * Focus Ring
 *
 * Consistent focus indicators for accessibility
 */
export const focusRing = {
  default: '0 0 0 3px rgba(37, 99, 235, 0.5)', // primary-500 with 50% opacity
  error: '0 0 0 3px rgba(239, 68, 68, 0.5)', // error-500 with 50% opacity
  success: '0 0 0 3px rgba(16, 185, 129, 0.5)', // success-500 with 50% opacity

  // Focus ring offset
  offset: '2px',
} as const;

/**
 * Interactive Element Sizes
 *
 * Minimum sizes for touch targets (WCAG AA)
 */
export const touchTargets = {
  minimum: '44px', // WCAG AA minimum
  comfortable: '48px', // Recommended
  large: '56px', // Large buttons
} as const;
