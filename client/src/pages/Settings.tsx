/**
 * Settings Page
 *
 * User and dealership settings management.
 */

import { useState, type JSX } from 'react';
import { User, Building2, Bell, Shield, Palette, Save, Check } from 'lucide-react';
import { MainLayout } from '@/layouts';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
} from '@design-system';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@design-system';
import { cn } from '@/lib/utils';

/**
 * Settings tabs
 */
const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'dealership', label: 'Dealership', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export function SettingsPage(): JSX.Element {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    title: 'Sales Manager',
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Settings"
        subtitle="Manage your account settings and preferences."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Settings' }]}
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar navigation */}
          <div className="w-full lg:w-64">
            <nav className="space-y-1">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content area */}
          <div className="flex-1">
            {/* Profile tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                      {user?.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('') || 'U'}
                    </div>
                    <div>
                      <Button variant="outline" size="sm">
                        Change Photo
                      </Button>
                      <p className="mt-2 text-xs text-muted-foreground">
                        JPG, PNG or GIF. Max 2MB.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Job Title</label>
                      <input
                        type="text"
                        value={profileData.title}
                        onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-border pt-6">
                    <Button onClick={handleSave} loading={isSaving}>
                      {saveSuccess ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Saved!
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Dealership tab */}
            {activeTab === 'dealership' && (
              <Card>
                <CardHeader>
                  <CardTitle>Dealership Settings</CardTitle>
                  <CardDescription>
                    Manage your dealership information and business settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Dealership Name</label>
                      <input
                        type="text"
                        defaultValue="Premium Auto Group"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Website</label>
                      <input
                        type="url"
                        defaultValue="https://premiumautogroup.com"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium text-foreground">Address</label>
                      <input
                        type="text"
                        defaultValue="1234 Auto Drive, Austin, TX 78701"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Phone</label>
                      <input
                        type="tel"
                        defaultValue="(512) 555-0100"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <input
                        type="email"
                        defaultValue="info@premiumautogroup.com"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-t border-border pt-6">
                    <Button onClick={handleSave} loading={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications tab */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about important events.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    {
                      id: 'new_leads',
                      label: 'New Leads',
                      description: 'Get notified when new leads come in',
                    },
                    {
                      id: 'deal_updates',
                      label: 'Deal Updates',
                      description: 'Updates on your active deals',
                    },
                    {
                      id: 'inventory',
                      label: 'Inventory Alerts',
                      description: 'Low stock and new arrival notifications',
                    },
                    {
                      id: 'team',
                      label: 'Team Activity',
                      description: 'Updates from your team members',
                    },
                    {
                      id: 'reports',
                      label: 'Daily Reports',
                      description: 'Daily summary of dealership performance',
                    },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">Email</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4 rounded border-input"
                          />
                          <span className="text-sm text-muted-foreground">Push</span>
                        </label>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-3 border-t border-border pt-6">
                    <Button onClick={handleSave} loading={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security tab */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>Manage your password and security preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Change Password</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium text-foreground">
                          Current Password
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">New Password</label>
                        <input
                          type="password"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="font-medium text-foreground">Two-Factor Authentication</h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add an extra layer of security to your account.
                    </p>
                    <Button variant="outline" className="mt-4">
                      Enable 2FA
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 border-t border-border pt-6">
                    <Button onClick={handleSave} loading={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Update Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Appearance tab */}
            {activeTab === 'appearance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Appearance</CardTitle>
                  <CardDescription>Customize how Autolytiq looks on your device.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="mb-4 font-medium text-foreground">Theme</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          'rounded-lg border-2 p-4 text-center transition-colors',
                          theme === 'light'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                      >
                        <div className="mx-auto mb-3 h-16 w-24 rounded-md bg-white border border-neutral-200" />
                        <span className="text-sm font-medium text-foreground">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          'rounded-lg border-2 p-4 text-center transition-colors',
                          theme === 'dark'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                      >
                        <div className="mx-auto mb-3 h-16 w-24 rounded-md bg-neutral-800 border border-neutral-700" />
                        <span className="text-sm font-medium text-foreground">Dark</span>
                      </button>
                      <button
                        className={cn(
                          'rounded-lg border-2 p-4 text-center transition-colors opacity-50 cursor-not-allowed',
                          'border-border'
                        )}
                        disabled
                      >
                        <div className="mx-auto mb-3 h-16 w-24 rounded-md bg-gradient-to-b from-white to-neutral-800 border border-neutral-400" />
                        <span className="text-sm font-medium text-foreground">System</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="mb-4 font-medium text-foreground">Display Density</h4>
                    <div className="space-y-3">
                      {['Comfortable', 'Compact'].map((density) => (
                        <label key={density} className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="density"
                            defaultChecked={density === 'Comfortable'}
                            className="h-4 w-4 border-input text-primary focus:ring-primary"
                          />
                          <span className="text-sm text-foreground">{density}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
