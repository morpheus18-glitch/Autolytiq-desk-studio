/* eslint-disable no-unused-vars */
/**
 * PageHeader Component
 *
 * Consistent header for all pages in the application.
 * Provides title, breadcrumbs, and action buttons in a standardized layout.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Deals"
 *   breadcrumbs={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Deals', href: '/deals' },
 *     { label: 'New Deal' }
 *   ]}
 *   actions={
 *     <Button>Create Deal</Button>
 *   }
 * />
 * ```
 */

import type { ReactNode, JSX } from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Breadcrumb item type
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

/**
 * PageHeader Props
 */
export interface PageHeaderProps {
  /**
   * Page title - displayed prominently
   */
  title: string;

  /**
   * Optional subtitle or description
   */
  subtitle?: string;

  /**
   * Breadcrumb navigation items
   * Last item is considered the current page (no href)
   */
  breadcrumbs?: BreadcrumbItem[];

  /**
   * Action buttons or controls (displayed on the right)
   */
  actions?: ReactNode;

  /**
   * Additional content below the header (e.g., tabs, filters)
   */
  children?: ReactNode;

  /**
   * Custom CSS classes
   */
  className?: string;

  /**
   * Whether to show a bottom border
   * @default true
   */
  showBorder?: boolean;
}

/**
 * PageHeader Component
 */
export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  className = '',
  showBorder = true,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      className={`
        bg-background
        ${showBorder ? 'border-b border-border' : ''}
        ${className}
      `}
    >
      {/* Main header content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4 flex items-center space-x-2 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight
                        className="mx-2 h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}

                    {isLast ? (
                      <span
                        className="flex items-center font-medium text-foreground"
                        aria-current="page"
                      >
                        {item.icon && <span className="mr-2 inline-flex">{item.icon}</span>}
                        {item.label}
                      </span>
                    ) : (
                      <a
                        href={item.href}
                        className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.icon && <span className="mr-2 inline-flex">{item.icon}</span>}
                        {item.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Title and actions row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle && <p className="mt-2 text-base text-muted-foreground">{subtitle}</p>}
          </div>

          {actions && <div className="flex flex-shrink-0 items-center gap-3">{actions}</div>}
        </div>
      </div>

      {/* Additional content (tabs, filters, etc.) */}
      {children && <div className="border-t border-border px-4 sm:px-6 lg:px-8">{children}</div>}
    </header>
  );
}

/**
 * PageHeaderSkeleton
 *
 * Loading skeleton for PageHeader
 */
export function PageHeaderSkeleton(): JSX.Element {
  return (
    <header className="border-b border-border bg-background">
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <div className="mb-4 flex items-center space-x-2">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>

        {/* Title skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-9 w-48 animate-pulse rounded bg-muted" />
            <div className="h-5 w-96 animate-pulse rounded bg-muted" />
          </div>

          {/* Action skeleton */}
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </header>
  );
}

/**
 * PageHeaderTabs
 *
 * Tab navigation component for use within PageHeader children
 */
interface Tab {
  label: string;
  value: string;
  href?: string;
  count?: number;
  icon?: ReactNode;
}

interface PageHeaderTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange?: (value: string) => void;
}

export function PageHeaderTabs({ tabs, activeTab, onTabChange }: PageHeaderTabsProps): JSX.Element {
  return (
    <nav className="-mb-px flex space-x-8 py-4" aria-label="Tabs">
      {tabs.map((tab) => {
        const isActive = tab.value === activeTab;

        const tabContent = (
          <>
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            )}
          </>
        );

        const className = `
          inline-flex items-center border-b-2 px-1 pb-4 text-sm font-medium transition-colors
          ${
            isActive
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
          }
        `;

        if (tab.href) {
          return (
            <a key={tab.value} href={tab.href} className={className}>
              {tabContent}
            </a>
          );
        }

        return (
          <button
            key={tab.value}
            onClick={() => onTabChange?.(tab.value)}
            className={className}
            aria-current={isActive ? 'page' : undefined}
          >
            {tabContent}
          </button>
        );
      })}
    </nav>
  );
}
