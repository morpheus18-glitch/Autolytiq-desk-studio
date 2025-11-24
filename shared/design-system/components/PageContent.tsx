/**
 * PageContent Component
 *
 * Main content wrapper for pages with consistent padding, spacing, and responsive grid.
 * Provides layout patterns for common page structures.
 *
 * Usage:
 * ```tsx
 * <PageContent>
 *   <Card>Content here</Card>
 * </PageContent>
 *
 * // With grid layout
 * <PageContent layout="grid" columns={3}>
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </PageContent>
 * ```
 */

import type { ReactNode, JSX } from 'react';

/**
 * Constants for grid columns to avoid magic numbers
 */
const GRID_COLUMNS = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
} as const;

/**
 * Column count type using constants
 */
type ColumnCount =
  | typeof GRID_COLUMNS.ONE
  | typeof GRID_COLUMNS.TWO
  | typeof GRID_COLUMNS.THREE
  | typeof GRID_COLUMNS.FOUR;

/**
 * Layout types
 */
export type PageContentLayout = 'default' | 'grid' | 'centered' | 'split';

/**
 * PageContent Props
 */
export interface PageContentProps {
  /**
   * Page content
   */
  children: ReactNode;

  /**
   * Layout pattern
   * - default: Standard vertical flow with max-width container
   * - grid: Responsive grid layout
   * - centered: Centered content with smaller max-width
   * - split: Two-column layout (sidebar + main)
   * @default 'default'
   */
  layout?: PageContentLayout;

  /**
   * Number of columns for grid layout
   * @default 3
   */
  columns?: ColumnCount;

  /**
   * Maximum width of content
   * @default '7xl' (1280px)
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';

  /**
   * Whether to show loading skeleton
   * @default false
   */
  loading?: boolean;

  /**
   * Custom CSS classes
   */
  className?: string;

  /**
   * Additional padding (adds to default padding)
   * @default false
   */
  noPadding?: boolean;
}

/**
 * PageContent Component
 */
export function PageContent({
  children,
  layout = 'default',
  columns = GRID_COLUMNS.THREE,
  maxWidth = '7xl',
  loading = false,
  className = '',
  noPadding = false,
}: PageContentProps): JSX.Element {
  if (loading) {
    return <PageContentSkeleton layout={layout} columns={columns} />;
  }

  // Base classes
  const baseClasses = noPadding ? '' : 'px-4 py-6 sm:px-6 lg:px-8';

  // Max width classes
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  // Layout-specific classes
  const layoutClasses = {
    default: `${maxWidthClasses[maxWidth]} mx-auto space-y-6`,
    grid: `${maxWidthClasses[maxWidth]} mx-auto grid gap-6 ${getGridColumns(columns)}`,
    centered: `${maxWidthClasses.lg} mx-auto space-y-6`,
    split: `${maxWidthClasses[maxWidth]} mx-auto grid gap-6 lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr]`,
  };

  return <main className={`${baseClasses} ${layoutClasses[layout]} ${className}`}>{children}</main>;
}

/**
 * Get grid column classes based on column count
 */
function getGridColumns(columns: ColumnCount): string {
  const columnMap = {
    [GRID_COLUMNS.ONE]: 'grid-cols-1',
    [GRID_COLUMNS.TWO]: 'grid-cols-1 md:grid-cols-2',
    [GRID_COLUMNS.THREE]: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    [GRID_COLUMNS.FOUR]: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return columnMap[columns];
}

/**
 * PageContentSkeleton
 *
 * Loading skeleton for PageContent
 */
interface PageContentSkeletonProps {
  layout?: PageContentLayout;
  columns?: ColumnCount;
}

export function PageContentSkeleton({
  layout = 'default',
  columns = GRID_COLUMNS.THREE,
}: PageContentSkeletonProps): JSX.Element {
  const skeletonCards = Array.from({ length: columns * GRID_COLUMNS.TWO }, (_, i) => (
    <div key={i} className="rounded-lg border border-border bg-card p-6">
      <div className="space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
      </div>
    </div>
  ));

  return (
    <PageContent layout={layout} columns={columns}>
      {skeletonCards}
    </PageContent>
  );
}

/**
 * PageContentSection
 *
 * Section within PageContent with optional heading
 */
interface PageContentSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageContentSection({
  children,
  title,
  description,
  actions,
  className = '',
}: PageContentSectionProps): JSX.Element {
  return (
    <section className={`space-y-6 ${className}`}>
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            )}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * PageContentGrid
 *
 * Responsive grid layout for cards/items
 */
interface PageContentGridProps {
  children: ReactNode;
  columns?: ColumnCount;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PageContentGrid({
  children,
  columns = GRID_COLUMNS.THREE,
  gap = 'md',
  className = '',
}: PageContentGridProps): JSX.Element {
  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={`grid ${getGridColumns(columns)} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * PageContentEmpty
 *
 * Empty state component for pages with no content
 */
interface PageContentEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function PageContentEmpty({
  icon,
  title,
  description,
  action,
}: PageContentEmptyProps): JSX.Element {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/10 px-4 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/**
 * PageContentError
 *
 * Error state component for pages that failed to load
 */
interface PageContentErrorProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function PageContentError({
  title = 'Something went wrong',
  description = 'An error occurred while loading this page. Please try again.',
  action,
}: PageContentErrorProps): JSX.Element {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
