/**
 * Settings Page Components
 *
 * Extracted tab components for the Settings page to reduce cyclomatic complexity.
 */

import type { JSX } from 'react';
import {
  User,
  Building2,
  Bell,
  Shield,
  Palette,
  Save,
  Check,
  Globe,
  LayoutDashboard,
  Handshake,
  Users,
  Car,
  Store,
  MessageCircle,
  Eye,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@design-system';
import { cn, getInitials, getFullName } from '@/lib/utils';
import type { User as AuthUser } from '@/types/auth';
import type {
  AppearanceSettings,
  MessagesSettings,
  ShowroomSettings,
  DashboardSettings,
  DealsSettings,
  CustomersSettings,
  InventorySettings,
  PrivacySettings,
  SecuritySettings,
} from '@/types/settings';
import { SETTINGS_SECTIONS } from '@/types/settings';

// ============================================================================
// Shared Utility Components
// ============================================================================

/**
 * Icon mapping for settings sections
 */
const sectionIcons: Record<string, typeof User> = {
  Palette,
  Globe,
  Bell,
  LayoutDashboard,
  Handshake,
  Users,
  Car,
  Store,
  MessageCircle,
  User,
  Eye,
  Shield,
  Building2,
};

/**
 * Toggle Switch Component
 */
export function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

/**
 * Select Component
 */
export function Select({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Color Picker Component
 */
export function ColorPicker({
  value,
  onChange,
  presets = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
}: {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-8 cursor-pointer rounded border border-input"
      />
      <div className="flex gap-1">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
              value === color ? 'border-foreground' : 'border-transparent'
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Settings Section Component
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/**
 * Settings Row Component
 */
export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="font-medium text-foreground">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="ml-4">{children}</div>
    </div>
  );
}

// ============================================================================
// Navigation Component
// ============================================================================

interface SettingsNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsNavigation({
  activeTab,
  onTabChange,
}: SettingsNavigationProps): JSX.Element {
  const generalTabs = SETTINGS_SECTIONS.filter((s) => s.category === 'general');
  const moduleTabs = SETTINGS_SECTIONS.filter((s) => s.category === 'modules');
  const accountTabs = SETTINGS_SECTIONS.filter((s) => s.category === 'account');

  const renderTabGroup = (tabs: typeof SETTINGS_SECTIONS, title: string) => (
    <div>
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {tabs.map((tab) => {
          const Icon = sectionIcons[tab.icon] || User;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
              <ChevronRight
                className={cn(
                  'ml-auto h-4 w-4 opacity-0 transition-opacity',
                  isActive && 'opacity-100'
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full lg:w-64 shrink-0">
      <nav className="space-y-6 sticky top-4">
        {renderTabGroup(generalTabs, 'General')}
        {renderTabGroup(moduleTabs, 'Modules')}
        {renderTabGroup(accountTabs, 'Account')}
      </nav>
    </div>
  );
}

// ============================================================================
// Tab Content Components
// ============================================================================

// ----- Appearance Tab -----

interface AppearanceTabProps {
  appearance: AppearanceSettings;
  onChange: (
    key: keyof AppearanceSettings,
    value: AppearanceSettings[keyof AppearanceSettings]
  ) => void;
}

export function AppearanceTab({ appearance, onChange }: AppearanceTabProps): JSX.Element {
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, preview: 'bg-card border-border' },
    { value: 'dark', label: 'Dark', icon: Moon, preview: 'bg-muted border-border' },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      preview: 'bg-gradient-to-b from-card to-muted border-border',
    },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how Autolytiq looks on your device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Theme" description="Choose your preferred color scheme">
          <div className="grid grid-cols-3 gap-4">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = appearance.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange('theme', opt.value)}
                  className={cn(
                    'rounded-lg border-2 p-4 text-center transition-all',
                    isActive
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/50'
                  )}
                >
                  <div className={cn('mx-auto mb-3 h-16 w-24 rounded-md border', opt.preview)} />
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsSection>

        <SettingsSection title="Colors" description="Personalize your color palette">
          <SettingsRow
            label="Primary Color"
            description="Main accent color used throughout the app"
          >
            <ColorPicker
              value={appearance.primary_color}
              onChange={(v) => onChange('primary_color', v)}
            />
          </SettingsRow>
          <SettingsRow label="Accent Color" description="Secondary color for highlights">
            <ColorPicker
              value={appearance.accent_color}
              onChange={(v) => onChange('accent_color', v)}
              presets={['#F59E0B', '#10B981', '#06B6D4', '#EF4444', '#EC4899', '#6366F1']}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Display" description="Adjust display preferences">
          <SettingsRow label="Display Density" description="Control spacing and element sizes">
            <Select
              value={appearance.density}
              onChange={(v) => onChange('density', v as AppearanceSettings['density'])}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
                { value: 'spacious', label: 'Spacious' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Font Size" description="Adjust text size">
            <Select
              value={appearance.font_size}
              onChange={(v) => onChange('font_size', v as AppearanceSettings['font_size'])}
              options={[
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Sidebar Position" description="Place sidebar on left or right">
            <Select
              value={appearance.sidebar_position}
              onChange={(v) =>
                onChange('sidebar_position', v as AppearanceSettings['sidebar_position'])
              }
              options={[
                { value: 'left', label: 'Left' },
                { value: 'right', label: 'Right' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Collapse Sidebar" description="Start with sidebar collapsed">
            <Toggle
              checked={appearance.sidebar_collapsed}
              onChange={(v) => onChange('sidebar_collapsed', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Accessibility" description="Accessibility options">
          <SettingsRow label="Animations" description="Enable UI animations and transitions">
            <Toggle
              checked={appearance.animations_enabled}
              onChange={(v) => onChange('animations_enabled', v)}
            />
          </SettingsRow>
          <SettingsRow label="Reduce Motion" description="Minimize motion for accessibility">
            <Toggle
              checked={appearance.reduce_motion}
              onChange={(v) => onChange('reduce_motion', v)}
            />
          </SettingsRow>
          <SettingsRow label="High Contrast" description="Increase color contrast for visibility">
            <Toggle
              checked={appearance.high_contrast}
              onChange={(v) => onChange('high_contrast', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Messages Tab -----

interface MessagesTabProps {
  messages: MessagesSettings;
  onChange: (key: keyof MessagesSettings, value: MessagesSettings[keyof MessagesSettings]) => void;
}

export function MessagesTab({ messages, onChange }: MessagesTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages Settings</CardTitle>
        <CardDescription>Configure your messaging preferences and privacy options.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Privacy" description="Control message privacy settings">
          <SettingsRow
            label="Screenshot Protection"
            description="Blur messages when app loses focus or screenshot is attempted"
          >
            <Toggle
              checked={messages.screenshot_protection}
              onChange={(v) => onChange('screenshot_protection', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Read Receipts"
            description="Let others see when you've read their messages"
          >
            <Toggle
              checked={messages.read_receipts}
              onChange={(v) => onChange('read_receipts', v)}
            />
          </SettingsRow>
          <SettingsRow label="Typing Indicators" description="Show when you're typing a message">
            <Toggle
              checked={messages.typing_indicators}
              onChange={(v) => onChange('typing_indicators', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Behavior" description="Customize messaging behavior">
          <SettingsRow
            label="Enter to Send"
            description="Press Enter to send messages (Shift+Enter for new line)"
          >
            <Toggle
              checked={messages.enter_to_send}
              onChange={(v) => onChange('enter_to_send', v)}
            />
          </SettingsRow>
          <SettingsRow label="Sound on Message" description="Play a sound when receiving messages">
            <Toggle
              checked={messages.sound_on_message}
              onChange={(v) => onChange('sound_on_message', v)}
            />
          </SettingsRow>
          <SettingsRow label="Link Preview" description="Show previews for links in messages">
            <Toggle checked={messages.link_preview} onChange={(v) => onChange('link_preview', v)} />
          </SettingsRow>
          <SettingsRow
            label="Auto-download Media"
            description="Automatically download images and files"
          >
            <Toggle
              checked={messages.auto_download_media}
              onChange={(v) => onChange('auto_download_media', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Display" description="Customize message appearance">
          <SettingsRow label="Show Timestamps" description="When to display message timestamps">
            <Select
              value={messages.show_timestamps}
              onChange={(v) =>
                onChange('show_timestamps', v as MessagesSettings['show_timestamps'])
              }
              options={[
                { value: 'always', label: 'Always' },
                { value: 'hover', label: 'On Hover' },
                { value: 'never', label: 'Never' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Bubble Style" description="Message bubble appearance">
            <Select
              value={messages.bubble_style}
              onChange={(v) => onChange('bubble_style', v as MessagesSettings['bubble_style'])}
              options={[
                { value: 'modern', label: 'Modern' },
                { value: 'classic', label: 'Classic' },
                { value: 'minimal', label: 'Minimal' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Emoji Style" description="Choose emoji appearance">
            <Select
              value={messages.emoji_style}
              onChange={(v) => onChange('emoji_style', v as MessagesSettings['emoji_style'])}
              options={[
                { value: 'native', label: 'Native' },
                { value: 'twitter', label: 'Twitter' },
                { value: 'google', label: 'Google' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Group Notifications" description="Notification level for group chats">
            <Select
              value={messages.group_notifications}
              onChange={(v) =>
                onChange('group_notifications', v as MessagesSettings['group_notifications'])
              }
              options={[
                { value: 'all', label: 'All Messages' },
                { value: 'mentions', label: 'Mentions Only' },
                { value: 'none', label: 'None' },
              ]}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Ephemeral Messages" description="Self-destructing message settings">
          <SettingsRow
            label="Default Ephemeral"
            description="Make new messages ephemeral by default"
          >
            <Toggle
              checked={messages.ephemeral_default}
              onChange={(v) => onChange('ephemeral_default', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Showroom Tab -----

interface ShowroomTabProps {
  showroom: ShowroomSettings;
  onChange: (key: keyof ShowroomSettings, value: ShowroomSettings[keyof ShowroomSettings]) => void;
}

export function ShowroomTab({ showroom, onChange }: ShowroomTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Showroom Settings</CardTitle>
        <CardDescription>
          Configure showroom visit tracking and workflow preferences.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Timers" description="Configure visit timing settings">
          <SettingsRow
            label="Auto-start Timer"
            description="Automatically start timer when customer checks in"
          >
            <Toggle
              checked={showroom.auto_start_timer}
              onChange={(v) => onChange('auto_start_timer', v)}
            />
          </SettingsRow>
          <SettingsRow label="Default Timer Type" description="Default timer type for new visits">
            <Select
              value={showroom.default_timer_type}
              onChange={(v) => onChange('default_timer_type', v)}
              options={[
                { value: 'WAIT_TIME', label: 'Wait Time' },
                { value: 'SERVICE_TIME', label: 'Service Time' },
                { value: 'TOTAL_TIME', label: 'Total Time' },
              ]}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection
          title="Wait Time Alerts"
          description="Configure wait time warning thresholds"
        >
          <SettingsRow
            label="Warning Threshold"
            description="Minutes before showing warning status"
          >
            <Select
              value={String(showroom.wait_time_warning_minutes)}
              onChange={(v) => onChange('wait_time_warning_minutes', parseInt(v))}
              options={[5, 10, 15, 20, 30].map((m) => ({
                value: String(m),
                label: `${m} minutes`,
              }))}
            />
          </SettingsRow>
          <SettingsRow
            label="Critical Threshold"
            description="Minutes before showing critical status"
          >
            <Select
              value={String(showroom.wait_time_critical_minutes)}
              onChange={(v) => onChange('wait_time_critical_minutes', parseInt(v))}
              options={[15, 20, 30, 45, 60].map((m) => ({
                value: String(m),
                label: `${m} minutes`,
              }))}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Workflow" description="Configure workflow behavior">
          <SettingsRow label="Auto-advance Stages" description="Automatically move to next stage">
            <Toggle
              checked={showroom.auto_advance_stages}
              onChange={(v) => onChange('auto_advance_stages', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Require Salesperson"
            description="Require salesperson assignment before proceeding"
          >
            <Toggle
              checked={showroom.require_salesperson_assignment}
              onChange={(v) => onChange('require_salesperson_assignment', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Require Vehicle"
            description="Require vehicle of interest to be selected"
          >
            <Toggle
              checked={showroom.require_vehicle_assignment}
              onChange={(v) => onChange('require_vehicle_assignment', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Show Customer History"
            description="Display customer's previous visits and purchases"
          >
            <Toggle
              checked={showroom.show_customer_history}
              onChange={(v) => onChange('show_customer_history', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Notifications" description="Configure showroom alerts">
          <SettingsRow label="Check-in Sound" description="Play sound when customer checks in">
            <Toggle
              checked={showroom.play_sound_on_check_in}
              onChange={(v) => onChange('play_sound_on_check_in', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Dashboard Tab -----

interface DashboardTabProps {
  dashboard: DashboardSettings;
  onChange: (
    key: keyof DashboardSettings,
    value: DashboardSettings[keyof DashboardSettings]
  ) => void;
}

export function DashboardTab({ dashboard, onChange }: DashboardTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Settings</CardTitle>
        <CardDescription>Customize your dashboard layout and data display.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Layout" description="Configure dashboard layout">
          <SettingsRow label="Layout Style" description="Choose your preferred layout">
            <Select
              value={dashboard.layout}
              onChange={(v) => onChange('layout', v as DashboardSettings['layout'])}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'compact', label: 'Compact' },
                { value: 'detailed', label: 'Detailed' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Default Date Range" description="Default time period for metrics">
            <Select
              value={dashboard.default_date_range}
              onChange={(v) =>
                onChange('default_date_range', v as DashboardSettings['default_date_range'])
              }
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'quarter', label: 'This Quarter' },
                { value: 'year', label: 'This Year' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Chart Type" description="Default chart visualization">
            <Select
              value={dashboard.chart_type}
              onChange={(v) => onChange('chart_type', v as DashboardSettings['chart_type'])}
              options={[
                { value: 'line', label: 'Line' },
                { value: 'bar', label: 'Bar' },
                { value: 'area', label: 'Area' },
              ]}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Data" description="Configure data display options">
          <SettingsRow label="Auto-refresh" description="Automatically refresh dashboard data">
            <Toggle
              checked={dashboard.auto_refresh}
              onChange={(v) => onChange('auto_refresh', v)}
            />
          </SettingsRow>
          <SettingsRow label="Show Goals" description="Display sales goals and targets">
            <Toggle checked={dashboard.show_goals} onChange={(v) => onChange('show_goals', v)} />
          </SettingsRow>
          <SettingsRow label="Show Leaderboard" description="Display team performance rankings">
            <Toggle
              checked={dashboard.show_leaderboard}
              onChange={(v) => onChange('show_leaderboard', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Compare Previous Period"
            description="Show comparison to previous period"
          >
            <Toggle
              checked={dashboard.compare_previous_period}
              onChange={(v) => onChange('compare_previous_period', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Deals Tab -----

interface DealsTabProps {
  deals: DealsSettings;
  onChange: (key: keyof DealsSettings, value: DealsSettings[keyof DealsSettings]) => void;
}

export function DealsTab({ deals, onChange }: DealsTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deals Settings</CardTitle>
        <CardDescription>Configure deal management and pipeline preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Display" description="Configure deal display options">
          <SettingsRow label="View Style" description="Default view for deals list">
            <Select
              value={deals.view_style}
              onChange={(v) => onChange('view_style', v as DealsSettings['view_style'])}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Pipeline View" description="Default pipeline visualization">
            <Select
              value={deals.pipeline_view}
              onChange={(v) => onChange('pipeline_view', v as DealsSettings['pipeline_view'])}
              options={[
                { value: 'kanban', label: 'Kanban Board' },
                { value: 'list', label: 'List View' },
                { value: 'table', label: 'Table View' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show Archived" description="Display archived deals">
            <Toggle checked={deals.show_archived} onChange={(v) => onChange('show_archived', v)} />
          </SettingsRow>
          <SettingsRow label="Show Profit Margin" description="Display profit calculations">
            <Toggle
              checked={deals.show_profit_margin}
              onChange={(v) => onChange('show_profit_margin', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Defaults" description="Configure default values">
          <SettingsRow label="Default Deal Type" description="Default type for new deals">
            <Select
              value={deals.default_deal_type}
              onChange={(v) =>
                onChange('default_deal_type', v as DealsSettings['default_deal_type'])
              }
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'finance', label: 'Finance' },
                { value: 'lease', label: 'Lease' },
              ]}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Automation" description="Configure deal automation">
          <SettingsRow label="Auto-assign Deals" description="Automatically assign new deals">
            <Toggle checked={deals.auto_assign} onChange={(v) => onChange('auto_assign', v)} />
          </SettingsRow>
          <SettingsRow label="Round Robin" description="Distribute deals evenly among team">
            <Toggle
              checked={deals.auto_assign_round_robin}
              onChange={(v) => onChange('auto_assign_round_robin', v)}
              disabled={!deals.auto_assign}
            />
          </SettingsRow>
          <SettingsRow label="Deal Scoring" description="Enable AI-powered deal scoring">
            <Toggle
              checked={deals.enable_deal_scoring}
              onChange={(v) => onChange('enable_deal_scoring', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Customers Tab -----

interface CustomersTabProps {
  customers: CustomersSettings;
  onChange: (
    key: keyof CustomersSettings,
    value: CustomersSettings[keyof CustomersSettings]
  ) => void;
}

export function CustomersTab({ customers, onChange }: CustomersTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers Settings</CardTitle>
        <CardDescription>Configure customer management preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Display" description="Configure customer display options">
          <SettingsRow label="View Style" description="Default view for customer list">
            <Select
              value={customers.view_style}
              onChange={(v) => onChange('view_style', v as CustomersSettings['view_style'])}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show Inactive" description="Display inactive customers">
            <Toggle
              checked={customers.show_inactive}
              onChange={(v) => onChange('show_inactive', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Data Quality" description="Configure data validation">
          <SettingsRow
            label="Duplicate Detection"
            description="Warn about potential duplicate customers"
          >
            <Toggle
              checked={customers.duplicate_detection}
              onChange={(v) => onChange('duplicate_detection', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Auto-merge Duplicates"
            description="Automatically merge detected duplicates"
          >
            <Toggle
              checked={customers.auto_merge_duplicates}
              onChange={(v) => onChange('auto_merge_duplicates', v)}
              disabled={!customers.duplicate_detection}
            />
          </SettingsRow>
          <SettingsRow label="Require Email" description="Make email required for new customers">
            <Toggle
              checked={customers.require_email}
              onChange={(v) => onChange('require_email', v)}
            />
          </SettingsRow>
          <SettingsRow label="Require Phone" description="Make phone required for new customers">
            <Toggle
              checked={customers.require_phone}
              onChange={(v) => onChange('require_phone', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Reminders" description="Configure customer reminders">
          <SettingsRow label="Follow-up Reminder" description="Days before follow-up reminder">
            <Select
              value={String(customers.follow_up_reminder_days)}
              onChange={(v) => onChange('follow_up_reminder_days', parseInt(v))}
              options={[3, 5, 7, 14, 30].map((d) => ({ value: String(d), label: `${d} days` }))}
            />
          </SettingsRow>
          <SettingsRow label="Birthday Reminder" description="Days before birthday reminder">
            <Select
              value={String(customers.birthday_reminder_days)}
              onChange={(v) => onChange('birthday_reminder_days', parseInt(v))}
              options={[1, 3, 5, 7].map((d) => ({ value: String(d), label: `${d} days` }))}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="AI Features" description="Configure AI-powered features">
          <SettingsRow label="Customer Scoring" description="Enable AI-powered customer scoring">
            <Toggle
              checked={customers.enable_customer_scoring}
              onChange={(v) => onChange('enable_customer_scoring', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Inventory Tab -----

interface InventoryTabProps {
  inventory: InventorySettings;
  onChange: (
    key: keyof InventorySettings,
    value: InventorySettings[keyof InventorySettings]
  ) => void;
}

export function InventoryTab({ inventory, onChange }: InventoryTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Settings</CardTitle>
        <CardDescription>Configure inventory management preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Display" description="Configure inventory display options">
          <SettingsRow label="View Style" description="Default view for inventory">
            <Select
              value={inventory.view_style}
              onChange={(v) => onChange('view_style', v as InventorySettings['view_style'])}
              options={[
                { value: 'grid', label: 'Grid' },
                { value: 'list', label: 'List' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show Sold" description="Display sold vehicles">
            <Toggle checked={inventory.show_sold} onChange={(v) => onChange('show_sold', v)} />
          </SettingsRow>
          <SettingsRow label="Show Hold" description="Display vehicles on hold">
            <Toggle checked={inventory.show_hold} onChange={(v) => onChange('show_hold', v)} />
          </SettingsRow>
          <SettingsRow label="Show Cost" description="Display vehicle cost">
            <Toggle checked={inventory.show_cost} onChange={(v) => onChange('show_cost', v)} />
          </SettingsRow>
          <SettingsRow label="Show Profit" description="Display profit margins">
            <Toggle checked={inventory.show_profit} onChange={(v) => onChange('show_profit', v)} />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Alerts" description="Configure inventory alerts">
          <SettingsRow
            label="Low Stock Threshold"
            description="Number of vehicles before low stock warning"
          >
            <Select
              value={String(inventory.low_stock_threshold)}
              onChange={(v) => onChange('low_stock_threshold', parseInt(v))}
              options={[5, 10, 15, 20, 25].map((n) => ({
                value: String(n),
                label: `${n} vehicles`,
              }))}
            />
          </SettingsRow>
          <SettingsRow label="Days in Stock Warning" description="Days before aging warning">
            <Select
              value={String(inventory.days_in_stock_warning)}
              onChange={(v) => onChange('days_in_stock_warning', parseInt(v))}
              options={[30, 45, 60, 90, 120].map((d) => ({ value: String(d), label: `${d} days` }))}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Photos" description="Configure photo requirements">
          <SettingsRow label="Photo Required" description="Require photos for new listings">
            <Toggle
              checked={inventory.photo_required}
              onChange={(v) => onChange('photo_required', v)}
            />
          </SettingsRow>
          <SettingsRow label="Minimum Photos" description="Minimum number of photos required">
            <Select
              value={String(inventory.min_photos)}
              onChange={(v) => onChange('min_photos', parseInt(v))}
              options={[1, 3, 5, 8, 10].map((n) => ({ value: String(n), label: `${n} photos` }))}
              disabled={!inventory.photo_required}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Automation" description="Configure inventory automation">
          <SettingsRow
            label="VIN Decode"
            description="Automatically decode VIN for vehicle details"
          >
            <Toggle
              checked={inventory.enable_vin_decode}
              onChange={(v) => onChange('enable_vin_decode', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Auto Price Adjustment"
            description="Automatically reduce price for aging inventory"
          >
            <Toggle
              checked={inventory.auto_price_adjustment}
              onChange={(v) => onChange('auto_price_adjustment', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Profile Tab -----

interface ProfileTabProps {
  user: AuthUser | null;
  profileData: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    title: string;
  };
  onProfileChange: (data: ProfileTabProps['profileData']) => void;
  onSave: () => void;
  isSaving: boolean;
  saveSuccess: boolean;
}

export function ProfileTab({
  user,
  profileData,
  onProfileChange,
  onSave,
  isSaving,
  saveSuccess,
}: ProfileTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and contact details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
            {user ? getInitials(getFullName(user.first_name, user.last_name)) : 'U'}
          </div>
          <div>
            <Button variant="outline" size="sm">
              Change Photo
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">First Name</label>
            <input
              type="text"
              value={profileData.first_name}
              onChange={(e) => onProfileChange({ ...profileData, first_name: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Last Name</label>
            <input
              type="text"
              value={profileData.last_name}
              onChange={(e) => onProfileChange({ ...profileData, last_name: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => onProfileChange({ ...profileData, email: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Phone</label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => onProfileChange({ ...profileData, phone: e.target.value })}
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Job Title</label>
            <input
              type="text"
              value={profileData.title}
              onChange={(e) => onProfileChange({ ...profileData, title: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button onClick={onSave} loading={isSaving}>
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
  );
}

// ----- Privacy Tab -----

interface PrivacyTabProps {
  privacy: PrivacySettings;
  onChange: (key: keyof PrivacySettings, value: PrivacySettings[keyof PrivacySettings]) => void;
}

export function PrivacyTab({ privacy, onChange }: PrivacyTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy Settings</CardTitle>
        <CardDescription>Control your privacy and data sharing preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Visibility" description="Control who can see your information">
          <SettingsRow label="Profile Visibility" description="Who can see your profile">
            <Select
              value={privacy.profile_visibility}
              onChange={(v) =>
                onChange('profile_visibility', v as PrivacySettings['profile_visibility'])
              }
              options={[
                { value: 'public', label: 'Public' },
                { value: 'team', label: 'Team Only' },
                { value: 'private', label: 'Private' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show Online Status" description="Let others see when you're online">
            <Toggle
              checked={privacy.show_online_status}
              onChange={(v) => onChange('show_online_status', v)}
            />
          </SettingsRow>
          <SettingsRow label="Show Last Active" description="Display when you were last active">
            <Toggle
              checked={privacy.show_last_active}
              onChange={(v) => onChange('show_last_active', v)}
            />
          </SettingsRow>
          <SettingsRow
            label="Allow Message Requests"
            description="Receive messages from non-contacts"
          >
            <Toggle
              checked={privacy.allow_message_requests}
              onChange={(v) => onChange('allow_message_requests', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Data Sharing" description="Control how your data is used">
          <SettingsRow
            label="Analytics"
            description="Help improve the product with anonymous usage data"
          >
            <Toggle
              checked={privacy.data_sharing_analytics}
              onChange={(v) => onChange('data_sharing_analytics', v)}
            />
          </SettingsRow>
          <SettingsRow label="Marketing" description="Receive personalized recommendations">
            <Toggle
              checked={privacy.data_sharing_marketing}
              onChange={(v) => onChange('data_sharing_marketing', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Security Tab -----

interface SecurityTabProps {
  security: SecuritySettings;
  onChange: (key: keyof SecuritySettings, value: SecuritySettings[keyof SecuritySettings]) => void;
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  onPasswordChange: (data: SecurityTabProps['passwordData']) => void;
  onChangePassword: () => void;
  isChangingPassword: boolean;
  passwordSaveSuccess: boolean;
}

export function SecurityTab({
  security,
  onChange,
  passwordData,
  onPasswordChange,
  onChangePassword,
  isChangingPassword,
  passwordSaveSuccess,
}: SecurityTabProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and security preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <SettingsSection title="Password" description="Change your account password">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground">Current Password</label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  onPasswordChange({ ...passwordData, currentPassword: e.target.value })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => onPasswordChange({ ...passwordData, newPassword: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  onPasswordChange({ ...passwordData, confirmPassword: e.target.value })
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="pt-4">
            <Button
              onClick={onChangePassword}
              loading={isChangingPassword}
              disabled={
                !passwordData.currentPassword ||
                !passwordData.newPassword ||
                !passwordData.confirmPassword
              }
            >
              {passwordSaveSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Password Updated!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Two-Factor Authentication"
          description="Add extra security to your account"
        >
          <SettingsRow label="Enable 2FA" description="Require a code when signing in">
            <Toggle
              checked={security.two_factor_enabled}
              onChange={(v) => onChange('two_factor_enabled', v)}
            />
          </SettingsRow>
          {security.two_factor_enabled && (
            <SettingsRow label="2FA Method" description="How you receive verification codes">
              <Select
                value={security.two_factor_method}
                onChange={(v) =>
                  onChange('two_factor_method', v as SecuritySettings['two_factor_method'])
                }
                options={[
                  { value: 'app', label: 'Authenticator App' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'email', label: 'Email' },
                ]}
              />
            </SettingsRow>
          )}
        </SettingsSection>

        <SettingsSection title="Session" description="Configure session behavior">
          <SettingsRow label="Session Timeout" description="Auto-logout after inactivity">
            <Select
              value={String(security.session_timeout_minutes)}
              onChange={(v) => onChange('session_timeout_minutes', parseInt(v))}
              options={[
                { value: '30', label: '30 minutes' },
                { value: '60', label: '1 hour' },
                { value: '240', label: '4 hours' },
                { value: '480', label: '8 hours' },
                { value: '1440', label: '24 hours' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Login Notifications" description="Get notified of new sign-ins">
            <Toggle
              checked={security.login_notification}
              onChange={(v) => onChange('login_notification', v)}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="API Access" description="Manage API access">
          <SettingsRow label="Enable API Keys" description="Allow API access to your account">
            <Toggle
              checked={security.api_keys_enabled}
              onChange={(v) => onChange('api_keys_enabled', v)}
            />
          </SettingsRow>
        </SettingsSection>
      </CardContent>
    </Card>
  );
}

// ----- Notifications Tab -----

export function NotificationsTab(): JSX.Element {
  const notificationItems = [
    { id: 'new_leads', label: 'New Leads', description: 'Get notified when new leads come in' },
    { id: 'deal_updates', label: 'Deal Updates', description: 'Updates on your active deals' },
    {
      id: 'inventory',
      label: 'Inventory Alerts',
      description: 'Low stock and new arrival notifications',
    },
    { id: 'team', label: 'Team Activity', description: 'Updates from your team members' },
    {
      id: 'reports',
      label: 'Daily Reports',
      description: 'Daily summary of dealership performance',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about important events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notificationItems.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
                <span className="text-sm text-muted-foreground">Email</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input" />
                <span className="text-sm text-muted-foreground">Push</span>
              </label>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ----- Localization Tab -----

export function LocalizationTab(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Language & Region</CardTitle>
        <CardDescription>Configure language, timezone, and regional formats.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Localization settings coming soon.</p>
          <p className="text-sm">Configure language, timezone, and date/time formats.</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Settings Content Component
// ============================================================================

interface SettingsContentProps {
  activeTab: string;
  settings: {
    appearance: AppearanceSettings;
    messages: MessagesSettings;
    showroom: ShowroomSettings;
    dashboard: DashboardSettings;
    deals: DealsSettings;
    customers: CustomersSettings;
    inventory: InventorySettings;
    privacy: PrivacySettings;
    security: SecuritySettings;
  };
  handlers: {
    appearance: (
      key: keyof AppearanceSettings,
      value: AppearanceSettings[keyof AppearanceSettings]
    ) => void;
    messages: (
      key: keyof MessagesSettings,
      value: MessagesSettings[keyof MessagesSettings]
    ) => void;
    showroom: (
      key: keyof ShowroomSettings,
      value: ShowroomSettings[keyof ShowroomSettings]
    ) => void;
    dashboard: (
      key: keyof DashboardSettings,
      value: DashboardSettings[keyof DashboardSettings]
    ) => void;
    deals: (key: keyof DealsSettings, value: DealsSettings[keyof DealsSettings]) => void;
    customers: (
      key: keyof CustomersSettings,
      value: CustomersSettings[keyof CustomersSettings]
    ) => void;
    inventory: (
      key: keyof InventorySettings,
      value: InventorySettings[keyof InventorySettings]
    ) => void;
    privacy: (key: keyof PrivacySettings, value: PrivacySettings[keyof PrivacySettings]) => void;
    security: (
      key: keyof SecuritySettings,
      value: SecuritySettings[keyof SecuritySettings]
    ) => void;
  };
  profileProps: {
    user: AuthUser | null;
    profileData: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      title: string;
    };
    setProfileData: (data: ProfileTabProps['profileData']) => void;
    handleSave: () => void;
    isSaving: boolean;
    saveSuccess: boolean;
  };
  passwordProps: {
    passwordData: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    };
    setPasswordData: (data: SecurityTabProps['passwordData']) => void;
    handleChangePassword: () => void;
    isChanging: boolean;
    saveSuccess: boolean;
  };
}

export function SettingsContent({
  activeTab,
  settings,
  handlers,
  profileProps,
  passwordProps,
}: SettingsContentProps): JSX.Element | null {
  const tabComponents: Record<string, JSX.Element> = {
    appearance: <AppearanceTab appearance={settings.appearance} onChange={handlers.appearance} />,
    messages: <MessagesTab messages={settings.messages} onChange={handlers.messages} />,
    showroom: <ShowroomTab showroom={settings.showroom} onChange={handlers.showroom} />,
    dashboard: <DashboardTab dashboard={settings.dashboard} onChange={handlers.dashboard} />,
    deals: <DealsTab deals={settings.deals} onChange={handlers.deals} />,
    customers: <CustomersTab customers={settings.customers} onChange={handlers.customers} />,
    inventory: <InventoryTab inventory={settings.inventory} onChange={handlers.inventory} />,
    profile: (
      <ProfileTab
        user={profileProps.user}
        profileData={profileProps.profileData}
        onProfileChange={profileProps.setProfileData}
        onSave={profileProps.handleSave}
        isSaving={profileProps.isSaving}
        saveSuccess={profileProps.saveSuccess}
      />
    ),
    privacy: <PrivacyTab privacy={settings.privacy} onChange={handlers.privacy} />,
    security: (
      <SecurityTab
        security={settings.security}
        onChange={handlers.security}
        passwordData={passwordProps.passwordData}
        onPasswordChange={passwordProps.setPasswordData}
        onChangePassword={passwordProps.handleChangePassword}
        isChangingPassword={passwordProps.isChanging}
        passwordSaveSuccess={passwordProps.saveSuccess}
      />
    ),
    notifications: <NotificationsTab />,
    localization: <LocalizationTab />,
  };

  return tabComponents[activeTab] || null;
}
