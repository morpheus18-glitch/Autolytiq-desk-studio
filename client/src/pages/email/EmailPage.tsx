/**
 * Email Page - Mobile-First Responsive Email Client
 *
 * Gmail/Outlook-style email interface with:
 * - Mobile: Single-panel with bottom navigation, swipe gestures
 * - Tablet: Two-panel (list + detail)
 * - Desktop: Three-panel (sidebar + list + detail)
 *
 * Breakpoints:
 * - Mobile: < 640px (sm)
 * - Tablet: 640px - 1024px (sm to lg)
 * - Desktop: > 1024px (lg+)
 */

import { useState, useCallback, useMemo, useEffect, type JSX } from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  useInbox,
  useEmailStats,
  useToggleStar,
  useBatchEmailAction,
  useThread,
  type EmailFolder,
  type InboxEmail,
  type InboxFilter,
} from '@/hooks/useEmail';
import {
  useEmailKeyboardShortcuts,
  useEmailSelection,
  useComposeState,
  useEmailSearch,
} from './hooks';
import {
  FolderSidebar,
  MobileBottomNav,
  MobileFolderSheet,
  EmailListHeader,
  EmailList,
  SwipeableEmailListItem,
  EmailDetailView,
  BatchActionBar,
  EmptyState,
  LoadingState,
} from './components';
import { ComposeModal } from './ComposeModal';
import { EmailSettingsPanel } from './EmailSettingsPanel';
import {
  Mail,
  Send,
  FileText,
  Trash2,
  AlertCircle,
  Archive,
  Star,
} from 'lucide-react';

/**
 * View modes for mobile navigation
 */
type MobileView = 'list' | 'detail';

/**
 * Folder configuration with icons and labels
 */
const FOLDER_CONFIG: Record<
  EmailFolder,
  { label: string; icon: typeof Mail; color?: string }
> = {
  inbox: { label: 'Inbox', icon: Mail },
  sent: { label: 'Sent', icon: Send },
  drafts: { label: 'Drafts', icon: FileText },
  trash: { label: 'Trash', icon: Trash2 },
  spam: { label: 'Spam', icon: AlertCircle },
  archive: { label: 'Archive', icon: Archive },
  starred: { label: 'Starred', icon: Star, color: 'text-yellow-500' },
};

/**
 * Custom hook for responsive breakpoint detection
 */
function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isMobileOrTablet: breakpoint !== 'desktop',
  };
}

