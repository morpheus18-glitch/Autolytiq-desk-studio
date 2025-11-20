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

// Semantic status badge classes with dark mode support
export const dealStateColors: Record<string, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  APPROVED: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

// Vehicle condition colors with dark mode support
export const vehicleConditionColors: Record<string, string> = {
  new: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  certified: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  used: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
};

// Vehicle status colors with dark mode support
export const vehicleStatusColors: Record<string, string> = {
  available: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  hold: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  sold: 'bg-red-500/10 text-red-700 dark:text-red-400',
  in_transit: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
};

// Appointment status colors with dark mode support
export const appointmentStatusColors: Record<string, string> = {
  scheduled: 'bg-card hover:bg-muted/50 border-border',
  confirmed: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30',
  completed: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30',
  cancelled: 'bg-muted/50 border-muted opacity-60',
  no_show: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/30',
};

// Financial value colors with dark mode support
export const financialColors = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-blue-600 dark:text-blue-400',
};
