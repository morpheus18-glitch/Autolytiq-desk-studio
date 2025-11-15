/**
 * Email Page
 *
 * Main email application page with folder navigation, inbox list, and message view.
 * Mobile-first responsive layout styled like Gmail/Outlook.
 *
 * Features:
 * - Folder sidebar (inbox, sent, drafts, trash, custom folders)
 * - Email list view
 * - Message detail view
 * - Compose new email
 * - Unread counts
 * - Responsive layout (mobile and desktop)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Send,
  FileText,
  Trash2,
  Archive,
  Inbox,
  Star,
  PenSquare,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { EmailInboxList, type EmailMessage } from "@/components/email/email-inbox-list";
import { EmailCompose } from "@/components/email/email-compose";
import { EmailMessageView } from "@/components/email/email-message-view";
import { apiRequest } from "@/lib/queryClient";

export default function EmailPage() {
  const [selectedFolder, setSelectedFolder] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch unread counts
  const { data: unreadData } = useQuery({
    queryKey: ["/api/email/unread-counts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email/unread-counts");
      return await response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadCounts = unreadData?.data || {};

  // System folders
  const folders = [
    { id: "inbox", name: "Inbox", icon: Inbox, count: unreadCounts.inbox || 0 },
    { id: "sent", name: "Sent", icon: Send, count: 0 },
    { id: "drafts", name: "Drafts", icon: FileText, count: unreadCounts.drafts || 0 },
    { id: "starred", name: "Starred", icon: Star, count: 0 },
    { id: "trash", name: "Trash", icon: Trash2, count: 0 },
    { id: "archive", name: "Archive", icon: Archive, count: 0 },
  ];

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setIsComposing(false);
    setMobileMenuOpen(false);
  };

  const handleEmailSelect = (email: EmailMessage) => {
    setSelectedEmail(email);
    setIsComposing(false);
  };

  const handleCompose = () => {
    setIsComposing(true);
    setSelectedEmail(null);
    setReplyTo(null);
  };

  const handleReply = (email: any) => {
    setReplyTo(email);
    setIsComposing(true);
    setSelectedEmail(null);
  };

  const handleBack = () => {
    setSelectedEmail(null);
    setIsComposing(false);
    setReplyTo(null);
  };

  // Folder sidebar component
  const FolderSidebar = ({ className }: { className?: string }) => (
    <div className={cn("flex flex-col h-full bg-muted/30", className)}>
      {/* Compose button */}
      <div className="p-4">
        <Button
          onClick={handleCompose}
          className="w-full gap-2"
        >
          <PenSquare className="w-4 h-4" />
          Compose
        </Button>
      </div>

      {/* Folder list */}
      <nav className="flex-1 overflow-y-auto px-2">
        {folders.map((folder) => {
          const Icon = folder.icon;
          const isActive = selectedFolder === folder.id;

          return (
            <button
              key={folder.id}
              onClick={() => handleFolderSelect(folder.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                "hover:bg-accent",
                isActive && "bg-accent text-accent-foreground font-medium"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{folder.name}</span>
              {folder.count > 0 && (
                <Badge variant={isActive ? "default" : "secondary"} className="ml-auto">
                  {folder.count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          Powered by Resend
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Mobile header */}
      <div className="md:hidden border-b p-3 flex items-center gap-3 bg-background">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <FolderSidebar />
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-semibold">
          {folders.find((f) => f.id === selectedFolder)?.name || "Email"}
        </h1>

        {!selectedEmail && !isComposing && (
          <Button
            onClick={handleCompose}
            size="sm"
            className="ml-auto"
          >
            <PenSquare className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Desktop/tablet layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (desktop only) */}
        <div className="hidden md:block w-64 border-r">
          <FolderSidebar />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex">
          {/* Email list */}
          <div
            className={cn(
              "w-full md:w-96 border-r",
              (selectedEmail || isComposing) && "hidden md:block"
            )}
          >
            <EmailInboxList
              folder={selectedFolder}
              onSelectEmail={handleEmailSelect}
              onCompose={handleCompose}
            />
          </div>

          {/* Message view or compose */}
          <div
            className={cn(
              "flex-1 bg-background",
              !selectedEmail && !isComposing && "hidden md:flex md:items-center md:justify-center"
            )}
          >
            {isComposing ? (
              <div className="h-full flex items-center justify-center p-4">
                <div className="w-full max-w-3xl">
                  <EmailCompose
                    onClose={handleBack}
                    onSent={handleBack}
                    replyTo={replyTo}
                  />
                </div>
              </div>
            ) : selectedEmail ? (
              <EmailMessageView
                emailId={selectedEmail.id}
                onBack={handleBack}
                onReply={handleReply}
              />
            ) : (
              <div className="text-center p-8">
                <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No message selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select an email to read
                </p>
                <Button onClick={handleCompose}>
                  <PenSquare className="w-4 h-4 mr-2" />
                  Compose New Email
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
