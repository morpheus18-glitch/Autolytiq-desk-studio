/**
 * AUTOLYTIQ DESIGN SYSTEM - UNIFIED DESIGN TOKENS
 * ==============================================
 *
 * This file is the single source of truth for all design patterns.
 * Import these tokens instead of hardcoding Tailwind classes.
 *
 * Usage:
 *   import { premiumCardClasses, layoutSpacing, statusColors } from '@/lib/design-tokens';
 *   <Card className={cn(premiumCardClasses, "additional-classes")} />
 */

// =============================================================================
// LAYOUT PATTERNS
// =============================================================================

/**
 * Standard container padding - use this for all page containers
 * Responsive: 16px mobile, 24px desktop
 */
export const containerPadding = "container mx-auto px-4 md:px-6";

/**
 * Page section spacing - vertical spacing between major sections
 */
export const layoutSpacing = {
  /** Page padding: py-8 (32px) */
  page: "py-8",
  /** Section gap: py-6 (24px) */
  section: "py-6",
  /** Header padding: py-5 (20px) */
  header: "py-5",
  /** Content padding: py-4 (16px) */
  content: "py-4",
  /** Compact spacing: py-3 (12px) */
  compact: "py-3",
} as const;

/**
 * Responsive grid layouts - standard column patterns
 */
export const gridLayouts = {
  /** 2 columns on desktop, 1 on mobile */
  twoCol: "grid grid-cols-1 md:grid-cols-2 gap-6",
  /** 3 columns: 1 mobile, 2 tablet, 3 desktop */
  threeCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  /** 4 columns: 1 mobile, 2 tablet, 4 desktop */
  fourCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
  /** 2 columns on desktop with larger gap */
  twoColWide: "grid grid-cols-1 md:grid-cols-2 gap-8",
  /** 3 columns with compact gap */
  threeColCompact: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
} as const;

/**
 * Flex layouts - common flex patterns
 */
export const flexLayouts = {
  /** Horizontal row with gap */
  row: "flex items-center gap-4",
  /** Horizontal row with small gap */
  rowCompact: "flex items-center gap-2",
  /** Vertical column with gap */
  col: "flex flex-col gap-4",
  /** Vertical column with small gap */
  colCompact: "flex flex-col gap-2",
  /** Space between items */
  between: "flex items-center justify-between",
  /** Center items */
  center: "flex items-center justify-center",
} as const;

// =============================================================================
// CARD PATTERNS
// =============================================================================

/**
 * Premium card with elevation, hover effect, and gradient background
 * Use this for featured content, metrics, and primary cards
 */
export const premiumCardClasses =
  "border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80";

/**
 * Standard card with subtle styling
 * Use this for regular content cards
 */
export const standardCardClasses =
  "border border-card-border shadow-sm hover-elevate transition-all";

/**
 * Interactive card - emphasizes clickability
 * Use this for cards that navigate or trigger actions
 */
export const interactiveCardClasses =
  "border border-card-border shadow-sm hover-elevate cursor-pointer group transition-all";

/**
 * Compact card - minimal spacing for dense layouts
 * Use this for list items or compact views
 */
export const compactCardClasses =
  "border border-card-border shadow-xs rounded-lg";

/**
 * Card content spacing patterns
 */
export const cardSpacing = {
  /** Standard card padding: p-6 (24px) */
  standard: "p-6",
  /** Compact card padding: p-4 (16px) */
  compact: "p-4",
  /** Large card padding: p-8 (32px) */
  large: "p-8",
  /** Card header: pb-3 (12px bottom) */
  header: "pb-3",
  /** No top padding (for content after header): pt-0 */
  contentAfterHeader: "pt-0",
} as const;

// =============================================================================
// STATUS & SEMANTIC COLORS
// =============================================================================

/**
 * Deal state colors with dark mode support
 * Use these for deal status badges and indicators
 */
export const dealStateColors: Record<string, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  DELIVERED: 'bg-green-600/10 text-green-700 dark:text-green-400 border-green-600/20',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  PENDING: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
};

/**
 * Vehicle condition colors with dark mode support
 */
export const vehicleConditionColors: Record<string, string> = {
  new: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  certified: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  used: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
};

