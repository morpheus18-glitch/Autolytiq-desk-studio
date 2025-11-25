package main

import (
	"encoding/json"
	"time"
)

// SettingsScope defines who the settings apply to
type SettingsScope string

const (
	ScopeUser       SettingsScope = "USER"
	ScopeDealership SettingsScope = "DEALERSHIP"
	ScopeSystem     SettingsScope = "SYSTEM"
)

// UserSettings represents complete user settings
type UserSettings struct {
	ID           string           `json:"id"`
	UserID       string           `json:"user_id"`
	DealershipID string           `json:"dealership_id"`
	Appearance   AppearanceSettings   `json:"appearance"`
	Localization LocalizationSettings `json:"localization"`
	Notifications NotificationSettings `json:"notifications"`
	Dashboard    DashboardSettings    `json:"dashboard"`
	Deals        DealsSettings        `json:"deals"`
	Customers    CustomersSettings    `json:"customers"`
	Inventory    InventorySettings    `json:"inventory"`
	Showroom     ShowroomSettings     `json:"showroom"`
	Messages     MessagesSettings     `json:"messages"`
	Privacy      PrivacySettings      `json:"privacy"`
	Security     SecuritySettings     `json:"security"`
	CreatedAt    time.Time            `json:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at"`
}

// AppearanceSettings for UI customization
type AppearanceSettings struct {
	Theme             string `json:"theme"`
	Density           string `json:"density"`
	SidebarPosition   string `json:"sidebar_position"`
	SidebarCollapsed  bool   `json:"sidebar_collapsed"`
	PrimaryColor      string `json:"primary_color"`
	AccentColor       string `json:"accent_color"`
	FontSize          string `json:"font_size"`
	AnimationsEnabled bool   `json:"animations_enabled"`
	ReduceMotion      bool   `json:"reduce_motion"`
	HighContrast      bool   `json:"high_contrast"`
}

// LocalizationSettings for regional preferences
type LocalizationSettings struct {
	Language        string `json:"language"`
	Timezone        string `json:"timezone"`
	DateFormat      string `json:"date_format"`
	TimeFormat      string `json:"time_format"`
	Currency        string `json:"currency"`
	CurrencyDisplay string `json:"currency_display"`
	NumberFormat    string `json:"number_format"`
	FirstDayOfWeek  int    `json:"first_day_of_week"`
}

// NotificationChannel defines notification methods
type NotificationChannel struct {
	Email bool `json:"email"`
	Push  bool `json:"push"`
	SMS   bool `json:"sms"`
	InApp bool `json:"in_app"`
}

// NotificationSettings for all notification preferences
type NotificationSettings struct {
	Enabled          bool `json:"enabled"`
	QuietHoursEnabled bool `json:"quiet_hours_enabled"`
	QuietHoursStart  string `json:"quiet_hours_start"`
	QuietHoursEnd    string `json:"quiet_hours_end"`
	SoundEnabled     bool `json:"sound_enabled"`
	VibrationEnabled bool `json:"vibration_enabled"`

	Deals     json.RawMessage `json:"deals"`
	Customers json.RawMessage `json:"customers"`
	Inventory json.RawMessage `json:"inventory"`
	Showroom  json.RawMessage `json:"showroom"`
	Messages  json.RawMessage `json:"messages"`
	Reports   json.RawMessage `json:"reports"`
}

// DashboardSettings for dashboard customization
type DashboardSettings struct {
	Layout                string   `json:"layout"`
	WidgetsEnabled        []string `json:"widgets_enabled"`
	WidgetsOrder          []string `json:"widgets_order"`
	DefaultDateRange      string   `json:"default_date_range"`
	AutoRefresh           bool     `json:"auto_refresh"`
	RefreshInterval       int      `json:"refresh_interval"`
	ShowGoals             bool     `json:"show_goals"`
	ShowLeaderboard       bool     `json:"show_leaderboard"`
	ChartType             string   `json:"chart_type"`
	ComparePreviousPeriod bool     `json:"compare_previous_period"`
}

// DealsSettings for deals module
type DealsSettings struct {
	ViewStyle            string   `json:"view_style"`
	DefaultSort          string   `json:"default_sort"`
	SortDirection        string   `json:"sort_direction"`
	ShowArchived         bool     `json:"show_archived"`
	ColumnsVisible       []string `json:"columns_visible"`
	PipelineView         string   `json:"pipeline_view"`
	AutoAssign           bool     `json:"auto_assign"`
	AutoAssignRoundRobin bool     `json:"auto_assign_round_robin"`
	RequireApprovalAbove float64  `json:"require_approval_above"`
	DefaultDealType      string   `json:"default_deal_type"`
	ShowProfitMargin     bool     `json:"show_profit_margin"`
	EnableDealScoring    bool     `json:"enable_deal_scoring"`
}

