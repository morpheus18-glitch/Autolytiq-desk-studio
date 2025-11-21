/**
 * Enhanced Email List Component - Gmail/Outlook Style
 *
 * Features:
 * - Bulk selection with checkboxes
 * - Bulk actions toolbar
 * - Archive button
 * - Better visual design
 * - Keyboard navigation
 */

import { useState, useEffect } from 'react';
import {
  Mail, Star, Trash2, Search, RefreshCw, Archive,
  MailOpen, Inbox
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  useEmails,
  useMarkEmailAsRead,
  useToggleEmailStar,
  useDeleteEmail,
  useBulkMarkAsRead,
  useBulkDelete,
  useMoveToFolder,
  type EmailMessage,
} from '@/hooks/use-email';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EmailListEnhancedProps {
  folder?: string;
  customerId?: string;
  dealId?: string;
  onSelectEmail?: (email: EmailMessage) => void;
  selectedEmailId?: string;
}

export function EmailListEnhanced({
  folder = 'inbox',
  customerId,
  dealId,
  onSelectEmail,
  selectedEmailId,
}: EmailListEnhancedProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Queries and mutations
  const { data, isLoading, refetch } = useEmails({
    folder,
    customerId,
    dealId,
    search: debouncedSearch,
    limit: 50,
  });

  const markAsRead = useMarkEmailAsRead();
  const toggleStar = useToggleEmailStar();
  const deleteEmail = useDeleteEmail();
  const bulkMarkAsRead = useBulkMarkAsRead();
  const bulkDelete = useBulkDelete();
  const moveToFolder = useMoveToFolder();

  const emails = data?.data || [];
  const total = data?.total || 0;
  const selectedCount = selectedIds.size;

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(emails.map((e: EmailMessage) => e.id)));
      setSelectAll(true);
    }
  };

  const handleSelectEmail = (emailId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === emails.length && emails.length > 0);
  };

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAll(false);
  }, [folder]);

  // Bulk actions
  const handleBulkMarkAsRead = (isRead: boolean) => {
    bulkMarkAsRead.mutate({
      emailIds: Array.from(selectedIds),
      isRead,
    });
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedCount} email${selectedCount > 1 ? 's' : ''}?`)) {
      bulkDelete.mutate({ emailIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      setSelectAll(false);
    }
  };

  const handleBulkArchive = () => {
    moveToFolder.mutate({
      emailIds: Array.from(selectedIds),
      folder: 'archive',
    });
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  // Single email actions
  const handleEmailClick = (email: EmailMessage, e: React.MouseEvent) => {
    // Don't open if clicking checkbox
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return;
    }

    if (!email.isRead) {
      markAsRead.mutate({ id: email.id, isRead: true });
    }
    onSelectEmail?.(email);
  };

  const handleStarClick = (e: React.MouseEvent, email: EmailMessage) => {
    e.stopPropagation();
    toggleStar.mutate({ id: email.id, isStarred: !email.isStarred });
  };

  const handleArchiveClick = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    moveToFolder.mutate({ emailIds: [emailId], folder: 'archive' });
  };

  const handleDeleteClick = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    deleteEmail.mutate({ id: emailId });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return format(date, 'h:mm a');
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return format(date, 'EEE');
      } else {
        return format(date, 'MMM d');
      }
    } catch {
      return '';
    }
  };

  // Get sender initials for avatar
  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {folder}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="hover:bg-primary/10"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 bg-background/50 backdrop-blur-sm border-border/50 focus:bg-background"
          />
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedCount > 0 ? (
          <Card className="flex items-center gap-2 p-2 bg-primary/10 border-primary/20 backdrop-blur-sm">
            <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkMarkAsRead(true)}
              title="Mark as read"
              className="hover:bg-primary/20"
            >
              <MailOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBulkMarkAsRead(false)}
              title="Mark as unread"
              className="hover:bg-primary/20"
            >
              <Mail className="h-4 w-4" />
            </Button>
            {folder !== 'archive' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBulkArchive}
                title="Archive"
                className="hover:bg-primary/20"
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBulkDelete}
              title="Delete"
              className="hover:bg-destructive/20"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set());
                setSelectAll(false);
              }}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
          </Card>
        ) : (
          total > 0 && (
            <p className="text-sm text-muted-foreground">
              {total} {total === 1 ? 'email' : 'emails'}
            </p>
          )
        )}
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading emails...</p>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-6">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">
              {search ? 'No emails found' : `No emails in ${folder}`}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search ? 'Try adjusting your search terms' : 'New emails will appear here'}
            </p>
          </div>
        ) : (
          <div>
            {/* Select All Row */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 bg-muted/20">
              <Checkbox
                checked={selectAll}
                onCheckedChange={handleSelectAll}
                data-checkbox
              />
              <span className="text-xs text-muted-foreground font-medium">
                {selectAll ? 'Deselect all' : 'Select all'}
              </span>
            </div>

            {/* Email Rows */}
            <div className="divide-y divide-border/30">
              {emails.map((email: EmailMessage) => (
                <div
                  key={email.id}
                  onClick={(e) => handleEmailClick(email, e)}
                  className={cn(
                    'group p-4 cursor-pointer transition-all duration-200',
                    'hover:bg-accent/50',
                    !email.isRead && 'bg-primary/5',
                    selectedEmailId === email.id && 'bg-primary/10 border-l-2 border-l-primary',
                    selectedIds.has(email.id) && 'bg-accent/70'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="mt-2" data-checkbox>
                      <Checkbox
                        checked={selectedIds.has(email.id)}
                        onCheckedChange={() => handleSelectEmail(email.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold",
                        !email.isRead
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {getInitials(email.fromName, email.fromAddress)}
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Unread Indicator */}
                          {!email.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                          )}
                          <span
                            className={cn(
                              'truncate',
                              !email.isRead ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                            )}
                          >
                            {email.fromName || email.fromAddress}
                          </span>
                          {email.isDraft && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0 bg-amber-500/20 text-amber-700 dark:text-amber-400">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs whitespace-nowrap flex-shrink-0",
                          !email.isRead ? 'font-semibold text-primary' : 'text-muted-foreground'
                        )}>
                          {formatDate(email.sentAt || email.createdAt)}
                        </span>
                      </div>

                      <div className={cn(
                        "text-sm truncate mb-1",
                        !email.isRead ? 'font-semibold text-foreground' : 'font-normal text-foreground/80'
                      )}>
                        {email.subject || '(no subject)'}
                      </div>

                      {email.bodyText && (
                        <div className="text-sm text-muted-foreground truncate">
                          {email.bodyText.substring(0, 100)}
                        </div>
                      )}

                      {folder === 'sent' && email.toAddresses && Array.isArray(email.toAddresses) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          To: {email.toAddresses.map((r) => r?.email || 'Unknown').join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      {/* Star */}
                      <button
                        onClick={(e) => handleStarClick(e, email)}
                        className="p-1 hover:text-yellow-500 transition-colors"
                        title={email.isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star
                          className={cn(
                            'h-4 w-4',
                            email.isStarred && 'fill-yellow-500 text-yellow-500'
                          )}
                        />
                      </button>

                      {/* Archive and Delete - show on hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {folder !== 'archive' && folder !== 'trash' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => handleArchiveClick(e, email.id)}
                            title="Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-destructive"
                          onClick={(e) => handleDeleteClick(e, email.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