/**
 * Vehicle status colors with dark mode support
 */
export const vehicleStatusColors: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  hold: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  sold: 'bg-red-500/10 text-red-700 dark:text-red-400',
  in_transit: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

/**
 * Appointment status colors with dark mode support
 */
export const appointmentStatusColors: Record<string, string> = {
  scheduled: 'bg-card hover:bg-muted/50 border-border',
  confirmed: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30',
  completed: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30',
  cancelled: 'bg-muted/50 border-muted opacity-60',
  no_show: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/30',
};

/**
 * Generic status colors for success, warning, error, info
 * Use these for status badges, alerts, and indicators
 */
export const statusColors = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  error: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  neutral: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
} as const;

/**
 * Financial value colors (for numbers indicating money)
 * Use these for profit/loss, positive/negative indicators
 */
export const financialColors = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-blue-600 dark:text-blue-400',
  muted: 'text-muted-foreground',
} as const;

// =============================================================================
// ICON CONTAINERS & METRIC DISPLAYS
// =============================================================================

/**
 * Icon container for metrics and stats
 * Standardized size and styling for icon backgrounds
 */
export const metricIconContainerClasses =
  "flex items-center justify-center w-10 h-10 rounded-lg";

/**
 * Large icon container for hero sections
 */
export const heroIconContainerClasses =
  "flex items-center justify-center w-12 h-12 rounded-xl";

/**
 * Metric icon background colors (10% opacity)
 */
export const metricIconColors = {
  primary: "bg-primary/10",
  blue: "bg-blue-500/10",
  green: "bg-green-500/10",
  emerald: "bg-emerald-500/10",
  purple: "bg-purple-500/10",
  amber: "bg-amber-500/10",
  red: "bg-red-500/10",
} as const;

/**
 * Metric icon foreground colors (text/icon color)
 */
export const metricIconForegroundColors = {
  primary: "text-primary",
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  purple: "text-purple-600 dark:text-purple-400",
  amber: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
} as const;

// =============================================================================
// BADGE PATTERNS
// =============================================================================

/**
 * Badge size variants
 */
export const badgeSizes = {
  sm: "text-xs px-2 py-0.5 rounded",
  md: "text-sm px-2.5 py-0.5 rounded-md",
  lg: "text-sm px-3 py-1 rounded-md",
} as const;

/**
 * Badge style variants
 */
export const badgeStyles = {
  solid: "font-semibold",
  outline: "font-medium border",
  subtle: "font-medium",
} as const;

// =============================================================================
// PAGE HEADER PATTERNS
// =============================================================================

/**
 * Sticky page header background (with blur effect)
 */
export const stickyHeaderClasses =
  "sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm";

/**
 * Page title styling
 */
export const pageTitleClasses =
  "text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent";

/**
 * Page subtitle styling
 */
export const pageSubtitleClasses =
  "text-sm text-muted-foreground font-medium mt-0.5";

/**
 * Section title styling
 */
export const sectionTitleClasses =
  "text-lg font-semibold text-foreground";

// =============================================================================
// BUTTON PATTERNS
// =============================================================================

/**
 * Primary action button (use sparingly - one per page)
 */
export const primaryButtonClasses =
  "gap-2 shadow-lg shadow-primary/20";

/**
 * Loading button state classes
 */
export const loadingButtonClasses =
  "cursor-not-allowed opacity-70";

// =============================================================================
// EMPTY STATE PATTERNS
// =============================================================================

/**
 * Empty state container
 */
export const emptyStateClasses =
  "flex flex-col items-center justify-center py-12 px-4 text-center";

/**
 * Empty state icon container
 */
export const emptyStateIconClasses =
  "w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4";

/**
 * Empty state text
 */
export const emptyStateTextClasses = {
  title: "text-lg font-semibold text-foreground mb-2",
  description: "text-sm text-muted-foreground max-w-md",
} as const;

// =============================================================================
// ERROR STATE PATTERNS
// =============================================================================

/**
 * Error state container
 */
export const errorStateClasses =
  "flex flex-col items-center justify-center py-8 px-4 text-center";

/**
 * Error state icon
 */
export const errorStateIconClasses =
  "w-12 h-12 text-destructive mb-3";

