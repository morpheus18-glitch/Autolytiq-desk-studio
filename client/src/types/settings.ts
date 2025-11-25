/**
 * Settings Types
 *
 * Comprehensive settings system for all modules with appearance,
 * functionality, and notification preferences.
 */

import type { BaseEntity } from './index';

/**
 * Settings Scope
 */
export type SettingsScope = 'USER' | 'DEALERSHIP' | 'SYSTEM';

/**
 * Theme Mode
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Display Density
 */
export type DisplayDensity = 'comfortable' | 'compact' | 'spacious';

/**
 * Date Format
 */
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

/**
 * Time Format
 */
export type TimeFormat = '12h' | '24h';

/**
 * Currency Display
 */
export type CurrencyDisplay = 'symbol' | 'code' | 'name';

/**
 * Sidebar Position
 */
export type SidebarPosition = 'left' | 'right';

/**
 * Card View Style
 */
export type CardViewStyle = 'grid' | 'list' | 'compact';

/**
 * Global Appearance Settings
 */
export interface AppearanceSettings {
  theme: ThemeMode;
  density: DisplayDensity;
  sidebar_position: SidebarPosition;
  sidebar_collapsed: boolean;
  primary_color: string;
  accent_color: string;
  font_size: 'small' | 'medium' | 'large';
  animations_enabled: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
}

/**
 * Localization Settings
 */
export interface LocalizationSettings {
  language: string;
  timezone: string;
  date_format: DateFormat;
  time_format: TimeFormat;
  currency: string;
  currency_display: CurrencyDisplay;
  number_format: string;
  first_day_of_week: 0 | 1 | 6; // Sunday, Monday, Saturday
}

/**
 * Notification Channel
 */
export interface NotificationChannel {
  email: boolean;
  push: boolean;
  sms: boolean;
  in_app: boolean;
}

/**
 * Notification Settings
 */
export interface NotificationSettings {
  // Global
  enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM
  quiet_hours_end: string;
  sound_enabled: boolean;
  vibration_enabled: boolean;

  // By category
  deals: NotificationChannel & {
    new_lead: boolean;
    status_change: boolean;
    assigned_to_me: boolean;
    deadline_approaching: boolean;
    deal_closed: boolean;
  };
  customers: NotificationChannel & {
    new_customer: boolean;
    customer_updated: boolean;
    birthday_reminder: boolean;
    follow_up_reminder: boolean;
  };
  inventory: NotificationChannel & {
    low_stock: boolean;
    new_arrival: boolean;
    price_change: boolean;
    vehicle_sold: boolean;
  };
  showroom: NotificationChannel & {
    customer_checked_in: boolean;
    wait_time_exceeded: boolean;
    stage_change: boolean;
    visit_closed: boolean;
  };
  messages: NotificationChannel & {
    new_message: boolean;
    mention: boolean;
    reaction: boolean;
    group_update: boolean;
  };
  reports: NotificationChannel & {
    daily_summary: boolean;
    weekly_report: boolean;
    monthly_report: boolean;
    goal_achieved: boolean;
  };
}

/**
 * Dashboard Settings
 */
export interface DashboardSettings {
  layout: 'default' | 'compact' | 'detailed';
  widgets_enabled: string[];
  widgets_order: string[];
  default_date_range: 'today' | 'week' | 'month' | 'quarter' | 'year';
  auto_refresh: boolean;
  refresh_interval: number; // seconds
  show_goals: boolean;
  show_leaderboard: boolean;
  chart_type: 'line' | 'bar' | 'area';
  compare_previous_period: boolean;
}

/**
 * Deals Settings
 */
export interface DealsSettings {
  view_style: CardViewStyle;
  default_sort: 'created_at' | 'updated_at' | 'value' | 'status';
  sort_direction: 'asc' | 'desc';
  show_archived: boolean;
  columns_visible: string[];
  pipeline_view: 'kanban' | 'list' | 'table';
  auto_assign: boolean;
  auto_assign_round_robin: boolean;
  require_approval_above: number; // Amount threshold
  default_deal_type: 'cash' | 'finance' | 'lease';
  show_profit_margin: boolean;
  enable_deal_scoring: boolean;
}

