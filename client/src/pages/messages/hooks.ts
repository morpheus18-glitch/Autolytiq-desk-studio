/**
 * Messages Page Hooks
 *
 * Custom hooks for the messaging page.
 */

import { useState, useEffect } from 'react';

/**
 * Screenshot Protection Hook
 * Blurs content when window loses focus or visibility changes
 */
export function useScreenshotProtection(enabled: boolean = true) {
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => setIsProtected(document.hidden);
    const handleBlur = () => setIsProtected(true);
    const handleFocus = () => setIsProtected(false);
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen or Mac screenshot shortcuts
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key))) {
        e.preventDefault();
        setIsProtected(true);
        setTimeout(() => setIsProtected(false), 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return isProtected;
}