/**
 * Error state text
 */
export const errorStateTextClasses = {
  title: "text-base font-semibold text-destructive mb-1",
  description: "text-sm text-muted-foreground",
} as const;

// =============================================================================
// LOADING STATE PATTERNS
// =============================================================================

/**
 * Skeleton loader classes for different content types
 */
export const skeletonClasses = {
  text: "h-4 bg-muted rounded animate-pulse",
  title: "h-6 bg-muted rounded animate-pulse",
  button: "h-9 bg-muted rounded-md animate-pulse",
  card: "h-32 bg-muted rounded-xl animate-pulse",
  avatar: "w-10 h-10 bg-muted rounded-full animate-pulse",
} as const;

// =============================================================================
// FORM PATTERNS
// =============================================================================

/**
 * Form section spacing
 */
export const formSpacing = {
  section: "space-y-6",
  fields: "space-y-4",
  fieldGroup: "space-y-2",
  inline: "flex gap-4",
} as const;

/**
 * Form field container
 */
export const formFieldClasses =
  "space-y-2";

/**
 * Form actions (buttons at bottom)
 */
export const formActionsClasses =
  "flex items-center gap-3 pt-6 border-t";

// =============================================================================
// ANIMATION CLASSES (from index.css)
// =============================================================================

/**
 * Standard elevation and animation classes
 * These are defined in index.css and should be used consistently
 */
export const animations = {
  /** Subtle hover lift effect */
  hoverElevate: "hover-elevate",
  /** Click press down effect */
  activeElevate: "active-elevate-2",
  /** Toggle state background */
  toggleElevate: "toggle-elevate",
  /** Fade in animation */
  fadeIn: "fade-in",
  /** Smooth transition */
  transition: "transition-all",
} as const;

// =============================================================================
// ACCESSIBILITY PATTERNS
// =============================================================================

/**
 * Screen reader only text (accessible but invisible)
 */
export const srOnlyClasses = "sr-only";

/**
 * Focus visible ring (keyboard navigation)
 */
export const focusRingClasses =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// =============================================================================
// RESPONSIVE PATTERNS
// =============================================================================

/**
 * Hide on mobile, show on desktop
 */
export const hideOnMobile = "hidden md:flex";

/**
 * Hide on desktop, show on mobile
 */
export const hideOnDesktop = "flex md:hidden";

/**
 * Responsive text sizes
 */
export const responsiveText = {
  xs: "text-xs md:text-sm",
  sm: "text-sm md:text-base",
  base: "text-base md:text-lg",
  lg: "text-lg md:text-xl",
  xl: "text-xl md:text-2xl",
  "2xl": "text-2xl md:text-3xl",
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get status color by status string
 * @param status - Status string (e.g., 'success', 'error', 'warning')
 * @returns Tailwind classes for the status color
 */
export function getStatusColor(status: keyof typeof statusColors): string {
  return statusColors[status] || statusColors.neutral;
}

/**
 * Get deal state color by state
 * @param state - Deal state (e.g., 'DRAFT', 'IN_PROGRESS')
 * @returns Tailwind classes for the deal state
 */
export function getDealStateColor(state: string): string {
  return dealStateColors[state] || statusColors.neutral;
}

/**
 * Get metric icon classes (container + foreground)
 * @param color - Color key
 * @returns Object with container and icon classes
 */
export function getMetricIconClasses(color: keyof typeof metricIconColors) {
  return {
    container: `${metricIconContainerClasses} ${metricIconColors[color]}`,
    icon: metricIconForegroundColors[color],
  };
}

// =============================================================================
// TYPE EXPORTS (for TypeScript autocomplete)
// =============================================================================

export type LayoutSpacingKey = keyof typeof layoutSpacing;
export type GridLayoutKey = keyof typeof gridLayouts;
export type FlexLayoutKey = keyof typeof flexLayouts;
export type StatusColorKey = keyof typeof statusColors;
export type FinancialColorKey = keyof typeof financialColors;
export type MetricIconColorKey = keyof typeof metricIconColors;
export type BadgeSizeKey = keyof typeof badgeSizes;
export type SkeletonKey = keyof typeof skeletonClasses;