/**
 * Customers Settings
 */
export interface CustomersSettings {
  view_style: CardViewStyle;
  default_sort: 'name' | 'created_at' | 'last_contact';
  sort_direction: 'asc' | 'desc';
  columns_visible: string[];
  show_inactive: boolean;
  duplicate_detection: boolean;
  auto_merge_duplicates: boolean;
  require_email: boolean;
  require_phone: boolean;
  enable_customer_scoring: boolean;
  follow_up_reminder_days: number;
  birthday_reminder_days: number;
}

/**
 * Inventory Settings
 */
export interface InventorySettings {
  view_style: CardViewStyle;
  default_sort: 'stock_number' | 'price' | 'days_in_stock' | 'year';
  sort_direction: 'asc' | 'desc';
  columns_visible: string[];
  show_sold: boolean;
  show_hold: boolean;
  low_stock_threshold: number;
  days_in_stock_warning: number;
  auto_price_adjustment: boolean;
  price_adjustment_days: number;
  price_adjustment_percent: number;
  photo_required: boolean;
  min_photos: number;
  enable_vin_decode: boolean;
  show_cost: boolean;
  show_profit: boolean;
}

/**
 * Showroom Settings
 */
export interface ShowroomSettings {
  auto_start_timer: boolean;
  default_timer_type: string;
  wait_time_warning_minutes: number;
  wait_time_critical_minutes: number;
  auto_advance_stages: boolean;
  require_salesperson_assignment: boolean;
  require_vehicle_assignment: boolean;
  show_customer_history: boolean;
  play_sound_on_check_in: boolean;
  check_in_sound: string;
  workflow_stages: {
    id: string;
    name: string;
    color: string;
    enabled: boolean;
    order: number;
  }[];
  auto_triggers: {
    stage: string;
    minutes: number;
    action: 'notify' | 'advance';
  }[];
}

/**
 * Messages Settings
 */
export interface MessagesSettings {
  screenshot_protection: boolean;
  read_receipts: boolean;
  typing_indicators: boolean;
  enter_to_send: boolean;
  sound_on_message: boolean;
  message_sound: string;
  show_timestamps: 'always' | 'hover' | 'never';
  message_preview_length: number;
  auto_download_media: boolean;
  max_media_size_mb: number;
  emoji_style: 'native' | 'twitter' | 'google';
  link_preview: boolean;
  ephemeral_default: boolean;
  ephemeral_duration: number; // seconds
  bubble_style: 'modern' | 'classic' | 'minimal';
  group_notifications: 'all' | 'mentions' | 'none';
}

/**
 * Privacy Settings
 */
export interface PrivacySettings {
  profile_visibility: 'public' | 'team' | 'private';
  show_online_status: boolean;
  show_last_active: boolean;
  allow_message_requests: boolean;
  data_sharing_analytics: boolean;
  data_sharing_marketing: boolean;
}

/**
 * Security Settings
 */
export interface SecuritySettings {
  two_factor_enabled: boolean;
  two_factor_method: 'app' | 'sms' | 'email';
  session_timeout_minutes: number;
  require_password_change_days: number;
  login_notification: boolean;
  trusted_devices: string[];
  api_keys_enabled: boolean;
}

/**
 * Integration Settings
 */
export interface IntegrationSettings {
  crm_sync_enabled: boolean;
  crm_provider: string;
  crm_sync_interval: number;
  email_sync_enabled: boolean;
  email_provider: string;
  calendar_sync_enabled: boolean;
  calendar_provider: string;
  dms_integration_enabled: boolean;
  dms_provider: string;
  credit_bureau_enabled: boolean;
  credit_bureau_provider: string;
}

/**
 * Complete User Settings
 */