// CustomersSettings for customers module
type CustomersSettings struct {
	ViewStyle            string   `json:"view_style"`
	DefaultSort          string   `json:"default_sort"`
	SortDirection        string   `json:"sort_direction"`
	ColumnsVisible       []string `json:"columns_visible"`
	ShowInactive         bool     `json:"show_inactive"`
	DuplicateDetection   bool     `json:"duplicate_detection"`
	AutoMergeDuplicates  bool     `json:"auto_merge_duplicates"`
	RequireEmail         bool     `json:"require_email"`
	RequirePhone         bool     `json:"require_phone"`
	EnableCustomerScoring bool    `json:"enable_customer_scoring"`
	FollowUpReminderDays int      `json:"follow_up_reminder_days"`
	BirthdayReminderDays int      `json:"birthday_reminder_days"`
}

// InventorySettings for inventory module
type InventorySettings struct {
	ViewStyle              string   `json:"view_style"`
	DefaultSort            string   `json:"default_sort"`
	SortDirection          string   `json:"sort_direction"`
	ColumnsVisible         []string `json:"columns_visible"`
	ShowSold               bool     `json:"show_sold"`
	ShowHold               bool     `json:"show_hold"`
	LowStockThreshold      int      `json:"low_stock_threshold"`
	DaysInStockWarning     int      `json:"days_in_stock_warning"`
	AutoPriceAdjustment    bool     `json:"auto_price_adjustment"`
	PriceAdjustmentDays    int      `json:"price_adjustment_days"`
	PriceAdjustmentPercent float64  `json:"price_adjustment_percent"`
	PhotoRequired          bool     `json:"photo_required"`
	MinPhotos              int      `json:"min_photos"`
	EnableVINDecode        bool     `json:"enable_vin_decode"`
	ShowCost               bool     `json:"show_cost"`
	ShowProfit             bool     `json:"show_profit"`
}

// WorkflowStage for showroom stages
type WorkflowStage struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Color   string `json:"color"`
	Enabled bool   `json:"enabled"`
	Order   int    `json:"order"`
}

// AutoTrigger for showroom automation
type AutoTrigger struct {
	Stage   string `json:"stage"`
	Minutes int    `json:"minutes"`
	Action  string `json:"action"`
}

// ShowroomSettings for showroom module
type ShowroomSettings struct {
	AutoStartTimer              bool            `json:"auto_start_timer"`
	DefaultTimerType            string          `json:"default_timer_type"`
	WaitTimeWarningMinutes      int             `json:"wait_time_warning_minutes"`
	WaitTimeCriticalMinutes     int             `json:"wait_time_critical_minutes"`
	AutoAdvanceStages           bool            `json:"auto_advance_stages"`
	RequireSalespersonAssignment bool           `json:"require_salesperson_assignment"`
	RequireVehicleAssignment    bool            `json:"require_vehicle_assignment"`
	ShowCustomerHistory         bool            `json:"show_customer_history"`
	PlaySoundOnCheckIn          bool            `json:"play_sound_on_check_in"`
	CheckInSound                string          `json:"check_in_sound"`
	WorkflowStages              []WorkflowStage `json:"workflow_stages"`
	AutoTriggers                []AutoTrigger   `json:"auto_triggers"`
}

// MessagesSettings for messaging module
type MessagesSettings struct {
	ScreenshotProtection bool   `json:"screenshot_protection"`
	ReadReceipts         bool   `json:"read_receipts"`
	TypingIndicators     bool   `json:"typing_indicators"`
	EnterToSend          bool   `json:"enter_to_send"`
	SoundOnMessage       bool   `json:"sound_on_message"`
	MessageSound         string `json:"message_sound"`
	ShowTimestamps       string `json:"show_timestamps"`
	MessagePreviewLength int    `json:"message_preview_length"`
	AutoDownloadMedia    bool   `json:"auto_download_media"`
	MaxMediaSizeMB       int    `json:"max_media_size_mb"`
	EmojiStyle           string `json:"emoji_style"`
	LinkPreview          bool   `json:"link_preview"`
	EphemeralDefault     bool   `json:"ephemeral_default"`
	EphemeralDuration    int    `json:"ephemeral_duration"`
	BubbleStyle          string `json:"bubble_style"`
	GroupNotifications   string `json:"group_notifications"`
}

// PrivacySettings for privacy preferences
type PrivacySettings struct {
	ProfileVisibility     string `json:"profile_visibility"`
	ShowOnlineStatus      bool   `json:"show_online_status"`
	ShowLastActive        bool   `json:"show_last_active"`
	AllowMessageRequests  bool   `json:"allow_message_requests"`
	DataSharingAnalytics  bool   `json:"data_sharing_analytics"`
	DataSharingMarketing  bool   `json:"data_sharing_marketing"`
}

