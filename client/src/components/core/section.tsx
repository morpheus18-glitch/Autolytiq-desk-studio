/**
 * Section - Content section with optional title and description
 *
 * Provides consistent section styling with standardized spacing.
 * Use this for grouping related content on a page.
 *
 * @example
 * ```tsx
 * <Section title="Active Deals" description="View and manage all active deals">
 *   <div className={gridLayouts.threeCol}>
 *     {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
 *   </div>
 * </Section>
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { sectionTitleClasses, layoutSpacing, flexLayouts } from '@/lib/design-tokens';

export interface SectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Optional action buttons (right side of title) */
  actions?: ReactNode;
  /** Section content */
  children: ReactNode;
  /** Additional className for customization */
  className?: string;
  /** Additional className for the header */
  headerClassName?: string;
  /** Spacing size (default: 'section') */
  spacing?: 'compact' | 'section' | 'page';
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
  spacing = 'section',
}: SectionProps) {
  const showHeader = title || description || actions;

  return (
    <section className={cn(layoutSpacing[spacing], className)}>
      {showHeader && (
        <div className={cn(flexLayouts.between, "mb-6", headerClassName)}>
          <div>
            {title && <h2 className={sectionTitleClasses}>{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
