 
/**
 * Theme System
 *
 * Light and dark theme definitions with automatic CSS variable generation.
 * Themes are applied via CSS custom properties for runtime switching.
 *
 * Usage:
 * - Use `useTheme()` hook to access current theme and toggle function
 * - Theme persists in localStorage
 * - Automatically applies to `<html>` class attribute
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode, JSX } from 'react';

/**
 * Theme type definition
 */
export type Theme = 'light' | 'dark';

/**
 * Theme context shape
 */
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Light Theme Colors
 *
 * Professional, high-contrast theme for daytime use
 */
export const lightTheme = {
  // Base colors
  background: '0 0% 100%', // White
  foreground: '222 47% 11%', // Very dark blue-gray

  // Cards and containers
  card: '0 0% 100%', // White
  cardForeground: '222 47% 11%',
  cardBorder: '214 32% 91%', // Light gray

  // Popover/Dropdown
  popover: '0 0% 100%',
  popoverForeground: '222 47% 11%',
  popoverBorder: '214 32% 91%',

  // Primary action color
  primary: '217 91% 60%', // Blue #2563EB
  primaryForeground: '0 0% 100%', // White text on blue

  // Secondary/muted actions
  secondary: '214 32% 91%', // Light slate
  secondaryForeground: '222 47% 11%', // Dark text

  // Muted backgrounds
  muted: '210 40% 96%', // Very light gray
  mutedForeground: '215 16% 47%', // Medium gray

  // Accent highlights
  accent: '38 92% 50%', // Amber #F59E0B
  accentForeground: '0 0% 100%', // White text on amber

  // Destructive/error
  destructive: '0 84% 60%', // Red #EF4444
  destructiveForeground: '0 0% 100%', // White text on red

  // Success
  success: '142 71% 45%', // Green #10B981
  successForeground: '0 0% 100%', // White text on green

  // Warning
  warning: '25 95% 53%', // Orange #F97316
  warningForeground: '0 0% 100%', // White text on orange

  // Info
  info: '199 89% 48%', // Cyan
  infoForeground: '0 0% 100%', // White text on cyan

  // Border and input
  border: '214 32% 91%', // Light gray
  input: '214 32% 91%', // Light gray
  ring: '217 91% 60%', // Primary blue for focus rings

  // Sidebar
  sidebar: '0 0% 98%', // Off-white
  sidebarForeground: '222 47% 11%',
  sidebarBorder: '214 32% 91%',
  sidebarPrimary: '217 91% 60%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: '210 40% 96%',
  sidebarAccentForeground: '222 47% 11%',
} as const;

/**
 * Dark Theme Colors
 *
 * Eye-friendly theme for low-light environments
 * Higher contrast for better readability
 */
export const darkTheme = {
  // Base colors
  background: '222 47% 11%', // Very dark blue-gray
  foreground: '210 40% 98%', // Off-white

  // Cards and containers
  card: '215 25% 17%', // Dark slate
  cardForeground: '210 40% 98%',
  cardBorder: '215 19% 25%', // Medium dark gray

  // Popover/Dropdown
  popover: '215 25% 17%',
  popoverForeground: '210 40% 98%',
  popoverBorder: '215 19% 25%',

  // Primary action color
  primary: '217 91% 60%', // Blue (slightly brighter in dark mode)
  primaryForeground: '0 0% 100%', // White text

  // Secondary/muted actions
  secondary: '215 25% 27%', // Medium dark slate
  secondaryForeground: '210 40% 98%', // Light text

  // Muted backgrounds
  muted: '215 25% 27%', // Medium dark gray
  mutedForeground: '215 20% 65%', // Medium light gray

  // Accent highlights
  accent: '38 92% 50%', // Amber (same as light mode)
  accentForeground: '0 0% 100%', // White text

  // Destructive/error
  destructive: '0 84% 60%', // Red (slightly muted)
  destructiveForeground: '0 0% 100%', // White text

  // Success
  success: '142 71% 45%', // Green
  successForeground: '0 0% 100%', // White text

  // Warning
  warning: '25 95% 53%', // Orange
  warningForeground: '0 0% 100%', // White text

  // Info
  info: '199 89% 48%', // Cyan
  infoForeground: '0 0% 100%', // White text

  // Border and input
  border: '215 19% 25%', // Medium dark gray
  input: '215 19% 25%', // Medium dark gray
  ring: '217 91% 60%', // Primary blue for focus rings

  // Sidebar
  sidebar: '222 47% 11%', // Same as background
  sidebarForeground: '210 40% 98%',
  sidebarBorder: '215 19% 25%',
  sidebarPrimary: '217 91% 60%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: '215 25% 27%',
  sidebarAccentForeground: '210 40% 98%',
} as const;

/**
 * Theme Provider Component
 *
 * Wraps the application and provides theme context
 */
interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'autolytiq-theme',
}: ThemeProviderProps): JSX.Element {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }

      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }

    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove old theme class
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(theme);

    // Apply theme CSS variables
    const themeColors = theme === 'dark' ? darkTheme : lightTheme;

    Object.entries(themeColors).forEach(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });
  }, [theme]);

  const setTheme = (newTheme: Theme): void => {
    localStorage.setItem(storageKey, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = (): void => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Theme Hook
 *
 * Access current theme and theme controls
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, toggleTheme } = useTheme();
 *
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current theme: {theme}
 *     </button>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Theme Toggle Component
 *
 * Pre-built toggle button for switching themes
 */
export function ThemeToggle(): JSX.Element {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}

/**
 * CSS Variable Generator
 *
 * Generates CSS variable declarations for use in global styles
 */
export function generateThemeCSS(): string {
  return `
    /* Light theme (default) */
    :root, .light {
      ${Object.entries(lightTheme)
        .map(([key, value]) => {
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          return `${cssVarName}: ${value};`;
        })
        .join('\n      ')}
    }

    /* Dark theme */
    .dark {
      ${Object.entries(darkTheme)
        .map(([key, value]) => {
          const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
          return `${cssVarName}: ${value};`;
        })
        .join('\n      ')}
    }
  `;
}
