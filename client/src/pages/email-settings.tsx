import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/page-layout';
import { PageHero } from '@/components/page-hero';
import { Settings, Save, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

type EmailSettings = {
  signature: string;
  displayDensity: 'compact' | 'comfortable' | 'cozy';
  showPreview: boolean;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
  desktopNotifications: boolean;
  readReceipts: boolean;
};

export default function EmailSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/email/settings'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/email/settings');
        return await res.json();
      } catch (error) {
        // Return defaults if settings don't exist yet
        return {
          signature: '',
          displayDensity: 'comfortable',
          showPreview: true,
          autoReplyEnabled: false,
          autoReplyMessage: '',
          desktopNotifications: true,
          readReceipts: false,
        };
      }
    },
  });

  const [settings, setSettings] = useState<EmailSettings>(
    settingsData || {
      signature: '',
      displayDensity: 'comfortable' as const,
      showPreview: true,
      autoReplyEnabled: false,
      autoReplyMessage: '',
      desktopNotifications: true,
      readReceipts: false,
    }
  );

  // Update settings when loaded
  useState(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettings) => {
      const res = await apiRequest('POST', '/api/email/settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/settings'] });
      toast({
        title: 'Settings saved',
        description: 'Your email settings have been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save settings',
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  return (
    <PageLayout>
      <PageHero
        icon={Settings}
        title="Email Settings"
        description="Customize your email experience"
        actions={
          <Button variant="ghost" onClick={() => setLocation('/email')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Email
          </Button>
        }
      />

      <div className="container mx-auto px-4 md:px-6 py-8 max-w-4xl space-y-6">
        {/* Signature */}
        <Card>
          <CardHeader>
            <CardTitle>Email Signature</CardTitle>
            <CardDescription>
              Add a signature that appears at the bottom of your emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signature">Signature</Label>
              <Textarea
                id="signature"
                placeholder="Best regards,&#10;Your Name&#10;Title&#10;Company"
                value={settings.signature}
                onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                rows={6}
              />
              <p className="text-sm text-muted-foreground">
                Plain text only. Line breaks will be preserved.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Customize how emails are displayed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="density">Density</Label>
              <Select
                value={settings.displayDensity}
                onValueChange={(value: 'compact' | 'comfortable' | 'cozy') =>
                  setSettings({ ...settings, displayDensity: value })
                }
              >
                <SelectTrigger id="density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="comfortable">Comfortable (Default)</SelectItem>
                  <SelectItem value="cozy">Cozy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Compact shows more emails, cozy shows larger text and more spacing
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Preview</Label>
                <p className="text-sm text-muted-foreground">
                  Show a preview of email content in the list
                </p>
              </div>
              <Switch
                checked={settings.showPreview}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, showPreview: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications for new emails
                </p>
              </div>
              <Switch
                checked={settings.desktopNotifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, desktopNotifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-Reply */}
        <Card>
          <CardHeader>
            <CardTitle>Auto-Reply / Vacation Responder</CardTitle>
            <CardDescription>
              Automatically reply to incoming emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Auto-Reply</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send a reply to new emails
                </p>
              </div>
              <Switch
                checked={settings.autoReplyEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoReplyEnabled: checked })
                }
              />
            </div>

            {settings.autoReplyEnabled && (
              <div className="space-y-2">
                <Label htmlFor="auto-reply">Auto-Reply Message</Label>
                <Textarea
                  id="auto-reply"
                  placeholder="Thank you for your email. I'm currently out of office and will respond when I return."
                  value={settings.autoReplyMessage}
                  onChange={(e) =>
                    setSettings({ ...settings, autoReplyMessage: e.target.value })
                  }
                  rows={4}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>
              Control privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Read Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Send read receipts when you open emails
                </p>
              </div>
              <Switch
                checked={settings.readReceipts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, readReceipts: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation('/email')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
