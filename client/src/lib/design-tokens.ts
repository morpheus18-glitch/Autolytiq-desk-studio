/**
 * Shared design tokens and utility classes for consistent UI across the application
 */

// Premium card classes matching dashboard design
export const premiumCardClasses = "border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80";

// Standard responsive grid layouts
export const gridLayouts = {
  twoCol: "grid grid-cols-1 md:grid-cols-2 gap-5",
  threeCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5",
  fourCol: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5",
};

// Container padding
export const containerPadding = "container mx-auto px-4 md:px-6";

// Standard spacing
export const spacing = {
  section: "py-8",
  cardContent: "p-6",
  cardHeader: "pb-3",
};

// Icon container for metrics/stats
export const metricIconContainerClasses = "flex items-center justify-center w-10 h-10 rounded-lg";

// Metric icon colors (with background and foreground)
export const metricIconColors = {
  primary: "bg-primary/10",
  blue: "bg-blue-500/10",
  green: "bg-green-500/10",
  purple: "bg-purple-500/10",
  emerald: "bg-emerald-500/10",
  amber: "bg-amber-500/10",
};

export const metricIconForegroundColors = {
  primary: "text-primary",
  blue: "text-blue-600 dark:text-blue-400",
  green: "text-green-600 dark:text-green-400",
  purple: "text-purple-600 dark:text-purple-400",
  emerald: "text-emerald-600 dark:text-emerald-400",
  amber: "text-amber-600 dark:text-amber-400",
};
