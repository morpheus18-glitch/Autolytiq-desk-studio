/**
 * PageHeader - Standard page header component
 *
 * Provides consistent page header styling with optional subtitle and actions.
 * Automatically handles sticky positioning and backdrop blur.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Deals"
 *   subtitle="Manage all vehicle deals"
 *   icon={<FileText />}
 *   actions={<Button>New Deal</Button>}
 * />
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  stickyHeaderClasses,
  pageTitleClasses,
  pageSubtitleClasses,
  containerPadding,
  layoutSpacing,
  heroIconContainerClasses,
} from '@/lib/design-tokens';

export interface PageHeaderProps {
  /** Page title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional action buttons (right side) */
  actions?: ReactNode;
  /** Whether header should be sticky (default: true) */
  sticky?: boolean;
  /** Additional className for customization */
  className?: string;
  /** Icon background color class */
  iconColor?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  sticky = true,
  className,
  iconColor = "bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25",
}: PageHeaderProps) {
  return (
    <div className={cn(sticky && stickyHeaderClasses, className)}>
      <div className={cn(containerPadding, layoutSpacing.header)}>
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            {/* Icon */}
            {icon && (
              <div className={cn(heroIconContainerClasses, iconColor)}>
                <div className="w-6 h-6 text-primary-foreground">{icon}</div>
              </div>
            )}

            {/* Title and Subtitle */}
            <div>
              <h1 className={pageTitleClasses}>{title}</h1>
              {subtitle && <p className={pageSubtitleClasses}>{subtitle}</p>}
            </div>
          </div>

          {/* Actions Section */}
          {actions && <div className="hidden md:flex items-center gap-3">{actions}</div>}
        </div>

        {/* Mobile Actions (if provided) */}
        {actions && (
          <div className="flex md:hidden mt-4 gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}