// SecuritySettings for security preferences
type SecuritySettings struct {
	TwoFactorEnabled          bool     `json:"two_factor_enabled"`
	TwoFactorMethod           string   `json:"two_factor_method"`
	SessionTimeoutMinutes     int      `json:"session_timeout_minutes"`
	RequirePasswordChangeDays int      `json:"require_password_change_days"`
	LoginNotification         bool     `json:"login_notification"`
	TrustedDevices            []string `json:"trusted_devices"`
	APIKeysEnabled            bool     `json:"api_keys_enabled"`
}

// UpdateSettingsRequest for partial updates
type UpdateSettingsRequest struct {
	Section  string          `json:"section"`
	Settings json.RawMessage `json:"settings"`
}

// DealershipSettings for admin-level settings
type DealershipSettings struct {
	ID           string          `json:"id"`
	DealershipID string          `json:"dealership_id"`
	Branding     json.RawMessage `json:"branding"`
	BusinessHours json.RawMessage `json:"business_hours"`
	Features     json.RawMessage `json:"features"`
	Defaults     json.RawMessage `json:"defaults"`
	Integrations json.RawMessage `json:"integrations"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

// DefaultAppearanceSettings returns default appearance settings
func DefaultAppearanceSettings() AppearanceSettings {
	return AppearanceSettings{
		Theme:             "system",
		Density:           "comfortable",
		SidebarPosition:   "left",
		SidebarCollapsed:  false,
		PrimaryColor:      "#2563EB",
		AccentColor:       "#F59E0B",
		FontSize:          "medium",
		AnimationsEnabled: true,
		ReduceMotion:      false,
		HighContrast:      false,
	}
}

// DefaultLocalizationSettings returns default localization settings
func DefaultLocalizationSettings() LocalizationSettings {
	return LocalizationSettings{
		Language:        "en",
		Timezone:        "America/Chicago",
		DateFormat:      "MM/DD/YYYY",
		TimeFormat:      "12h",
		Currency:        "USD",
		CurrencyDisplay: "symbol",
		NumberFormat:    "en-US",
		FirstDayOfWeek:  0,
	}
}

// DefaultNotificationSettings returns default notification settings
func DefaultNotificationSettings() NotificationSettings {
	defaultChannel := `{"email":true,"push":true,"sms":false,"in_app":true}`

	return NotificationSettings{
		Enabled:          true,
		QuietHoursEnabled: false,
		QuietHoursStart:  "22:00",
		QuietHoursEnd:    "07:00",
		SoundEnabled:     true,
		VibrationEnabled: true,
		Deals:     json.RawMessage(defaultChannel),
		Customers: json.RawMessage(defaultChannel),
		Inventory: json.RawMessage(defaultChannel),
		Showroom:  json.RawMessage(defaultChannel),
		Messages:  json.RawMessage(defaultChannel),
		Reports:   json.RawMessage(defaultChannel),
	}
}

// DefaultDashboardSettings returns default dashboard settings
func DefaultDashboardSettings() DashboardSettings {
	return DashboardSettings{
		Layout:                "default",
		WidgetsEnabled:        []string{"stats", "chart", "recent-deals", "leaderboard"},
		WidgetsOrder:          []string{"stats", "chart", "recent-deals", "leaderboard"},
		DefaultDateRange:      "month",
		AutoRefresh:           true,
		RefreshInterval:       300,
		ShowGoals:             true,
		ShowLeaderboard:       true,
		ChartType:             "area",
		ComparePreviousPeriod: true,
	}
}

// DefaultDealsSettings returns default deals settings
func DefaultDealsSettings() DealsSettings {
	return DealsSettings{
		ViewStyle:            "list",
		DefaultSort:          "updated_at",
		SortDirection:        "desc",
		ShowArchived:         false,
		ColumnsVisible:       []string{"customer", "vehicle", "status", "value", "salesperson", "updated_at"},
		PipelineView:         "kanban",
		AutoAssign:           false,
		AutoAssignRoundRobin: false,
		RequireApprovalAbove: 50000,
		DefaultDealType:      "finance",
		ShowProfitMargin:     true,
		EnableDealScoring:    true,
	}
}

// DefaultCustomersSettings returns default customers settings
func DefaultCustomersSettings() CustomersSettings {
	return CustomersSettings{
		ViewStyle:            "list",
		DefaultSort:          "name",
		SortDirection:        "asc",
		ColumnsVisible:       []string{"name", "email", "phone", "source", "created_at"},
		ShowInactive:         false,
		DuplicateDetection:   true,
		AutoMergeDuplicates:  false,
		RequireEmail:         false,
		RequirePhone:         true,
		EnableCustomerScoring: true,
		FollowUpReminderDays: 7,
		BirthdayReminderDays: 3,
	}
}

// DefaultInventorySettings returns default inventory settings
func DefaultInventorySettings() InventorySettings {
	return InventorySettings{
		ViewStyle:              "grid",
		DefaultSort:            "days_in_stock",
		SortDirection:          "desc",
		ColumnsVisible:         []string{"stock", "year", "make", "model", "price", "days", "status"},
		ShowSold:               false,
		ShowHold:               true,
		LowStockThreshold:      10,
		DaysInStockWarning:     60,
		AutoPriceAdjustment:    false,
		PriceAdjustmentDays:    30,
		PriceAdjustmentPercent: 5,
		PhotoRequired:          true,
		MinPhotos:              3,
		EnableVINDecode:        true,
		ShowCost:               true,
		ShowProfit:             true,
	}
}

// DefaultShowroomSettings returns default showroom settings
func DefaultShowroomSettings() ShowroomSettings {
	return ShowroomSettings{
		AutoStartTimer:              true,
		DefaultTimerType:            "WAIT_TIME",
		WaitTimeWarningMinutes:      15,
		WaitTimeCriticalMinutes:     30,
		AutoAdvanceStages:           false,
		RequireSalespersonAssignment: false,
		RequireVehicleAssignment:    false,
		ShowCustomerHistory:         true,
		PlaySoundOnCheckIn:          true,
		CheckInSound:                "chime",
		WorkflowStages: []WorkflowStage{
			{ID: "1", Name: "CHECKED_IN", Color: "#3B82F6", Enabled: true, Order: 1},
			{ID: "2", Name: "BROWSING", Color: "#6B7280", Enabled: true, Order: 2},
			{ID: "3", Name: "TEST_DRIVE", Color: "#F59E0B", Enabled: true, Order: 3},
			{ID: "4", Name: "NEGOTIATING", Color: "#8B5CF6", Enabled: true, Order: 4},
			{ID: "5", Name: "PAPERWORK", Color: "#6366F1", Enabled: true, Order: 5},
		},
		AutoTriggers: []AutoTrigger{
			{Stage: "CHECKED_IN", Minutes: 10, Action: "notify"},
			{Stage: "BROWSING", Minutes: 30, Action: "notify"},
		},
	}
}

// DefaultMessagesSettings returns default messages settings
func DefaultMessagesSettings() MessagesSettings {
	return MessagesSettings{
		ScreenshotProtection: true,
		ReadReceipts:         true,
		TypingIndicators:     true,
		EnterToSend:          true,
		SoundOnMessage:       true,
		MessageSound:         "pop",
		ShowTimestamps:       "hover",
		MessagePreviewLength: 50,
		AutoDownloadMedia:    true,
		MaxMediaSizeMB:       25,
		EmojiStyle:           "native",
		LinkPreview:          true,
		EphemeralDefault:     false,
		EphemeralDuration:    30,
		BubbleStyle:          "modern",
		GroupNotifications:   "all",
	}
}

// DefaultPrivacySettings returns default privacy settings
func DefaultPrivacySettings() PrivacySettings {
	return PrivacySettings{
		ProfileVisibility:    "team",
		ShowOnlineStatus:     true,
		ShowLastActive:       true,
		AllowMessageRequests: true,
		DataSharingAnalytics: true,
		DataSharingMarketing: false,
	}
}

// DefaultSecuritySettings returns default security settings
func DefaultSecuritySettings() SecuritySettings {
	return SecuritySettings{
		TwoFactorEnabled:          false,
		TwoFactorMethod:           "app",
		SessionTimeoutMinutes:     480,
		RequirePasswordChangeDays: 90,
		LoginNotification:         true,
		TrustedDevices:            []string{},
		APIKeysEnabled:            false,
	}
}

// NewDefaultUserSettings creates a new UserSettings with all defaults
func NewDefaultUserSettings(userID, dealershipID string) *UserSettings {
	return &UserSettings{
		UserID:       userID,
		DealershipID: dealershipID,
		Appearance:   DefaultAppearanceSettings(),
		Localization: DefaultLocalizationSettings(),
		Notifications: DefaultNotificationSettings(),
		Dashboard:    DefaultDashboardSettings(),
		Deals:        DefaultDealsSettings(),
		Customers:    DefaultCustomersSettings(),
		Inventory:    DefaultInventorySettings(),
		Showroom:     DefaultShowroomSettings(),
		Messages:     DefaultMessagesSettings(),
		Privacy:      DefaultPrivacySettings(),
		Security:     DefaultSecuritySettings(),
	}
}
