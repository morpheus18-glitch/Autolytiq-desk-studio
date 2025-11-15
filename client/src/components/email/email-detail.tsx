/**
 * Email Detail View
 *
 * Displays full email content with reply/forward options
 */

import { useState } from 'react';
import {
  Reply,
  ReplyAll,
  Forward,
  Trash2,
  Star,
  Archive,
  MoreVertical,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Mail className="h-16 w-16 mb-4 opacity-20" />
        <p>Select an email to read</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const email: EmailMessage | undefined = data?.data;

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Mail className="h-16 w-16 mb-4 opacity-20" />
        <p>Email not found</p>
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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'PPpp');
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold line-clamp-1">{email.subject || '(no subject)'}</h2>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReply}
                title="Reply"
              >
                <Reply className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReplyAll}
                title="Reply All"
              >
                <ReplyAll className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleForward}
                title="Forward"
              >
                <Forward className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-6 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleStar}
                title={email.isStarred ? 'Unstar' : 'Star'}
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
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleMarkUnread}>
                    Mark as unread
                  </DropdownMenuItem>
                  <DropdownMenuItem>Move to folder</DropdownMenuItem>
                  <DropdownMenuItem>Print</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Sender Info */}
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {(email.fromName || email.fromAddress).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium">
                    {email.fromName || email.fromAddress}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {email.fromAddress}
                  </div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(email.sentAt || email.createdAt)}
              </div>
            </div>

            {/* Recipients */}
            <div className="text-sm">
              <span className="text-muted-foreground">To: </span>
              {email.toAddresses.map((r, i) => (
                <span key={i}>
                  {r.name || r.email}
                  {i < email.toAddresses.length - 1 && ', '}
                </span>
              ))}
            </div>

            {email.ccAddresses && email.ccAddresses.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Cc: </span>
                {email.ccAddresses.map((r, i) => (
                  <span key={i}>
                    {r.name || r.email}
                    {i < (email.ccAddresses?.length || 0) - 1 && ', '}
                  </span>
                ))}
              </div>
            )}

            {/* Badges */}
            <div className="flex gap-2">
              {email.isDraft && <Badge variant="secondary">Draft</Badge>}
              {email.customerId && <Badge variant="outline">Customer Email</Badge>}
              {email.dealId && <Badge variant="outline">Deal Email</Badge>}
            </div>
          </div>
        </div>

        {/* Email Body */}
        <ScrollArea className="flex-1 p-6">
          {email.htmlBody ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.htmlBody }}
            />
          ) : email.textBody ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {email.textBody}
            </pre>
          ) : (
            <div className="text-muted-foreground italic">
              This email has no content.
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Reply Dialog */}
      <EmailComposeDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        defaultTo={email.fromAddress}
        defaultSubject={`Re: ${email.subject || ''}`}
        customerId={email.customerId || undefined}
        dealId={email.dealId || undefined}
      />

      {/* Forward Dialog */}
      <EmailComposeDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        defaultSubject={`Fwd: ${email.subject || ''}`}
        customerId={email.customerId || undefined}
        dealId={email.dealId || undefined}
      />
    </>
  );
}
