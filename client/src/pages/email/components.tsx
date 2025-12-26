/**
 * Email Page Components - Mobile-First Responsive Design
 *
 * Production-grade components with:
 * - 44px minimum touch targets
 * - Swipe gestures for mobile actions
 * - Responsive typography and spacing
 * - Bottom navigation for mobile
 * - Accessible focus states
 */

import { useState, useRef, useCallback, useEffect, type JSX, type ReactNode, type TouchEvent } from 'react';
import { cn, formatRelativeTime } from '@/lib/utils';
import DOMPurify from 'dompurify';
import type {
  EmailFolder,
  InboxEmail,
  EmailThread,
  EmailStats,
  EmailLabel,
  EmailAttachment,
} from '@/hooks/useEmail';
import { getAttachmentDownloadURL } from '@/hooks/useEmail';
import { Button } from '@design-system';
import {
  Mail,
  Send,
  FileText,
  Trash2,
  AlertCircle,
  Archive,
  Star,
  Tag,
  Settings,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  Paperclip,
  Reply,
  ReplyAll,
  Forward,
  X,
  CheckSquare,
  Square,
  Download,
  Inbox,
  RefreshCw,
  Loader2,
  MailOpen,
  MoreVertical,
  Menu,
  Edit3,
} from 'lucide-react';

// =====================================================
// FOLDER CONFIGURATION
// =====================================================

const FOLDER_ICONS: Record<EmailFolder, typeof Mail> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileText,
  trash: Trash2,
  spam: AlertCircle,
  archive: Archive,
  starred: Star,
};

const FOLDER_LABELS: Record<EmailFolder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  trash: 'Trash',
  spam: 'Spam',
  archive: 'Archive',
  starred: 'Starred',
};

// =====================================================
// FOLDER SIDEBAR (Desktop Only)
// =====================================================

interface FolderSidebarProps {
  currentFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  stats?: EmailStats;
  onCompose: () => void;
  onOpenSettings: () => void;
}

