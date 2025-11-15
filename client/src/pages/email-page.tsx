/**
 * Email Page
 *
 * Main email interface with inbox, compose, and read functionality
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmailList } from '@/components/email/email-list';
import { EmailDetail } from '@/components/email/email-detail';
import { EmailComposeDialog } from '@/components/email/email-compose-dialog';
import { useUnreadCounts, type EmailMessage } from '@/hooks/use-email';
import { cn } from '@/lib/utils';

const FOLDERS = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export default function EmailPage() {
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data: unreadData } = useUnreadCounts();
  const unreadCounts = unreadData?.data || {};

  const handleSelectEmail = (email: EmailMessage) => {
    setSelectedEmail(email);
  };

  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Folders */}
      <div className="w-64 border-r flex flex-col">
        <div className="p-4">
          <Button
            onClick={() => setComposeOpen(true)}
            className="w-full"
            size="lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Compose
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
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setSelectedEmail(null);
                  }}
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
          <Button variant="ghost" className="w-full justify-start" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="w-96 border-r flex flex-col">
        <EmailList
          folder={selectedFolder}
          onSelectEmail={handleSelectEmail}
          selectedEmailId={selectedEmail?.id}
        />
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col">
        <EmailDetail
          emailId={selectedEmail?.id || null}
          onClose={handleCloseDetail}
        />
      </div>

      {/* Compose Dialog */}
      <EmailComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
