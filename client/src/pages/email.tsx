/**
 * Email Page
 *
 * Main email interface with secure backend integration
 * Connected to 8-layer security airlock system
 */

import { useState } from 'react';
import {
  Mail,
  Send,
  FileText,
  Trash2,
  Star,
  Inbox,
  Plus,
  Settings,
  Menu,
  RefreshCw,
  Archive,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PageLayout } from '@/components/page-layout';
import { EmailListEnhanced } from '@/components/email/email-list-enhanced';
import { EmailDetail } from '@/components/email/email-detail';
import { EmailComposeDialog } from '@/components/email/email-compose-dialog';
import { useUnreadCounts, type EmailMessage } from '@/hooks/use-email';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function EmailPage() {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: unreadData } = useUnreadCounts();
  const unreadCounts = unreadData?.data || {};

  // Sync inbox mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/email/sync', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync inbox');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-unread-counts'] });
      toast({
        title: 'Inbox synced',
        description: data.newMessages
          ? `${data.newMessages} new message${data.newMessages > 1 ? 's' : ''} received`
          : 'Inbox is up to date',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSelectEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
  };

  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setMobileMenuOpen(false);
  };

  // Folder Sidebar Component
  const FolderSidebar = ({ className }: { className?: string }) => (
    <div className={cn('flex flex-col h-full bg-card/30 backdrop-blur-sm', className)}>
      <div className="p-4 space-y-3">
        <Button
          onClick={() => setComposeOpen(true)}
          className="w-full gap-2 shadow-lg shadow-primary/20"
          size="lg"
        >
          <Plus className="h-4 w-4" />
          Compose
        </Button>
        <Button
          onClick={() => syncMutation.mutate()}
          variant="outline"
          className="w-full gap-2 backdrop-blur-sm bg-background/50 hover:bg-background/80"
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Inbox'}
        </Button>
      </div>

      <Separator className="opacity-50" />

      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-1">
          {FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const unreadCount = unreadCounts[folder.id] || 0;

            return (
              <button
                key={folder.id}
                onClick={() => handleFolderSelect(folder.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  selectedFolder === folder.id
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "h-4 w-4",
                    selectedFolder === folder.id && "text-primary"
                  )} />
                  <span>{folder.label}</span>
                </div>
                {unreadCount > 0 && (
                  <Badge
                    variant={selectedFolder === folder.id ? "default" : "secondary"}
                    className={cn(
                      "h-5 px-1.5 text-xs font-semibold",
                      selectedFolder === folder.id && "bg-primary text-primary-foreground"
                    )}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="opacity-50" />

      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          size="sm"
          onClick={() => window.location.href = '/email/settings'}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Secured by Airlock System</span>
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button size="icon" variant="ghost">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px]">
                  <FolderSidebar />
                </SheetContent>
              </Sheet>

              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25">
                <Mail className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Email
                </h1>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  Secure communications center
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync'}
              </Button>
              <Button
                size="lg"
                onClick={() => setComposeOpen(true)}
                className="gap-2 shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4" />
                Compose
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 md:px-6 py-6">
        <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border shadow-sm backdrop-blur-md bg-card/40">
          {/* Sidebar - Desktop only */}
          <div className="hidden md:block w-64 border-r border-border/50 flex-shrink-0">
            <FolderSidebar />
          </div>

          {/* Email List */}
          <div
            className={cn(
              'w-full md:w-96 border-r border-border/50 flex-shrink-0 bg-background/50',
              selectedEmail && 'hidden md:block'
            )}
          >
            <EmailListEnhanced
              folder={selectedFolder}
              onSelectEmail={handleSelectEmail}
              selectedEmailId={selectedEmail?.id}
            />
          </div>

          {/* Email Detail */}
          <div
            className={cn(
              'flex-1 bg-background/30',
              !selectedEmail && 'hidden md:block'
            )}
          >
            <EmailDetail
              emailId={selectedEmail?.id || null}
              onClose={handleCloseDetail}
            />
          </div>
        </div>
      </div>

      {/* Compose Dialog */}
      <EmailComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </PageLayout>
  );
}