export function FolderSidebar({
  currentFolder,
  onFolderChange,
  stats,
  onCompose,
  onOpenSettings,
}: FolderSidebarProps): JSX.Element {
  const folders: EmailFolder[] = ['inbox', 'starred', 'sent', 'drafts', 'archive', 'spam', 'trash'];

  const getCount = (folder: EmailFolder): number => {
    if (!stats) return 0;
    switch (folder) {
      case 'inbox':
        return stats.unread_inbox;
      case 'drafts':
        return stats.total_drafts;
      case 'starred':
        return stats.total_starred;
      case 'trash':
        return stats.total_trash;
      default:
        return 0;
    }
  };

  return (
    <div className="w-56 xl:w-64 flex-shrink-0 border-r border-border bg-background flex flex-col">
      {/* Compose Button */}
      <div className="p-3 xl:p-4">
        <Button
          variant="primary"
          fullWidth
          icon={<Plus className="h-4 w-4" />}
          onClick={onCompose}
          className="h-11"
        >
          Compose
        </Button>
      </div>

      {/* Folder List */}
      <nav className="flex-1 px-2 overflow-y-auto">
        {folders.map((folder) => {
          const Icon = FOLDER_ICONS[folder];
          const count = getCount(folder);
          const isActive = currentFolder === folder;

          return (
            <button
              key={folder}
              onClick={() => onFolderChange(folder)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                'min-h-[44px]', // WCAG touch target
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  folder === 'starred' && 'text-yellow-500',
                  folder === 'spam' && 'text-orange-500',
                  folder === 'trash' && 'text-red-500'
                )}
              />
              <span className="flex-1 text-left truncate">{FOLDER_LABELS[folder]}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium min-w-[24px] text-center',
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Settings Button */}
      <div className="p-2 border-t border-border">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors min-h-[44px]"
        >
          <Settings className="h-5 w-5" />
          <span>Email Settings</span>
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MOBILE BOTTOM NAVIGATION
// =====================================================

interface MobileBottomNavProps {
  currentFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  onCompose: () => void;
  onOpenSettings: () => void;
  stats?: EmailStats;
}

export function MobileBottomNav({
  currentFolder,
  onFolderChange,
  onCompose,
  onOpenSettings,
  stats,
}: MobileBottomNavProps): JSX.Element {
  const navItems: Array<{ folder: EmailFolder; icon: typeof Mail; label: string }> = [
    { folder: 'inbox', icon: Inbox, label: 'Inbox' },
    { folder: 'starred', icon: Star, label: 'Starred' },
    { folder: 'sent', icon: Send, label: 'Sent' },
    { folder: 'archive', icon: Archive, label: 'Archive' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ folder, icon: Icon, label }) => {
          const isActive = currentFolder === folder;
          const count = folder === 'inbox' ? stats?.unread_inbox : 0;

          return (
            <button
              key={folder}
              onClick={() => onFolderChange(folder)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg transition-colors',
                'min-w-[64px] min-h-[56px]', // Touch target
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-6 w-6', folder === 'starred' && isActive && 'fill-yellow-500')} />
                {count && count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}

        {/* Compose FAB */}
        <button
          onClick={onCompose}
          className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-lg min-w-[64px] min-h-[56px]"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Edit3 className="h-5 w-5 text-primary-foreground" />
          </div>
        </button>
      </div>
    </div>
  );
}

// =====================================================
// MOBILE FOLDER SHEET (Slide-up Menu)
// =====================================================

interface MobileFolderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  stats?: EmailStats;
  onOpenSettings: () => void;
}

export function MobileFolderSheet({
  isOpen,
  onClose,
  currentFolder,
  onFolderChange,
  stats,
  onOpenSettings,
}: MobileFolderSheetProps): JSX.Element | null {
  const folders: EmailFolder[] = ['inbox', 'starred', 'sent', 'drafts', 'archive', 'spam', 'trash'];

  const getCount = (folder: EmailFolder): number => {
    if (!stats) return 0;
    switch (folder) {
      case 'inbox':
        return stats.unread_inbox;
      case 'drafts':
        return stats.total_drafts;
      case 'starred':
        return stats.total_starred;
      case 'trash':
        return stats.total_trash;
      default:
        return 0;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 safe-area-pb">
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-4 pb-2">
          <h2 className="text-lg font-semibold">Folders</h2>
        </div>

        {/* Folder List */}
        <div className="px-2 pb-2 max-h-[50vh] overflow-y-auto">
          {folders.map((folder) => {
            const Icon = FOLDER_ICONS[folder];
            const count = getCount(folder);
            const isActive = currentFolder === folder;

            return (
              <button
                key={folder}
                onClick={() => onFolderChange(folder)}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base transition-colors',
                  'min-h-[52px] active:bg-muted/70',
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    folder === 'starred' && 'text-yellow-500',
                    folder === 'spam' && 'text-orange-500',
                    folder === 'trash' && 'text-red-500'
                  )}
                />
                <span className="flex-1 text-left">{FOLDER_LABELS[folder]}</span>
                {count > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4" />

        {/* Settings */}
        <div className="px-2 py-2">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-base text-muted-foreground min-h-[52px] active:bg-muted/70"
          >
            <Settings className="h-5 w-5" />
            <span>Email Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}

// =====================================================
// EMAIL LIST HEADER
// =====================================================

interface EmailListHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClearSearch: () => void;
  currentFolder: EmailFolder;
  folderLabel: string;
  onOpenFolderSheet?: () => void;
  showFolderButton?: boolean;
  unreadCount?: number;
}

export function EmailListHeader({
  query,
  onQueryChange,
  onClearSearch,
  folderLabel,
  onOpenFolderSheet,
  showFolderButton = false,
  unreadCount,
}: EmailListHeaderProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <div className="border-b border-border bg-background sticky top-0 z-10">
      {/* Folder Title Row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {showFolderButton && (
          <button
            onClick={onOpenFolderSheet}
            className="p-2 -ml-2 rounded-lg hover:bg-muted active:bg-muted/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <Menu className="h-5 w-5 text-muted-foreground" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-foreground truncate">{folderLabel}</h2>
            {unreadCount && unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
        </div>

        <button className="p-2.5 rounded-lg hover:bg-muted active:bg-muted/70 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div
          className={cn(
            'relative flex items-center rounded-xl border transition-all',
            isSearchFocused
              ? 'border-primary ring-2 ring-primary/20 bg-background'
              : 'border-input bg-muted/50'
          )}
        >
          <Search className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search emails..."
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none min-h-[48px]"
          />
          {query && (
            <button
              onClick={onClearSearch}
              className="absolute right-2 p-2 rounded-lg hover:bg-muted/70 min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// BATCH ACTION BAR
// =====================================================

interface BatchActionBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStar: () => void;
  isLoading?: boolean;
}

export function BatchActionBar({
  selectedCount,
  onDeselectAll,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onDelete,
  onStar,
  isLoading = false,
}: BatchActionBarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-border">
      <div className="flex items-center gap-2">
        <button
          onClick={onDeselectAll}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Deselect all"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onMarkRead}
          disabled={isLoading}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-muted-foreground disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Mark as read"
        >
          <MailOpen className="h-5 w-5" />
        </button>
        <button
          onClick={onMarkUnread}
          disabled={isLoading}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-muted-foreground disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Mark as unread"
        >
          <Mail className="h-5 w-5" />
        </button>
        <button
          onClick={onStar}
          disabled={isLoading}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-muted-foreground disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Star"
        >
          <Star className="h-5 w-5" />
        </button>
        <button
          onClick={onArchive}
          disabled={isLoading}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-muted-foreground disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Archive"
        >
          <Archive className="h-5 w-5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="p-2.5 rounded-lg hover:bg-background active:bg-background/70 text-destructive disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Delete"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// =====================================================
// EMAIL LIST
// =====================================================

interface EmailListProps {
  children: ReactNode;
}

export function EmailList({ children }: EmailListProps): JSX.Element {
  return (
    <div className="divide-y divide-border">
      {children}
    </div>
  );
}

// =====================================================
// SWIPEABLE EMAIL LIST ITEM
// =====================================================

interface SwipeableEmailListItemProps {
  email: InboxEmail;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onToggleStar: () => void;
  onSwipeArchive: () => void;
  onSwipeDelete: () => void;
  enableSwipe?: boolean;
}

export function SwipeableEmailListItem({
  email,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
  onToggleStar,
  onSwipeArchive,
  onSwipeDelete,
  enableSwipe = false,
}: SwipeableEmailListItemProps): JSX.Element {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 120;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enableSwipe) return;
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [enableSwipe]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enableSwipe || !isSwiping) return;
    currentXRef.current = e.touches[0].clientX;
    const diff = currentXRef.current - startXRef.current;
    // Limit swipe distance and add resistance
    const resistance = 0.5;
    const limitedDiff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff * resistance));
    setSwipeX(limitedDiff);
  }, [enableSwipe, isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!enableSwipe) return;
    setIsSwiping(false);

    if (swipeX > SWIPE_THRESHOLD) {
      // Swipe right - Archive
      setSwipeX(MAX_SWIPE);
      setTimeout(() => {
        onSwipeArchive();
        setSwipeX(0);
      }, 200);
    } else if (swipeX < -SWIPE_THRESHOLD) {
      // Swipe left - Delete
      setSwipeX(-MAX_SWIPE);
      setTimeout(() => {
        onSwipeDelete();
        setSwipeX(0);
      }, 200);
    } else {
      setSwipeX(0);
    }
  }, [enableSwipe, swipeX, onSwipeArchive, onSwipeDelete]);

  // Format sender display
  const senderDisplay = email.from_name || email.from_email.split('@')[0];
  const timeDisplay = formatRelativeTime(email.received_at);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Background - Archive (Green) */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-full flex items-center justify-start px-6 bg-green-500 transition-opacity',
          swipeX > 20 ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Archive className="h-6 w-6 text-white" />
        <span className="ml-2 text-white font-medium">Archive</span>
      </div>

      {/* Swipe Background - Delete (Red) */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 w-full flex items-center justify-end px-6 bg-red-500 transition-opacity',
          swipeX < -20 ? 'opacity-100' : 'opacity-0'
        )}
      >
        <span className="mr-2 text-white font-medium">Delete</span>
        <Trash2 className="h-6 w-6 text-white" />
      </div>

      {/* Email Content */}
      <div
        className={cn(
          'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors bg-background',
          'min-h-[72px] sm:min-h-[68px]',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted active:bg-muted/70',
          !email.is_read && 'bg-primary/5'
        )}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* Checkbox - Larger touch target on mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck();
          }}
          className="flex-shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted/50 active:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {isChecked ? (
            <CheckSquare className="h-5 w-5 text-primary" />
          ) : (
            <Square className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {/* Star - Larger touch target */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          className="flex-shrink-0 p-2 -ml-1 rounded-lg hover:bg-muted/50 active:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              email.is_starred
                ? 'fill-yellow-500 text-yellow-500'
                : 'text-muted-foreground'
            )}
          />
        </button>

        {/* Email Content Area */}
        <div className="flex-1 min-w-0 py-1" onClick={onSelect}>
          {/* First Row: Sender + Time */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span
              className={cn(
                'truncate text-sm',
                !email.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'
              )}
            >
              {senderDisplay}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {email.has_attachments && (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {timeDisplay}
              </span>
            </div>
          </div>

          {/* Second Row: Subject */}
          <p
            className={cn(
              'truncate text-sm',
              !email.is_read ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}
          >
            {email.subject || '(No subject)'}
          </p>

          {/* Third Row: Snippet */}
          <p className="text-sm text-muted-foreground truncate mt-0.5 line-clamp-1">
            {email.snippet || 'No preview available'}
          </p>

          {/* Labels */}
          {email.labels && email.labels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
              {email.labels.slice(0, 2).map((label) => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary truncate max-w-[80px]"
                >
                  {label}
                </span>
              ))}
              {email.labels.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{email.labels.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Legacy non-swipeable version for desktop
export function EmailListItem(props: Omit<SwipeableEmailListItemProps, 'onSwipeArchive' | 'onSwipeDelete' | 'enableSwipe'>): JSX.Element {
  return (
    <SwipeableEmailListItem
      {...props}
      onSwipeArchive={() => {}}
      onSwipeDelete={() => {}}
      enableSwipe={false}
    />
  );
}

// =====================================================
// EMAIL DETAIL VIEW
// =====================================================

interface EmailDetailViewProps {
  email: InboxEmail;
  thread?: EmailThread;
  isLoadingThread?: boolean;
  onBack: () => void;
  onReply: () => void;
  onReplyAll: () => void;
  onForward: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  showBackButton?: boolean;
}

export function EmailDetailView({
  email,
  thread,
  isLoadingThread = false,
  onBack,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onToggleStar,
  showBackButton = false,
}: EmailDetailViewProps): JSX.Element {
  const showThreadLoading = isLoadingThread && !thread;

  // Sanitize HTML content
  const sanitizedBody = DOMPurify.sanitize(email.body_html || email.body_text || '', {
    ADD_TAGS: ['style'],
    ADD_ATTR: ['target'],
  });

  // Format recipient list
  const toList = email.to_emails.join(', ');
  const ccList = email.cc_emails?.join(', ');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Back Button */}
          {showBackButton && (
            <button
              onClick={onBack}
              className="p-2.5 -ml-1 rounded-lg hover:bg-muted active:bg-muted/70 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Subject - Truncated */}
          <h3 className="text-base sm:text-lg font-medium text-foreground truncate">
            {email.subject || '(No subject)'}
          </h3>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onToggleStar}
            className="p-2.5 rounded-lg hover:bg-muted active:bg-muted/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Star"
          >
            <Star
              className={cn(
                'h-5 w-5',
                email.is_starred ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
              )}
            />
          </button>
          <button
            onClick={onArchive}
            className="p-2.5 rounded-lg hover:bg-muted active:bg-muted/70 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Archive"
          >
            <Archive className="h-5 w-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2.5 rounded-lg hover:bg-muted active:bg-muted/70 text-destructive min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Delete"
          >
            <Trash2 className="h-5 w-5" />
          </button>
          <button
            className="p-2.5 rounded-lg hover:bg-muted active:bg-muted/70 text-muted-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="More"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Email Content - Scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Sender Info */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary flex-shrink-0">
              {(email.from_name || email.from_email)[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {email.from_name || email.from_email}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{email.from_email}</p>
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">
                  {formatRelativeTime(email.received_at)}
                </span>
              </div>

              {/* Recipients - Collapsible on mobile */}
              <details className="mt-2 text-sm text-muted-foreground">
                <summary className="cursor-pointer hover:text-foreground">
                  To: {email.to_emails[0]}{email.to_emails.length > 1 && ` +${email.to_emails.length - 1}`}
                </summary>
                <div className="mt-1 pl-2 border-l-2 border-border">
                  <p>To: {toList}</p>
                  {ccList && <p>Cc: {ccList}</p>}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          <div
            className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2"
            dangerouslySetInnerHTML={{ __html: sanitizedBody }}
          />
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="px-4 py-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({email.attachments.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((attachment) => (
                <AttachmentChip key={attachment.id} attachment={attachment} />
              ))}
            </div>
          </div>
        )}

        {/* Thread Messages */}
        {showThreadLoading && (
          <div className="px-4 py-6 border-t border-border text-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading thread...</p>
          </div>
        )}
        {thread && thread.messages && thread.messages.length > 1 && (
          <div className="px-4 py-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {thread.message_count} messages in this thread
            </h4>
            <div className="space-y-3">
              {thread.messages
                .filter((m) => m.id !== email.id)
                .map((message) => (
                  <ThreadMessage key={message.id} email={message} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Reply Actions - Fixed at bottom */}
      <div className="px-4 py-3 border-t border-border bg-background flex items-center gap-2 safe-area-pb">
        <Button
          variant="outline"
          onClick={onReply}
          icon={<Reply className="h-4 w-4" />}
          className="flex-1 sm:flex-none min-h-[44px]"
        >
          Reply
        </Button>
        <Button
          variant="outline"
          onClick={onReplyAll}
          icon={<ReplyAll className="h-4 w-4" />}
          className="flex-1 sm:flex-none min-h-[44px]"
        >
          <span className="hidden sm:inline">Reply All</span>
          <span className="sm:hidden">All</span>
        </Button>
        <Button
          variant="outline"
          onClick={onForward}
          icon={<Forward className="h-4 w-4" />}
          className="flex-1 sm:flex-none min-h-[44px]"
        >
          <span className="hidden sm:inline">Forward</span>
          <span className="sm:hidden">Fwd</span>
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// THREAD MESSAGE (collapsed view in thread)
// =====================================================

function ThreadMessage({ email }: { email: InboxEmail }): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 active:bg-muted transition-colors min-h-[56px]"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
          {(email.from_name || email.from_email)[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">{email.from_name || email.from_email}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(email.received_at)}
            </span>
          </div>
          {!isExpanded && (
            <p className="text-sm text-muted-foreground truncate">{email.snippet}</p>
          )}
        </div>

        <ChevronDown
          className={cn('h-5 w-5 text-muted-foreground transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-border">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(email.body_html || email.body_text || ''),
            }}
          />
        </div>
      )}
    </div>
  );
}

// =====================================================
// ATTACHMENT CHIP
// =====================================================

interface AttachmentChipProps {
  attachment: EmailAttachment;
}

function AttachmentChip({ attachment }: AttachmentChipProps): JSX.Element {
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (contentType: string): JSX.Element => {
    if (contentType.startsWith('image/')) {
      return <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">IMG</div>;
    }
    if (contentType === 'application/pdf') {
      return <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-xs font-semibold text-red-600 dark:text-red-400">PDF</div>;
    }
    return <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400">FILE</div>;
  };

  const downloadUrl = attachment.download_url || getAttachmentDownloadURL(attachment.id, attachment.dealership_id);

  return (
    <a
      href={downloadUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 border border-border rounded-xl hover:bg-muted/50 active:bg-muted transition-colors min-h-[56px]"
    >
      {getFileIcon(attachment.content_type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{attachment.filename}</p>
        <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
      </div>
      <Download className="h-5 w-5 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

interface EmptyStateProps {
  folder: EmailFolder;
  searchQuery?: string;
}

export function EmptyState({ folder, searchQuery }: EmptyStateProps): JSX.Element {
  const folderEmptyMessages: Record<EmailFolder, { title: string; description: string }> = {
    inbox: {
      title: 'Your inbox is empty',
      description: 'Emails you receive will appear here',
    },
    sent: {
      title: 'No sent emails',
      description: 'Emails you send will appear here',
    },
    drafts: {
      title: 'No drafts',
      description: 'Emails you save as drafts will appear here',
    },
    trash: {
      title: 'Trash is empty',
      description: 'Deleted emails will appear here',
    },
    spam: {
      title: 'No spam',
      description: 'Spam emails will appear here',
    },
    archive: {
      title: 'Archive is empty',
      description: 'Archived emails will appear here',
    },
    starred: {
      title: 'No starred emails',
      description: 'Emails you star will appear here',
    },
  };

  if (searchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Search className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No results found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-[250px]">
          No emails match "{searchQuery}"
        </p>
      </div>
    );
  }

  const message = folderEmptyMessages[folder];
  const Icon = FOLDER_ICONS[folder];

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{message.title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{message.description}</p>
    </div>
  );
}

// =====================================================
// LOADING STATE
// =====================================================

export function LoadingState(): JSX.Element {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
      <Loader2 className="h-10 w-10 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground mt-4">Loading emails...</p>
    </div>
  );
}

// =====================================================
// LABEL BADGE
// =====================================================

interface LabelBadgeProps {
  label: EmailLabel;
  onRemove?: () => void;
}

export function LabelBadge({ label, onRemove }: LabelBadgeProps): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${label.color}20`,
        color: label.color,
      }}
    >
      <Tag className="h-3 w-3" />
      {label.name}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-80 p-0.5 -mr-1">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// =====================================================
// LABEL PICKER
// =====================================================

interface LabelPickerProps {
  labels: EmailLabel[];
  selectedLabels: string[];
  onToggle: (labelId: string) => void;
  onClose: () => void;
}

export function LabelPicker({
  labels,
  selectedLabels,
  onToggle,
  onClose,
}: LabelPickerProps): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full mt-1 right-0 z-50 w-56 rounded-xl bg-popover border border-border shadow-xl py-2">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Labels
        </div>
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => onToggle(label.id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted active:bg-muted/70 min-h-[44px]"
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span className="flex-1 text-left">{label.name}</span>
            {selectedLabels.includes(label.id) && (
              <CheckSquare className="h-5 w-5 text-primary" />
            )}
          </button>
        ))}
      </div>
    </>
  );
}

// =====================================================
// KEYBOARD SHORTCUT HINT
// =====================================================

interface KeyboardShortcutHintProps {
  shortcuts: Array<{ key: string; description: string }>;
}

export function KeyboardShortcutHint({ shortcuts }: KeyboardShortcutHintProps): JSX.Element {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-popover border border-border rounded-xl shadow-xl p-4 max-w-xs hidden lg:block">
      <h4 className="text-sm font-semibold text-foreground mb-3">Keyboard Shortcuts</h4>
      <div className="space-y-2">
        {shortcuts.map(({ key, description }) => (
          <div key={key} className="flex items-center justify-between text-sm gap-4">
            <span className="text-muted-foreground">{description}</span>
            <kbd className="px-2 py-1 rounded-md bg-muted text-xs font-mono font-medium">{key}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
