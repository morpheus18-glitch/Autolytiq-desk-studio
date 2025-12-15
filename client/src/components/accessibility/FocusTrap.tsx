/**
 * Focus Trap Component
 *
 * Traps keyboard focus within a container, essential for modals and dialogs.
 * Implements WCAG 2.1 2.4.3 (Focus Order) and 2.4.7 (Focus Visible).
 *
 * Features:
 * - Traps Tab and Shift+Tab within the container
 * - Auto-focuses the first focusable element on mount
 * - Restores focus to the triggering element on unmount
 * - Handles Escape key to close
 */

import { useEffect, useRef, useCallback, type ReactNode, type JSX } from 'react';

// Selector for focusable elements
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface FocusTrapProps {
  children: ReactNode;
  /** Whether the trap is active */
  active?: boolean;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Whether to auto-focus the first element */
  autoFocus?: boolean;
  /** Whether to restore focus on unmount */
  restoreFocus?: boolean;
  /** Element to focus on mount (overrides first focusable) */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to return focus to on unmount (overrides triggering element) */
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export function FocusTrap({
  children,
  active = true,
  onEscape,
  autoFocus = true,
  restoreFocus = true,
  initialFocusRef,
  returnFocusRef,
}: FocusTrapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (active) {
      previousActiveElement.current = document.activeElement as HTMLElement;
    }
  }, [active]);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    return Array.from(elements).filter((el) => {
      // Filter out invisible elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    if (!active || !autoFocus) return;

    const focusTarget = initialFocusRef?.current || getFocusableElements()[0];
    if (focusTarget) {
      // Small delay to ensure element is ready
      requestAnimationFrame(() => {
        focusTarget.focus();
      });
    }
  }, [active, autoFocus, getFocusableElements, initialFocusRef]);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      if (restoreFocus && active) {
        const returnTarget = returnFocusRef?.current || previousActiveElement.current;
        if (returnTarget && typeof returnTarget.focus === 'function') {
          returnTarget.focus();
        }
      }
    };
  }, [active, restoreFocus, returnFocusRef]);

  // Handle keyboard events
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        event.stopPropagation();
        onEscape();
        return;
      }

      // Handle Tab
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey) {
          // Shift+Tab: wrap to last element
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: wrap to first element
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, getFocusableElements, onEscape]);

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  );
}

// ============================================================================
// Focus Management Hooks
// ============================================================================

/**
 * Hook to manage focus when a dialog/modal opens
 * Returns refs for the trigger element and initial focus target
 */
export function useFocusManagement(): {
  triggerRef: React.RefObject<HTMLButtonElement>;
  initialFocusRef: React.RefObject<HTMLElement>;
  returnFocus: () => void;
} {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const initialFocusRef = useRef<HTMLElement>(null);

  const returnFocus = useCallback(() => {
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  }, []);

  return { triggerRef, initialFocusRef, returnFocus };
}

/**
 * Hook to detect if focus is within a container
 */
export function useFocusWithin(containerRef: React.RefObject<HTMLElement>): boolean {
  const [focusWithin, setFocusWithin] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusIn = () => setFocusWithin(true);
    const handleFocusOut = (event: FocusEvent) => {
      if (!container.contains(event.relatedTarget as Node)) {
        setFocusWithin(false);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [containerRef]);

  return focusWithin;
}

// Need to import useState for useFocusWithin
import { useState } from 'react';