export interface UserSettings extends BaseEntity {
  user_id: string;
  dealership_id: string;
  appearance: AppearanceSettings;
  localization: LocalizationSettings;
  notifications: NotificationSettings;
  dashboard: DashboardSettings;
  deals: DealsSettings;
  customers: CustomersSettings;
  inventory: InventorySettings;
  showroom: ShowroomSettings;
  messages: MessagesSettings;
  privacy: PrivacySettings;
  security: SecuritySettings;
}

/**
 * Dealership Settings (admin-level)
 */
export interface DealershipSettings extends BaseEntity {
  dealership_id: string;
  // Branding
  branding: {
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
    custom_css: string;
  };
  // Business hours
  business_hours: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  // Features
  features: {
    showroom_enabled: boolean;
    messaging_enabled: boolean;
    reports_enabled: boolean;
    api_access_enabled: boolean;
    custom_fields_enabled: boolean;
    webhooks_enabled: boolean;
  };
  // Defaults
  defaults: {
    timezone: string;
    currency: string;
    tax_rate: number;
    doc_fee: number;
  };
  // Integrations
  integrations: IntegrationSettings;
}

/**
 * Settings Update Request
 */
export interface UpdateSettingsRequest<T> {
  section: string;
  settings: Partial<T>;
}

/**
 * Settings Response
 */
export interface SettingsResponse<T> {
  settings: T;
  updated_at: string;
}

/**
 * Default Settings Factory
 */
export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  theme: 'system',
  density: 'comfortable',
  sidebar_position: 'left',
  sidebar_collapsed: false,
  primary_color: '#2563EB',
  accent_color: '#F59E0B',
  font_size: 'medium',
  animations_enabled: true,
  reduce_motion: false,
  high_contrast: false,
};

export const DEFAULT_LOCALIZATION_SETTINGS: LocalizationSettings = {
  language: 'en',
  timezone: 'America/Chicago',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  currency: 'USD',
  currency_display: 'symbol',
  number_format: 'en-US',
  first_day_of_week: 0,
};

export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = {
  email: true,
  push: true,
  sms: false,
  in_app: true,
};

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  layout: 'default',
  widgets_enabled: ['stats', 'chart', 'recent-deals', 'leaderboard'],
  widgets_order: ['stats', 'chart', 'recent-deals', 'leaderboard'],
  default_date_range: 'month',
  auto_refresh: true,
  refresh_interval: 300,
  show_goals: true,
  show_leaderboard: true,
  chart_type: 'area',
  compare_previous_period: true,
};

export const DEFAULT_DEALS_SETTINGS: DealsSettings = {
  view_style: 'list',
  default_sort: 'updated_at',
  sort_direction: 'desc',
  show_archived: false,
  columns_visible: ['customer', 'vehicle', 'status', 'value', 'salesperson', 'updated_at'],
  pipeline_view: 'kanban',
  auto_assign: false,
  auto_assign_round_robin: false,
  require_approval_above: 50000,
  default_deal_type: 'finance',
  show_profit_margin: true,
  enable_deal_scoring: true,
};

export const DEFAULT_CUSTOMERS_SETTINGS: CustomersSettings = {
  view_style: 'list',
  default_sort: 'name',
  sort_direction: 'asc',
  columns_visible: ['name', 'email', 'phone', 'source', 'created_at'],
  show_inactive: false,
  duplicate_detection: true,
  auto_merge_duplicates: false,
  require_email: false,
  require_phone: true,
  enable_customer_scoring: true,
  follow_up_reminder_days: 7,
  birthday_reminder_days: 3,
};

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
  view_style: 'grid',
  default_sort: 'days_in_stock',
  sort_direction: 'desc',
  columns_visible: ['stock', 'year', 'make', 'model', 'price', 'days', 'status'],
  show_sold: false,
  show_hold: true,
  low_stock_threshold: 10,
  days_in_stock_warning: 60,
  auto_price_adjustment: false,
  price_adjustment_days: 30,
  price_adjustment_percent: 5,
  photo_required: true,
  min_photos: 3,
  enable_vin_decode: true,
  show_cost: true,
  show_profit: true,
};

