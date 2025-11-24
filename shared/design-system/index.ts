/**
 * Autolytiq Design System
 *
 * Complete design system for the Autolytiq dealership management platform.
 *
 * @example
 * ```tsx
 * // Import components
 * import { Button, Card, PageHeader } from '@/design-system';
 *
 * // Import tokens
 * import { colors, spacing, typography } from '@/design-system';
 *
 * // Import theme
 * import { ThemeProvider, useTheme } from '@/design-system';
 * ```
 */

// Components
export * from './components';

// Design tokens
export * from './tokens';

// Theme system
export {
  ThemeProvider,
  useTheme,
  ThemeToggle,
  lightTheme,
  darkTheme,
  generateThemeCSS,
} from './themes';
export type { Theme } from './themes';
