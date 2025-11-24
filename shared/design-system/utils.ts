/**
 * Utility functions for the design system
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names using clsx and tailwind-merge
 * Handles conditional classes and prevents Tailwind class conflicts
 *
 * @example
 * ```tsx
 * cn('text-red-500', isActive && 'font-bold', className)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
