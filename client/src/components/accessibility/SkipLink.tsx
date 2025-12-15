/**
 * Skip Link Component
 *
 * Provides keyboard users a way to skip navigation and jump directly to main content.
 * This is a WCAG 2.1 Level A requirement (2.4.1 Bypass Blocks).
 *
 * The link is visually hidden until focused, then becomes visible.
 */

import { type JSX } from 'react';

interface SkipLinkProps {
  /** Target element ID to skip to (default: "main-content") */
  targetId?: string;
  /** Link text (default: "Skip to main content") */
  children?: React.ReactNode;
}

export function SkipLink({
  targetId = 'main-content',
  children = 'Skip to main content',
}: SkipLinkProps): JSX.Element {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex to make the element focusable
      target.setAttribute('tabindex', '-1');
      target.focus();
      // Remove tabindex after focus to maintain natural tab order
      target.addEventListener('blur', () => {
        target.removeAttribute('tabindex');
      }, { once: true });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="
        sr-only focus:not-sr-only
        fixed top-4 left-4 z-[100]
        rounded-lg bg-primary px-4 py-3
        text-sm font-medium text-primary-foreground
        shadow-lg ring-2 ring-primary ring-offset-2 ring-offset-background
        focus:outline-none
        transition-all duration-200
      "
    >
      {children}
    </a>
  );
}
