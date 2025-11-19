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
import { Archive } from 'lucide-react';

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
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-4 space-y-2">
        <Button
          onClick={() => setComposeOpen(true)}
          className="w-full"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Compose
        </Button>
        <Button
          onClick={() => syncMutation.mutate()}
          variant="outline"
          className="w-full"
          disabled={syncMutation.isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", syncMutation.isPending && "animate-spin")} />
          {syncMutation.isPending ? 'Syncing...' : 'Sync Inbox'}
        </Button>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const unreadCount = unreadCounts[folder.id] || 0;

            return (
              <button
                key={folder.id}
                onClick={() => handleFolderSelect(folder.id)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  selectedFolder === folder.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{folder.label}</span>
                </div>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          size="sm"
          onClick={() => window.location.href = '/email/settings'}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <div className="p-4 text-center border-t">
        <p className="text-xs text-muted-foreground">
          🛡️ Secured by Airlock System
        </p>
      </div>
    </div>
  );

  return (
    <PageLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
        {/* Mobile Header */}
        <div className="md:hidden border-b p-3 flex items-center gap-3 absolute top-0 left-0 right-0 z-10 bg-background">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <FolderSidebar />
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-semibold capitalize">{selectedFolder}</h1>

          <Button
            size="icon"
            variant="ghost"
            className="ml-auto"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
          </Button>
        </div>

        {/* Desktop Layout */}
        <div className="flex w-full pt-[52px] md:pt-0">
          {/* Sidebar - Desktop only */}
          <div className="hidden md:block w-64 border-r flex-shrink-0">
            <FolderSidebar />
          </div>

          {/* Email List */}
          <div
            className={cn(
              'w-full md:w-96 border-r flex-shrink-0',
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
              'flex-1',
              !selectedEmail && 'hidden md:block'
            )}
          >
            <EmailDetail
              emailId={selectedEmail?.id || null}
              onClose={handleCloseDetail}
            />
          </div>
        </div>

        {/* Compose Dialog */}
        <EmailComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
      </div>
    </PageLayout>
  );
}
