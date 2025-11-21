/**
 * PageContent - Standard page content container
 *
 * Provides consistent page content spacing and container width.
 * Use this as the main content wrapper for all pages.
 *
 * @example
 * ```tsx
 * <PageContent>
 *   <Section>
 *     {/* Content here *\/}
 *   </Section>
 * </PageContent>
 * ```
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { containerPadding, layoutSpacing } from '@/lib/design-tokens';

export interface PageContentProps {
  /** Content to display */
  children: ReactNode;
  /** Additional className for customization */
  className?: string;
  /** Whether to add default page padding (default: true) */
  withPadding?: boolean;
}

export function PageContent({
  children,
  className,
  withPadding = true,
}: PageContentProps) {
  return (
    <div
      className={cn(
        containerPadding,
        withPadding && layoutSpacing.page,
        className
      )}
    >
      {children}
    </div>
  );
}
