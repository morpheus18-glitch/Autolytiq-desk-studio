/**
 * Email Detail View
 *
 * Displays full email content with reply/forward options
 */

import { useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Archive,
  MoreVertical,
  Mail,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useEmail,
  useMarkEmailAsRead,
  useToggleEmailStar,
  useDeleteEmail,
  type EmailMessage,
} from '@/hooks/use-email';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { EmailComposeDialog } from './email-compose-dialog';

interface EmailDetailProps {
  emailId: string | null;
  onClose?: () => void;
}

export function EmailDetail({ emailId, onClose }: EmailDetailProps) {
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyAll, setReplyAll] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);

  const { data, isLoading } = useEmail(emailId);
  const markAsRead = useMarkEmailAsRead();
  const toggleStar = useToggleEmailStar();
  const deleteEmail = useDeleteEmail();

  if (!emailId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <Mail className="h-10 w-10 opacity-30" />
        </div>
        <p className="text-lg font-medium">Select an email to read</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Choose a message from the list to view its contents
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading email...</p>
      </div>
    );
  }

  const email: EmailMessage | undefined = data?.data;

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <Mail className="h-10 w-10 opacity-30" />
        </div>
        <p className="text-lg font-medium">Email not found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          This email may have been deleted or moved
        </p>
      </div>
    );
  }

  const handleReply = () => {
    setReplyAll(false);
    setReplyDialogOpen(true);
  };

  const handleReplyAll = () => {
    setReplyAll(true);
    setReplyDialogOpen(true);
  };

  const handleForward = () => {
    setForwardDialogOpen(true);
  };

  // Format quoted text for reply/forward
  const getQuotedText = (email: EmailMessage) => {
    const dateStr = email.sentAt || email.createdAt
      ? format(new Date(email.sentAt || email.createdAt), 'PPpp')
      : 'Unknown date';
    const from = email.fromName || email.fromAddress || 'Unknown sender';
    const body = email.textBody || email.htmlBody?.replace(/<[^>]*>/g, '') || '';

    return `On ${dateStr}, ${from} wrote:\n\n${body}`;
  };

  // Get Cc recipients for Reply All
  const getReplyAllCc = (email: EmailMessage) => {
    const ccEmails: string[] = [];

    // Add all original To recipients except the current user
    if (email.toAddresses && Array.isArray(email.toAddresses)) {
      email.toAddresses.forEach(addr => {
        if (addr?.email) ccEmails.push(addr.email);
      });
    }

    // Add all original Cc recipients
    if (email.ccAddresses && Array.isArray(email.ccAddresses)) {
      email.ccAddresses.forEach(addr => {
        if (addr?.email) ccEmails.push(addr.email);
      });
    }

    return ccEmails;
  };

  const handleDelete = () => {
    deleteEmail.mutate({ id: email.id });
    onClose?.();
  };

  const handleToggleStar = () => {
    toggleStar.mutate({ id: email.id, isStarred: !email.isStarred });
  };

  const handleMarkUnread = () => {
    markAsRead.mutate({ id: email.id, isRead: false });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date';
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return 'Invalid date';
    }
  };

  // Get sender initials
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
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          {/* Mobile back button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="md:hidden mb-3 -ml-2 gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold line-clamp-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {email.subject || '(no subject)'}
            </h2>

            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReply}
                title="Reply"
                className="hover:bg-primary/10"
              >
                <Reply className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReplyAll}
                title="Reply All"
                className="hover:bg-primary/10"
              >
                <ReplyAll className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleForward}
                title="Forward"
                className="hover:bg-primary/10"
              >
                <Forward className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1 opacity-50" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleStar}
                title={email.isStarred ? 'Unstar' : 'Star'}
                className="hover:bg-primary/10"
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    email.isStarred && 'fill-yellow-500 text-yellow-500'
                  )}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                title="Delete"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-primary/10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="backdrop-blur-lg bg-popover/95">
                  <DropdownMenuItem onClick={handleMarkUnread}>
                    Mark as unread
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem>Print</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Sender Info Card */}
          <Card className="p-4 backdrop-blur-sm bg-card/50 border-border/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-base font-bold text-primary">
                    {getInitials(email.fromName, email.fromAddress)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {email.fromName || email.fromAddress}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {email.fromAddress}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDate(email.sentAt || email.createdAt)}
              </div>
            </div>

            {/* Recipients */}
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
              <div className="text-sm">
                <span className="text-muted-foreground font-medium">To: </span>
                {email.toAddresses && Array.isArray(email.toAddresses) ? (
                  <span className="text-foreground/80">
                    {email.toAddresses.map((r, i) => (
                      <span key={i}>
                        {r?.name || r?.email || 'Unknown'}
                        {i < email.toAddresses.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">No recipients</span>
                )}
              </div>

              {email.ccAddresses && Array.isArray(email.ccAddresses) && email.ccAddresses.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">Cc: </span>
                  <span className="text-foreground/80">
                    {email.ccAddresses.map((r, i) => (
                      <span key={i}>
                        {r?.name || r?.email || 'Unknown'}
                        {i < (email.ccAddresses?.length || 0) - 1 && ', '}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {/* Badges */}
            {(email.isDraft || email.customerId || email.dealId) && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                {email.isDraft && (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
                    Draft
                  </Badge>
                )}
                {email.customerId && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Customer Email
                  </Badge>
                )}
                {email.dealId && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    Deal Email
                  </Badge>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Email Body */}
        <ScrollArea className="flex-1 bg-background/30">
          <div className="p-6">
            {email.htmlBody ? (
              <Card className="p-6 backdrop-blur-sm bg-card/30 border-border/30">
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(email.htmlBody, {
                      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
                      ALLOW_DATA_ATTR: false,
                    })
                  }}
                />
              </Card>
            ) : email.textBody ? (
              <Card className="p-6 backdrop-blur-sm bg-card/30 border-border/30">
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90">
                  {email.textBody}
                </pre>
              </Card>
            ) : (
              <Card className="p-6 backdrop-blur-sm bg-card/30 border-border/30">
                <div className="text-muted-foreground italic text-center py-8">
                  This email has no content.
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Quick Reply Bar */}
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleReply}
              className="flex-1 gap-2 backdrop-blur-sm bg-background/50"
            >
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button
              variant="outline"
              onClick={handleReplyAll}
              className="gap-2 backdrop-blur-sm bg-background/50"
            >
              <ReplyAll className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleForward}
              className="gap-2 backdrop-blur-sm bg-background/50"
            >
              <Forward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Reply Dialog */}
      <EmailComposeDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        defaultTo={email.fromAddress}
        defaultCc={replyAll ? getReplyAllCc(email) : undefined}
        defaultSubject={`Re: ${email.subject || ''}`}
        quotedText={getQuotedText(email)}
        customerId={email.customerId || undefined}
        dealId={email.dealId || undefined}
      />

      {/* Forward Dialog */}
      <EmailComposeDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        defaultSubject={`Fwd: ${email.subject || ''}`}
        quotedText={getQuotedText(email)}
        customerId={email.customerId || undefined}
        dealId={email.dealId || undefined}
      />
    </>
  );
}
