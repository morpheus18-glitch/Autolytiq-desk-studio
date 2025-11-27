/**
 * Settings Page
 *
 * Comprehensive settings management for user preferences, appearance,
 * and module-specific configurations with real-time persistence.
 */

import { useState, type JSX } from 'react';
import { Loader2 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent } from '@design-system';
import { SettingsNavigation, SettingsContent } from './settings/components';
import { useProfileForm, usePasswordForm, useSettingsHandlers } from './settings/hooks';

export function SettingsPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState('appearance');

  // Use extracted hooks
  const profileForm = useProfileForm();
  const passwordForm = usePasswordForm();
  const { settings, handlers, isLoading, isMutating } = useSettingsHandlers();

  return (
    <MainLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
      />

      <div className="px-4 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <SettingsNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          <div className="flex-1 min-w-0">
            {isLoading && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            )}

            {isMutating && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving changes...
              </div>
            )}

            {!isLoading && (
              <SettingsContent
                activeTab={activeTab}
                settings={settings}
                handlers={handlers}
                profileProps={profileForm}
                passwordProps={passwordForm}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