export const DEFAULT_SHOWROOM_SETTINGS: ShowroomSettings = {
  auto_start_timer: true,
  default_timer_type: 'WAIT_TIME',
  wait_time_warning_minutes: 15,
  wait_time_critical_minutes: 30,
  auto_advance_stages: false,
  require_salesperson_assignment: false,
  require_vehicle_assignment: false,
  show_customer_history: true,
  play_sound_on_check_in: true,
  check_in_sound: 'chime',
  workflow_stages: [
    { id: '1', name: 'CHECKED_IN', color: '#3B82F6', enabled: true, order: 1 },
    { id: '2', name: 'BROWSING', color: '#6B7280', enabled: true, order: 2 },
    { id: '3', name: 'TEST_DRIVE', color: '#F59E0B', enabled: true, order: 3 },
    { id: '4', name: 'NEGOTIATING', color: '#8B5CF6', enabled: true, order: 4 },
    { id: '5', name: 'PAPERWORK', color: '#6366F1', enabled: true, order: 5 },
  ],
  auto_triggers: [
    { stage: 'CHECKED_IN', minutes: 10, action: 'notify' },
    { stage: 'BROWSING', minutes: 30, action: 'notify' },
  ],
};

export const DEFAULT_MESSAGES_SETTINGS: MessagesSettings = {
  screenshot_protection: true,
  read_receipts: true,
  typing_indicators: true,
  enter_to_send: true,
  sound_on_message: true,
  message_sound: 'pop',
  show_timestamps: 'hover',
  message_preview_length: 50,
  auto_download_media: true,
  max_media_size_mb: 25,
  emoji_style: 'native',
  link_preview: true,
  ephemeral_default: false,
  ephemeral_duration: 30,
  bubble_style: 'modern',
  group_notifications: 'all',
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profile_visibility: 'team',
  show_online_status: true,
  show_last_active: true,
  allow_message_requests: true,
  data_sharing_analytics: true,
  data_sharing_marketing: false,
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  two_factor_enabled: false,
  two_factor_method: 'app',
  session_timeout_minutes: 480,
  require_password_change_days: 90,
  login_notification: true,
  trusted_devices: [],
  api_keys_enabled: false,
};

/**
 * Settings Section Info
 */
export interface SettingsSectionInfo {
  id: string;
  label: string;
  description: string;
  icon: string;
  category: 'general' | 'modules' | 'account';
}

export const SETTINGS_SECTIONS: SettingsSectionInfo[] = [
  // General
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme, colors, and display options',
    icon: 'Palette',
    category: 'general',
  },
  {
    id: 'localization',
    label: 'Language & Region',
    description: 'Language, timezone, and formats',
    icon: 'Globe',
    category: 'general',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email, push, and alert preferences',
    icon: 'Bell',
    category: 'general',
  },

  // Modules
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Widgets, layout, and metrics',
    icon: 'LayoutDashboard',
    category: 'modules',
  },
  {
    id: 'deals',
    label: 'Deals',
    description: 'Pipeline, columns, and workflows',
    icon: 'Handshake',
    category: 'modules',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Views, fields, and reminders',
    icon: 'Users',
    category: 'modules',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    description: 'Pricing, photos, and alerts',
    icon: 'Car',
    category: 'modules',
  },
  {
    id: 'showroom',
    label: 'Showroom',
    description: 'Timers, stages, and workflows',
    icon: 'Store',
    category: 'modules',
  },
  {
    id: 'messages',
    label: 'Messages',
    description: 'Privacy, sounds, and display',
    icon: 'MessageCircle',
    category: 'modules',
  },

  // Account
  {
    id: 'profile',
    label: 'Profile',
    description: 'Personal information and photo',
    icon: 'User',
    category: 'account',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Visibility and data sharing',
    icon: 'Eye',
    category: 'account',
  },
  {
    id: 'security',
    label: 'Security',
    description: 'Password and two-factor auth',
    icon: 'Shield',
    category: 'account',
  },
];
