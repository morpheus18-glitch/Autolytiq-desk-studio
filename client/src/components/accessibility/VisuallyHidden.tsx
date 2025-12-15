/**
 * Visually Hidden Component
 *
 * Hides content visually while keeping it accessible to screen readers.
 * Use for:
 * - Icon-only buttons (provide text alternative)
 * - Skip links (visible only on focus)
 * - Additional context for screen readers
 *
 * This is NOT the same as display:none or visibility:hidden, which hide
 * content from all users including screen reader users.
 */

import { type ReactNode, type JSX, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface VisuallyHiddenProps extends HTMLAttributes<HTMLSpanElement> {
  /** Content to be hidden visually */
  children: ReactNode;
  /** Whether to show on focus (useful for skip links) */
  focusable?: boolean;
}

export function VisuallyHidden({
  children,
  focusable = false,
  className,
  ...props
}: VisuallyHiddenProps): JSX.Element {
  return (
    <span
      className={cn(
        // Screen reader only styles
        // These styles hide the element visually but keep it in the document flow
        // for screen readers
        focusable
          ? 'sr-only focus:not-sr-only focus:absolute focus:z-50'
          : 'sr-only',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * Utility function to create sr-only text for icon buttons
 *
 * @example
 * <button>
 *   <Icon />
 *   {srOnlyText('Close dialog')}
 * </button>
 */
export function srOnlyText(text: string): JSX.Element {
  return <span className="sr-only">{text}</span>;
}
