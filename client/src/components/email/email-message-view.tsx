/**
 * Email Message View Component
 *
 * Full message view styled like Gmail/Outlook.
 * Features:
 * - Message header with from/to/date
 * - HTML or plain text body
 * - Attachments list
 * - Reply/forward actions
 * - Delete/archive/star
 * - Mobile responsive
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import DOMPurify from "dompurify";
import {
  ArrowLeft,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Trash2,
  Archive,
  MoreVertical,
  Download,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";

interface EmailMessageViewProps {
  emailId: string;
  onBack: () => void;
  onReply: (email: any) => void;
  onCompose?: () => void;
  className?: string;
}

export function EmailMessageView({
  emailId,
  onBack,
  onReply,
  className,
}: EmailMessageViewProps) {
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);

  // Fetch email
  const { data, isLoading } = useQuery({
    queryKey: ["/api/email/messages", emailId],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/email/messages/${emailId}`
      );
      return await response.json();
    },
    enabled: !!emailId,
  });

  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: async (isStarred: boolean) => {
      const response = await apiRequest(
        "POST",
        `/api/email/messages/${emailId}/star`,
        { isStarred }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/email/messages", emailId],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "DELETE",
        `/api/email/messages/${emailId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
      onBack();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const email = data?.data;

  if (!email) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Email not found</p>
        <Button onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const displayDate = email.sentAt || email.receivedAt || email.createdAt;
  const attachments = email.attachments || [];

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 p-3">
          <Button size="icon" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div className="flex-1" />

          {/* Actions */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => toggleStarMutation.mutate(!email.isStarred)}
          >
            <Star
              className={cn(
                "w-4 h-4",
                email.isStarred
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => onReply(email)}
          >
            <Reply className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onReply(email)}>
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ReplyAll className="w-4 h-4 mr-2" />
                Reply All
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Forward className="w-4 h-4 mr-2" />
                Forward
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => deleteMutation.mutate()}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          {/* Subject */}
          <h1 className="text-2xl font-bold mb-4">{email.subject || "(No Subject)"}</h1>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-6">
            {email.isDraft && (
              <Badge variant="outline">Draft</Badge>
            )}
            {email.customerId && (
              <Badge variant="secondary">Customer</Badge>
            )}
            {email.dealId && (
              <Badge variant="secondary">Deal</Badge>
            )}
          </div>

          {/* From/To header */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                    {email.fromName?.[0]?.toUpperCase() ||
                      email.fromAddress[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">
                      {email.fromName || email.fromAddress}
                    </p>
                    {email.fromName && (
                      <p className="text-sm text-muted-foreground">
                        {email.fromAddress}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground text-right">
                {format(new Date(displayDate), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>

            {/* Show/hide details toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Show details
                </>
              )}
            </Button>

            {/* Details */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-16">To:</span>
                  <span>
                    {email.toAddresses
                      .map((addr: any) => addr.name || addr.email)
                      .join(", ")}
                  </span>
                </div>

                {email.ccAddresses && email.ccAddresses.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Cc:</span>
                    <span>
                      {email.ccAddresses
                        .map((addr: any) => addr.name || addr.email)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {email.replyTo && (
                  <div className="flex gap-2">
                    <span className="text-muted-foreground w-16">Reply-To:</span>
                    <span>{email.replyTo}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {attachments.length} attachment{attachments.length !== 1 && "s"}
                </span>
              </div>
              <div className="space-y-2">
                {attachments.map((attachment: any) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50"
                  >
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.contentType}
                        {attachment.size && ` • ${formatFileSize(attachment.size)}`}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {email.htmlBody ? (
              <div dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(email.htmlBody, {
                  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
                  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel'],
                  ALLOW_DATA_ATTR: false,
                })
              }} />
            ) : (
              <p className="whitespace-pre-wrap">{email.textBody}</p>
            )}
          </div>
        </div>
      </div>

      {/* Reply/forward actions (mobile) */}
      <div className="md:hidden border-t p-3 bg-background sticky bottom-0">
        <div className="flex gap-2">
          <Button
            onClick={() => onReply(email)}
            variant="outline"
            className="flex-1"
          >
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </Button>
          <Button variant="outline" className="flex-1">
            <Forward className="w-4 h-4 mr-2" />
            Forward
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper function
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
