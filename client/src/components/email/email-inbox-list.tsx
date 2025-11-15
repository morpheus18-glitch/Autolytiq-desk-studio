/**
 * Email Inbox List Component
 *
 * Mobile-first email list view styled like Gmail/Outlook.
 * Features:
 * - Responsive list of emails
 * - Unread indicators
 * - Star/flag functionality
 * - Swipe actions on mobile
 * - Multi-select for bulk actions
 * - Search and filters
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Mail,
  MailOpen,
  Star,
  Trash2,
  Archive,
  MoreVertical,
  Search,
  RefreshCw,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";

export interface EmailMessage {
  id: string;
  subject: string;
  fromAddress: string;
  fromName: string | null;
  toAddresses: Array<{ email: string; name?: string }>;
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  folder: string;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  customerId?: string | null;
  dealId?: string | null;
}

interface EmailInboxListProps {
  folder: string;
  onSelectEmail: (email: EmailMessage) => void;
  onCompose: () => void;
  className?: string;
}

export function EmailInboxList({
  folder,
  onSelectEmail,
  onCompose,
  className,
}: EmailInboxListProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch emails
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/email/messages", { folder, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("folder", folder);
      if (searchQuery) params.set("search", searchQuery);

      const response = await apiRequest("GET", `/api/email/messages?${params}`);
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const response = await apiRequest(
        "POST",
        `/api/email/messages/${id}/read`,
        { isRead }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
    },
  });

  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      const response = await apiRequest(
        "POST",
        `/api/email/messages/${id}/star`,
        { isStarred }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(
        "DELETE",
        `/api/email/messages/${id}`,
        {}
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
    },
  });

  // Bulk actions
  const handleBulkMarkAsRead = async (isRead: boolean) => {
    const emailIds = Array.from(selectedIds);
    await apiRequest("POST", "/api/email/bulk/read", { emailIds, isRead });
    queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const emailIds = Array.from(selectedIds);
    await apiRequest("POST", "/api/email/bulk/delete", {
      emailIds,
      permanent: false,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/email/messages"] });
    queryClient.invalidateQueries({ queryKey: ["/api/email/unread-counts"] });
    setSelectedIds(new Set());
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails?.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails?.map((e: EmailMessage) => e.id) || []));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const emails = data?.data || [];
  const hasSelection = selectedIds.size > 0;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        {/* Search bar */}
        <div className="p-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Button size="icon" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Bulk actions bar */}
        {hasSelection && (
          <div className="px-3 py-2 flex items-center gap-2 bg-muted/50 border-t">
            <Checkbox
              checked={selectedIds.size === emails.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleBulkMarkAsRead(true)}
            >
              <MailOpen className="w-4 h-4 mr-1" />
              Read
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleBulkMarkAsRead(false)}
            >
              <Mail className="w-4 h-4 mr-1" />
              Unread
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBulkDelete}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        )}

        {!isLoading && emails.length === 0 && (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">No messages</p>
            {folder === "inbox" && (
              <Button onClick={onCompose} className="mt-4">
                Compose New Email
              </Button>
            )}
          </div>
        )}

        {emails.map((email: EmailMessage) => (
          <EmailRow
            key={email.id}
            email={email}
            selected={selectedIds.has(email.id)}
            onSelect={() => handleToggleSelect(email.id)}
            onClick={() => {
              // Mark as read when opening
              if (!email.isRead) {
                markAsReadMutation.mutate({ id: email.id, isRead: true });
              }
              onSelectEmail(email);
            }}
            onToggleStar={(isStarred) => {
              toggleStarMutation.mutate({ id: email.id, isStarred });
            }}
            onDelete={() => {
              deleteMutation.mutate(email.id);
            }}
          />
        ))}
      </div>

      {/* Floating compose button (mobile) */}
      <Button
        onClick={onCompose}
        className="md:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        <Mail className="w-6 h-6" />
      </Button>
    </div>
  );
}

// Email row component
interface EmailRowProps {
  email: EmailMessage;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onToggleStar: (isStarred: boolean) => void;
  onDelete: () => void;
}

function EmailRow({
  email,
  selected,
  onSelect,
  onClick,
  onToggleStar,
  onDelete,
}: EmailRowProps) {
  const displayDate = email.sentAt || email.receivedAt || email.createdAt;
  const isToday = new Date(displayDate).toDateString() === new Date().toDateString();

  return (
    <div
      className={cn(
        "group border-b hover:bg-accent/50 transition-colors cursor-pointer",
        !email.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
    >
      <div className="flex items-start gap-3 p-3 md:p-4">
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={selected} onCheckedChange={onSelect} />
        </div>

        {/* Star */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(!email.isStarred);
          }}
          className="mt-1"
        >
          <Star
            className={cn(
              "w-4 h-4 transition-colors",
              email.isStarred
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>

        {/* Email content */}
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span
              className={cn(
                "text-sm truncate",
                email.isRead ? "font-normal" : "font-semibold"
              )}
            >
              {email.fromName || email.fromAddress}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {isToday
                ? format(new Date(displayDate), "h:mm a")
                : format(new Date(displayDate), "MMM d")}
            </span>
          </div>

          <div
            className={cn(
              "text-sm truncate mb-1",
              email.isRead ? "text-muted-foreground" : "font-medium"
            )}
          >
            {email.subject || "(No Subject)"}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            {email.isDraft && (
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            )}
            {email.customerId && (
              <Badge variant="secondary" className="text-xs">
                Customer
              </Badge>
            )}
            {email.dealId && (
              <Badge variant="secondary" className="text-xs">
                Deal
              </Badge>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
