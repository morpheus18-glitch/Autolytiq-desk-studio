/**
 * Email Page Hooks
 *
 * Custom hooks for keyboard shortcuts, email selection, and page-specific logic.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Keyboard shortcut definitions (Gmail-style)
 */
export const KEYBOARD_SHORTCUTS = {
  COMPOSE: 'c',
  REPLY: 'r',
  REPLY_ALL: 'a',
  FORWARD: 'f',
  ARCHIVE: 'e',
  DELETE: '#',
  STAR: 's',
  NEXT_EMAIL: 'j',
  PREV_EMAIL: 'k',
  OPEN_EMAIL: 'o',
  BACK_TO_LIST: 'u',
  SELECT_TOGGLE: 'x',
  SEARCH: '/',
  ESCAPE: 'Escape',
  MARK_READ: 'Shift+i',
  MARK_UNREAD: 'Shift+u',
} as const;

interface KeyboardShortcutsConfig {
  onCompose?: () => void;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onStar?: () => void;
  onNextEmail?: () => void;
  onPrevEmail?: () => void;
  onOpenEmail?: () => void;
  onBackToList?: () => void;
  onSelectToggle?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onMarkRead?: () => void;
  onMarkUnread?: () => void;
  enabled?: boolean;
}

/**
 * Hook for Gmail-style keyboard shortcuts
 */
export function useEmailKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onCompose,
    onReply,
    onReplyAll,
    onForward,
    onArchive,
    onDelete,
    onStar,
    onNextEmail,
    onPrevEmail,
    onOpenEmail,
    onBackToList,
    onSelectToggle,
    onSearch,
    onEscape,
    onMarkRead,
    onMarkUnread,
    enabled = true,
  } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Only handle Escape in inputs
        if (e.key === 'Escape' && onEscape) {
          onEscape();
        }
        return;
      }

      const key = e.key.toLowerCase();
      const isShift = e.shiftKey;

      // Handle shift combinations
      if (isShift) {
        if (key === 'i' && onMarkRead) {
          e.preventDefault();
          onMarkRead();
          return;
        }
        if (key === 'u' && onMarkUnread) {
          e.preventDefault();
          onMarkUnread();
          return;
        }
      }

      // Single key shortcuts
      switch (key) {
        case KEYBOARD_SHORTCUTS.COMPOSE:
          e.preventDefault();
          onCompose?.();
          break;
        case KEYBOARD_SHORTCUTS.REPLY:
          e.preventDefault();
          onReply?.();
          break;
        case KEYBOARD_SHORTCUTS.REPLY_ALL:
          e.preventDefault();
          onReplyAll?.();
          break;
        case KEYBOARD_SHORTCUTS.FORWARD:
          e.preventDefault();
          onForward?.();
          break;
        case KEYBOARD_SHORTCUTS.ARCHIVE:
          e.preventDefault();
          onArchive?.();
          break;
        case KEYBOARD_SHORTCUTS.DELETE:
          e.preventDefault();
          onDelete?.();
          break;
        case KEYBOARD_SHORTCUTS.STAR:
          e.preventDefault();
          onStar?.();
          break;
        case KEYBOARD_SHORTCUTS.NEXT_EMAIL:
          e.preventDefault();
          onNextEmail?.();
          break;
        case KEYBOARD_SHORTCUTS.PREV_EMAIL:
          e.preventDefault();
          onPrevEmail?.();
          break;
        case KEYBOARD_SHORTCUTS.OPEN_EMAIL:
        case 'enter':
          if (onOpenEmail) {
            e.preventDefault();
            onOpenEmail();
          }
          break;
        case KEYBOARD_SHORTCUTS.BACK_TO_LIST:
          e.preventDefault();
          onBackToList?.();
          break;
        case KEYBOARD_SHORTCUTS.SELECT_TOGGLE:
          e.preventDefault();
          onSelectToggle?.();
          break;
        case KEYBOARD_SHORTCUTS.SEARCH:
          e.preventDefault();
          onSearch?.();
          break;
        case 'escape':
          e.preventDefault();
          onEscape?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onCompose,
    onReply,
    onReplyAll,
    onForward,
    onArchive,
    onDelete,
    onStar,
    onNextEmail,
    onPrevEmail,
    onOpenEmail,
    onBackToList,
    onSelectToggle,
    onSearch,
    onEscape,
    onMarkRead,
    onMarkUnread,
  ]);
}

/**
 * Hook for managing email selection (batch operations)
 */
export function useEmailSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectAllActive, setIsSelectAllActive] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setIsSelectAllActive(false);
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setIsSelectAllActive(true);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectAllActive(false);
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return {
    selectedIds,
    selectedCount,
    hasSelection,
    isSelectAllActive,
    toggleSelect,
    selectAll,
    deselectAll,
    isSelected,
  };
}

/**
 * Hook for managing compose state (new, reply, forward)
 */
export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

export interface ComposeContext {
  mode: ComposeMode;
  inReplyTo?: {
    id: string;
    threadId?: string;
    from: string;
    fromName?: string;
    to: string[];
    cc?: string[];
    subject: string;
    bodyHtml: string;
    date: string;
  };
}

export function useComposeState() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<ComposeContext | null>(null);

  const openCompose = useCallback((ctx?: ComposeContext) => {
    setContext(ctx || { mode: 'new' });
    setIsOpen(true);
  }, []);

  const closeCompose = useCallback(() => {
    setIsOpen(false);
    setContext(null);
  }, []);

  const openReply = useCallback(
    (email: ComposeContext['inReplyTo'], mode: 'reply' | 'replyAll' = 'reply') => {
      setContext({ mode, inReplyTo: email });
      setIsOpen(true);
    },
    []
  );

  const openForward = useCallback((email: ComposeContext['inReplyTo']) => {
    setContext({ mode: 'forward', inReplyTo: email });
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    context,
    openCompose,
    closeCompose,
    openReply,
    openForward,
  };
}

/**
 * Hook for auto-saving drafts with debounce
 */
export function useAutoSaveDraft(
  saveFn: (draftId: string | null, content: unknown) => Promise<{ id: string }>,
  delayMs = 30000
) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<unknown>(null);

  const scheduleSave = useCallback(
    (content: unknown) => {
      contentRef.current = content;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (!contentRef.current) return;

        setIsSaving(true);
        try {
          const result = await saveFn(draftId, contentRef.current);
          setDraftId(result.id);
          setLastSaved(new Date());
        } catch (error) {
          console.error('Failed to auto-save draft:', error);
        } finally {
          setIsSaving(false);
        }
      }, delayMs);
    },
    [draftId, delayMs, saveFn]
  );

  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!contentRef.current) return;

    setIsSaving(true);
    try {
      const result = await saveFn(draftId, contentRef.current);
      setDraftId(result.id);
      setLastSaved(new Date());
      return result;
    } finally {
      setIsSaving(false);
    }
  }, [draftId, saveFn]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setDraftId(null);
    setLastSaved(null);
    contentRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    draftId,
    isSaving,
    lastSaved,
    scheduleSave,
    saveNow,
    reset,
    setDraftId,
  };
}

/**
 * Hook for search with debounce
 */
export function useEmailSearch(delayMs = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setDebouncedQuery(newQuery);
      }, delayMs);
    },
    [delayMs]
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    debouncedQuery,
    updateQuery,
    clearSearch,
    isSearching: query !== debouncedQuery,
  };
}
