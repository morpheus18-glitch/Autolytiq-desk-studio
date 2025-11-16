/**
 * Email List Component
 *
 * Displays inbox/sent/drafts with search and filtering
 */

import { useState } from 'react';
import { Mail, Star, Trash2, Search, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useEmails,
  useMarkEmailAsRead,
  useToggleEmailStar,
  useDeleteEmail,
  type EmailMessage,
} from '@/hooks/use-email';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EmailListProps {
  folder?: string;
  customerId?: string;
  dealId?: string;
  onSelectEmail?: (email: EmailMessage) => void;
  selectedEmailId?: string;
}

export function EmailList({
  folder = 'inbox',
  customerId,
  dealId,
  onSelectEmail,
  selectedEmailId,
}: EmailListProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Queries
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

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const emails = data?.data || [];
  const total = data?.total || 0;

  const handleEmailClick = (email: EmailMessage) => {
    if (!email.isRead) {
      markAsRead.mutate({ id: email.id, isRead: true });
    }
    onSelectEmail?.(email);
  };

  const handleStarClick = (e: React.MouseEvent, email: EmailMessage) => {
    e.stopPropagation();
    toggleStar.mutate({ id: email.id, isStarred: !email.isStarred });
  };

  const handleDeleteClick = (e: React.MouseEvent, email: EmailMessage) => {
    e.stopPropagation();
    deleteEmail.mutate({ id: email.id });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold capitalize">{folder}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
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
            className="pl-9"
          />
        </div>

        {/* Results count */}
        {total > 0 && (
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'email' : 'emails'}
          </p>
        )}
      </div>

      {/* Email List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Mail className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">
              {search ? 'No emails found' : `No emails in ${folder}`}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {emails.map((email: EmailMessage) => (
              <div
                key={email.id}
                onClick={() => handleEmailClick(email)}
                className={cn(
                  'p-4 cursor-pointer hover:bg-accent/50 transition-colors border-b',
                  !email.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                  selectedEmailId === email.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Unread Indicator (Gmail style blue dot) */}
                  <div className="mt-2 w-2 h-2 flex-shrink-0">
                    {!email.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}
                  </div>

                  {/* Star */}
                  <button
                    onClick={(e) => handleStarClick(e, email)}
                    className="mt-1 hover:text-yellow-500 transition-colors flex-shrink-0"
                  >
                    <Star
                      className={cn(
                        'h-4 w-4',
                        email.isStarred && 'fill-yellow-500 text-yellow-500'
                      )}
                    />
                  </button>

                  {/* Email Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'truncate',
                            !email.isRead ? 'font-bold text-foreground' : 'font-normal text-foreground/80'
                          )}
                        >
                          {email.fromName || email.fromAddress}
                        </span>
                        {email.isDraft && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs whitespace-nowrap flex-shrink-0",
                        !email.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'
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

                    {email.textBody && (
                      <div className="text-sm text-muted-foreground truncate">
                        {email.textBody.substring(0, 100)}
                      </div>
                    )}

                    {/* Recipients (for sent emails) */}
                    {folder === 'sent' && email.toAddresses && (
                      <div className="text-xs text-muted-foreground mt-1">
                        To: {email.toAddresses.map((r) => r.email).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={(e) => handleDeleteClick(e, email)}
                    className="mt-1 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
