/**
 * Live Region Components
 *
 * ARIA live regions announce dynamic content changes to screen reader users.
 * These are essential for accessible notifications, form validation, and status updates.
 *
 * WCAG 2.1 Success Criteria:
 * - 4.1.3 Status Messages (Level AA)
 */

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode, type JSX } from 'react';

// ============================================================================
// Live Region Context
// ============================================================================

interface LiveRegionContextType {
  /** Announce a message politely (doesn't interrupt) */
  announce: (message: string) => void;
  /** Announce a message assertively (interrupts current speech) */
  announceAssertive: (message: string) => void;
  /** Announce form validation errors */
  announceError: (fieldName: string, error: string) => void;
  /** Announce form success */
  announceSuccess: (message: string) => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface LiveRegionProviderProps {
  children: ReactNode;
}

export function LiveRegionProvider({ children }: LiveRegionProviderProps): JSX.Element {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Clear messages after announcement
  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [assertiveMessage]);

  const announce = useCallback((message: string) => {
    setPoliteMessage(message);
  }, []);

  const announceAssertive = useCallback((message: string) => {
    setAssertiveMessage(message);
  }, []);

  const announceError = useCallback((fieldName: string, error: string) => {
    setAssertiveMessage(`Error in ${fieldName}: ${error}`);
  }, []);

  const announceSuccess = useCallback((message: string) => {
    setPoliteMessage(message);
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce, announceAssertive, announceError, announceSuccess }}>
      {children}

      {/* Polite announcements (status, success messages) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements (errors, critical updates) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </LiveRegionContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLiveRegion(): LiveRegionContextType {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
}

// ============================================================================
// Standalone Components
// ============================================================================

interface StatusMessageProps {
  children: ReactNode;
  /** Whether to announce this message to screen readers */
  announce?: boolean;
}

/**
 * Status Message - for non-critical updates
 * Use for: loading states, item counts, background updates
 */
export function StatusMessage({ children, announce = true }: StatusMessageProps): JSX.Element {
  return (
    <div
      role={announce ? 'status' : undefined}
      aria-live={announce ? 'polite' : undefined}
      aria-atomic={announce ? 'true' : undefined}
    >
      {children}
    </div>
  );
}

interface AlertMessageProps {
  children: ReactNode;
  /** Visual style variant */
  variant?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Alert Message - for important announcements
 * Use for: errors, warnings, important notifications
 */
export function AlertMessage({ children, variant = 'info' }: AlertMessageProps): JSX.Element {
  const variantStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`rounded-lg border p-4 ${variantStyles[variant]}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Loading Announcements
// ============================================================================

interface LoadingAnnouncerProps {
  /** Whether currently loading */
  isLoading: boolean;
  /** Message when loading starts */
  loadingMessage?: string;
  /** Message when loading completes */
  completeMessage?: string;
}

/**
 * Announces loading state changes to screen readers
 */
export function LoadingAnnouncer({
  isLoading,
  loadingMessage = 'Loading...',
  completeMessage = 'Content loaded',
}: LoadingAnnouncerProps): JSX.Element {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (isLoading) {
      setAnnouncement(loadingMessage);
    } else {
      setAnnouncement(completeMessage);
      // Clear after announcement
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingMessage, completeMessage]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