export function EmailPage(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.id || '';
  const dealershipId = user?.dealership_id || '';

  // Responsive breakpoint
  const { isMobile, isDesktop, isMobileOrTablet } = useBreakpoint();

  // Navigation state
  const [currentFolder, setCurrentFolder] = useState<EmailFolder>('inbox');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [isFolderSheetOpen, setIsFolderSheetOpen] = useState(false);

  // Search state
  const { query, debouncedQuery, updateQuery, clearSearch } = useEmailSearch();

  // Selection state (for batch operations)
  const {
    selectedIds,
    selectedCount,
    hasSelection,
    toggleSelect,
    deselectAll,
    isSelected,
  } = useEmailSelection();

  // Compose state
  const {
    isOpen: isComposeOpen,
    context: composeContext,
    openCompose,
    closeCompose,
    openReply,
    openForward,
  } = useComposeState();

  // Settings panel state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Build filter for inbox query
  const inboxFilter: InboxFilter = useMemo(
    () => ({
      dealership_id: dealershipId,
      user_id: userId,
      folder: currentFolder,
      query: debouncedQuery || undefined,
      limit: 50,
      sort_by: 'received_at',
      sort_order: 'desc',
    }),
    [dealershipId, userId, currentFolder, debouncedQuery]
  );

  // Data fetching
  const { data: inboxData, isLoading: isLoadingInbox } = useInbox(inboxFilter);
  const { data: stats } = useEmailStats(dealershipId, userId);
  const { data: threadData, isLoading: isLoadingThread } = useThread(
    selectedEmailId || '',
    dealershipId,
    userId
  );

  // Mutations
  const toggleStarMutation = useToggleStar();
  const batchActionMutation = useBatchEmailAction();

  // Get current email list
  const emails = inboxData?.emails || [];

  // Get selected email for detail view
  const selectedEmail = useMemo(() => {
    if (!selectedEmailId) return null;
    return emails.find((e) => e.id === selectedEmailId) || null;
  }, [selectedEmailId, emails]);

  // Handlers
  const handleFolderChange = useCallback((folder: EmailFolder) => {
    setCurrentFolder(folder);
    setSelectedEmailId(null);
    setMobileView('list');
    deselectAll();
    clearSearch();
    setIsFolderSheetOpen(false);
  }, [deselectAll, clearSearch]);

  const handleEmailSelect = useCallback((email: InboxEmail) => {
    setSelectedEmailId(email.id);
    setMobileView('detail');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedEmailId(null);
    setMobileView('list');
  }, []);

  const handleToggleStar = useCallback(
    async (emailId: string) => {
      await toggleStarMutation.mutateAsync({
        id: emailId,
        dealershipId,
        userId,
      });
    },
    [toggleStarMutation, dealershipId, userId]
  );

  const handleBatchAction = useCallback(
    async (action: string, options?: { folder?: EmailFolder; labels?: string[] }) => {
      if (!hasSelection) return;

      await batchActionMutation.mutateAsync({
        dealership_id: dealershipId,
        user_id: userId,
        email_ids: Array.from(selectedIds),
        action: action as Parameters<typeof batchActionMutation.mutateAsync>[0]['action'],
        folder: options?.folder,
        labels: options?.labels,
      });

      deselectAll();
    },
    [batchActionMutation, dealershipId, userId, selectedIds, hasSelection, deselectAll]
  );

  // Swipe action handlers for mobile
  const handleSwipeArchive = useCallback(
    async (emailId: string) => {
      await batchActionMutation.mutateAsync({
        dealership_id: dealershipId,
        user_id: userId,
        email_ids: [emailId],
        action: 'archive',
      });
    },
    [batchActionMutation, dealershipId, userId]
  );

  const handleSwipeDelete = useCallback(
    async (emailId: string) => {
      await batchActionMutation.mutateAsync({
        dealership_id: dealershipId,
        user_id: userId,
        email_ids: [emailId],
        action: 'delete',
      });
    },
    [batchActionMutation, dealershipId, userId]
  );

  const handleReply = useCallback(() => {
    if (!selectedEmail) return;
    openReply({
      id: selectedEmail.id,
      threadId: selectedEmail.thread_id,
      from: selectedEmail.from_email,
      fromName: selectedEmail.from_name,
      to: selectedEmail.to_emails,
      cc: selectedEmail.cc_emails,
      subject: selectedEmail.subject,
      bodyHtml: selectedEmail.body_html,
      date: selectedEmail.received_at,
    });
  }, [selectedEmail, openReply]);

  const handleReplyAll = useCallback(() => {
    if (!selectedEmail) return;
    openReply(
      {
        id: selectedEmail.id,
        threadId: selectedEmail.thread_id,
        from: selectedEmail.from_email,
        fromName: selectedEmail.from_name,
        to: selectedEmail.to_emails,
        cc: selectedEmail.cc_emails,
        subject: selectedEmail.subject,
        bodyHtml: selectedEmail.body_html,
        date: selectedEmail.received_at,
      },
      'replyAll'
    );
  }, [selectedEmail, openReply]);

  const handleForward = useCallback(() => {
    if (!selectedEmail) return;
    openForward({
      id: selectedEmail.id,
      threadId: selectedEmail.thread_id,
      from: selectedEmail.from_email,
      fromName: selectedEmail.from_name,
      to: selectedEmail.to_emails,
      cc: selectedEmail.cc_emails,
      subject: selectedEmail.subject,
      bodyHtml: selectedEmail.body_html,
      date: selectedEmail.received_at,
    });
  }, [selectedEmail, openForward]);

  // Navigate emails with keyboard
  const handleNextEmail = useCallback(() => {
    if (!selectedEmailId || emails.length === 0) {
      if (emails.length > 0) {
        setSelectedEmailId(emails[0].id);
        setMobileView('detail');
      }
      return;
    }
    const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);
    if (currentIndex < emails.length - 1) {
      setSelectedEmailId(emails[currentIndex + 1].id);
    }
  }, [selectedEmailId, emails]);

  const handlePrevEmail = useCallback(() => {
    if (!selectedEmailId || emails.length === 0) return;
    const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);
    if (currentIndex > 0) {
      setSelectedEmailId(emails[currentIndex - 1].id);
    }
  }, [selectedEmailId, emails]);

  // Keyboard shortcuts (desktop only)
  useEmailKeyboardShortcuts({
    onCompose: () => openCompose(),
    onReply: handleReply,
    onReplyAll: handleReplyAll,
    onForward: handleForward,
    onArchive: () => handleBatchAction('archive'),
    onDelete: () => handleBatchAction('delete'),
    onStar: () => {
      if (selectedEmailId) handleToggleStar(selectedEmailId);
    },
    onNextEmail: handleNextEmail,
    onPrevEmail: handlePrevEmail,
    onOpenEmail: () => {
      if (selectedEmailId && mobileView === 'list') {
        setMobileView('detail');
      }
    },
    onBackToList: handleBackToList,
    onSelectToggle: () => {
      if (selectedEmailId) toggleSelect(selectedEmailId);
    },
    onEscape: () => {
      if (isComposeOpen) {
        closeCompose();
      } else if (hasSelection) {
        deselectAll();
      } else if (mobileView === 'detail') {
        handleBackToList();
      }
    },
    onMarkRead: () => handleBatchAction('read'),
    onMarkUnread: () => handleBatchAction('unread'),
    enabled: !isComposeOpen && isDesktop,
  });

  // Determine what to show based on viewport and state
  const showSidebar = isDesktop;
  const showList = isDesktop || (isMobileOrTablet && mobileView === 'list');
  const showDetail = isDesktop || (isMobileOrTablet && mobileView === 'detail');
  const showMobileNav = isMobile && mobileView === 'list' && !hasSelection;

  // Calculate container height - account for header (64px) and mobile nav (72px when visible)
  const containerHeight = showMobileNav
    ? 'h-[calc(100vh-64px-72px)]' // Header + mobile nav
    : 'h-[calc(100vh-64px)]';    // Just header

  return (
    <MainLayout hideMobileNav={isMobile} fullBleed>
      <div className={cn(
        'flex bg-background overflow-hidden',
        containerHeight
      )}>
        {/* Desktop Sidebar - Folders */}
        {showSidebar && (
          <FolderSidebar
            currentFolder={currentFolder}
            onFolderChange={handleFolderChange}
            stats={stats}
            onCompose={() => openCompose()}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Email List Panel */}
        {showList && (
          <div
            className={cn(
              'flex flex-col bg-background min-w-0',
              // Mobile: full width
              'w-full',
              // Tablet: takes half when detail is open
              'sm:w-full sm:max-w-none',
              // Desktop: flexible middle panel
              'lg:flex-1 lg:border-r lg:border-border',
              // Hide on mobile when viewing detail
              isMobileOrTablet && mobileView === 'detail' && 'hidden'
            )}
          >
            {/* List Header with Search and Filters */}
            <EmailListHeader
              query={query}
              onQueryChange={updateQuery}
              onClearSearch={clearSearch}
              currentFolder={currentFolder}
              folderLabel={FOLDER_CONFIG[currentFolder].label}
              onOpenFolderSheet={() => setIsFolderSheetOpen(true)}
              showFolderButton={isMobileOrTablet}
              unreadCount={stats?.unread_inbox}
            />

            {/* Batch Action Bar (visible when emails selected) */}
            {hasSelection && (
              <BatchActionBar
                selectedCount={selectedCount}
                onDeselectAll={deselectAll}
                onMarkRead={() => handleBatchAction('read')}
                onMarkUnread={() => handleBatchAction('unread')}
                onArchive={() => handleBatchAction('archive')}
                onDelete={() => handleBatchAction('delete')}
                onStar={() => handleBatchAction('star')}
                isLoading={batchActionMutation.isPending}
              />
            )}

            {/* Email List */}
            <div className="flex-1 overflow-auto overscroll-contain">
              {isLoadingInbox ? (
                <LoadingState />
              ) : emails.length === 0 ? (
                <EmptyState
                  folder={currentFolder}
                  searchQuery={debouncedQuery}
                />
              ) : (
                <EmailList>
                  {emails.map((email) => (
                    <SwipeableEmailListItem
                      key={email.id}
                      email={email}
                      isSelected={email.id === selectedEmailId}
                      isChecked={isSelected(email.id)}
                      onSelect={() => handleEmailSelect(email)}
                      onToggleCheck={() => toggleSelect(email.id)}
                      onToggleStar={() => handleToggleStar(email.id)}
                      onSwipeArchive={() => handleSwipeArchive(email.id)}
                      onSwipeDelete={() => handleSwipeDelete(email.id)}
                      enableSwipe={isMobile}
                    />
                  ))}
                </EmailList>
              )}
            </div>
          </div>
        )}

        {/* Email Detail Panel */}
        {showDetail && (
          <div
            className={cn(
              'flex flex-col bg-background',
              // Mobile: full width, absolute positioning for smooth transitions
              'w-full',
              // Tablet: takes full width when viewing
              'sm:w-full',
              // Desktop: fixed width right panel
              'lg:w-[480px] xl:w-[560px] 2xl:w-[640px] lg:flex-shrink-0',
              // Hide on mobile/tablet when viewing list
              isMobileOrTablet && mobileView === 'list' && 'hidden',
              // Show empty state placeholder on desktop when no email selected
              !selectedEmailId && isDesktop && 'items-center justify-center'
            )}
          >
            {selectedEmailId && selectedEmail ? (
              <EmailDetailView
                email={selectedEmail}
                thread={threadData}
                isLoadingThread={isLoadingThread}
                onBack={handleBackToList}
                onReply={handleReply}
                onReplyAll={handleReplyAll}
                onForward={handleForward}
                onArchive={() => {
                  handleBatchAction('archive');
                  handleBackToList();
                }}
                onDelete={() => {
                  handleBatchAction('delete');
                  handleBackToList();
                }}
                onToggleStar={() => handleToggleStar(selectedEmailId)}
                showBackButton={isMobileOrTablet}
              />
            ) : isDesktop ? (
              <div className="text-center text-muted-foreground p-8">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 opacity-30" />
                </div>
                <p className="text-lg font-medium">Select an email to read</p>
                <p className="text-sm mt-1 opacity-70">
                  Choose from your {FOLDER_CONFIG[currentFolder].label.toLowerCase()}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {showMobileNav && (
        <MobileBottomNav
          currentFolder={currentFolder}
          onFolderChange={handleFolderChange}
          onCompose={() => openCompose()}
          onOpenSettings={() => setIsSettingsOpen(true)}
          stats={stats}
        />
      )}

      {/* Mobile Folder Sheet (slide-up menu) */}
      <MobileFolderSheet
        isOpen={isFolderSheetOpen}
        onClose={() => setIsFolderSheetOpen(false)}
        currentFolder={currentFolder}
        onFolderChange={handleFolderChange}
        stats={stats}
        onOpenSettings={() => {
          setIsFolderSheetOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={closeCompose}
        context={composeContext}
        dealershipId={dealershipId}
        userId={userId}
        isMobile={isMobile}
      />

      {/* Settings Panel */}
      <EmailSettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        dealershipId={dealershipId}
        userId={userId}
      />
    </MainLayout>
  );
}
