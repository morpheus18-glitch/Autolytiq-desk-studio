/**
 * Settings Page Hooks
 *
 * Custom hooks to manage settings page state and reduce component complexity.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@design-system';
import { useToast } from '@/components/ui';
import { useUpdateProfile, useChangePassword } from '@/hooks/useUsers';
import { useSettings } from '@/hooks/useSettings';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_MESSAGES_SETTINGS,
  DEFAULT_SHOWROOM_SETTINGS,
  DEFAULT_DASHBOARD_SETTINGS,
  DEFAULT_DEALS_SETTINGS,
  DEFAULT_CUSTOMERS_SETTINGS,
  DEFAULT_INVENTORY_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  type AppearanceSettings,
  type MessagesSettings,
  type ShowroomSettings,
  type DashboardSettings,
  type DealsSettings,
  type CustomersSettings,
  type InventorySettings,
  type PrivacySettings,
  type SecuritySettings,
} from '@/types/settings';

/**
 * Profile form state and handlers
 */
export function useProfileForm() {
  const { user } = useAuth();
  const toast = useToast();
  const updateProfile = useUpdateProfile();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: '',
    title: 'Sales Manager',
  });

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleSave = useCallback(async () => {
    try {
      await updateProfile.mutateAsync({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
      });
      setSaveSuccess(true);
      toast.success('Profile updated', 'Your profile has been updated successfully.');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error('Error', message);
    }
  }, [profileData, updateProfile, toast]);

  return {
    user,
    profileData,
    setProfileData,
    handleSave,
    isSaving: updateProfile.isPending,
    saveSuccess,
  };
}

/**
 * Password form state and handlers
 */
export function usePasswordForm() {
  const toast = useToast();
  const changePassword = useChangePassword();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validatePassword = useCallback((): string | null => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return 'New passwords do not match.';
    }
    if (passwordData.newPassword.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }, [passwordData]);

  const handleChangePassword = useCallback(async () => {
    const error = validatePassword();
    if (error) {
      toast.error('Error', error);
      return;
    }

    try {
      await changePassword.mutateAsync({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      setSaveSuccess(true);
      toast.success('Password updated', 'Your password has been changed successfully.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      toast.error('Error', message);
    }
  }, [passwordData, validatePassword, changePassword, toast]);

  return {
    passwordData,
    setPasswordData,
    handleChangePassword,
    isChanging: changePassword.isPending,
    saveSuccess,
  };
}

/**
 * Build settings defaults from user settings
 */
function buildSettingsWithDefaults(
  userSettings: ReturnType<typeof useSettings>['settings']['data']
) {
  return {
    appearance: userSettings?.appearance || DEFAULT_APPEARANCE_SETTINGS,
    messages: userSettings?.messages || DEFAULT_MESSAGES_SETTINGS,
    showroom: userSettings?.showroom || DEFAULT_SHOWROOM_SETTINGS,
    dashboard: userSettings?.dashboard || DEFAULT_DASHBOARD_SETTINGS,
    deals: userSettings?.deals || DEFAULT_DEALS_SETTINGS,
    customers: userSettings?.customers || DEFAULT_CUSTOMERS_SETTINGS,
    inventory: userSettings?.inventory || DEFAULT_INVENTORY_SETTINGS,
    privacy: userSettings?.privacy || DEFAULT_PRIVACY_SETTINGS,
    security: userSettings?.security || DEFAULT_SECURITY_SETTINGS,
  };
}

/**
 * Hook for appearance settings
 */
function useAppearanceHandler(
  updateAppearance: ReturnType<typeof useSettings>['updateAppearance'],
  setTheme: ReturnType<typeof useTheme>['setTheme']
) {
  return useCallback(
    (key: keyof AppearanceSettings, value: AppearanceSettings[keyof AppearanceSettings]) => {
      updateAppearance.mutate({ [key]: value });
      if (key === 'theme' && (value === 'light' || value === 'dark')) {
        setTheme(value);
      }
    },
    [updateAppearance, setTheme]
  );
}

/**
 * Hook for module settings handlers (messages, showroom, dashboard, deals, customers, inventory)
 */
function useModuleHandlers(settingsHook: ReturnType<typeof useSettings>) {
  const handleMessagesChange = useCallback(
    (key: keyof MessagesSettings, value: MessagesSettings[keyof MessagesSettings]) => {
      settingsHook.updateMessages.mutate({ [key]: value });
    },
    [settingsHook.updateMessages]
  );

  const handleShowroomChange = useCallback(
    (key: keyof ShowroomSettings, value: ShowroomSettings[keyof ShowroomSettings]) => {
      settingsHook.updateShowroom.mutate({ [key]: value });
    },
    [settingsHook.updateShowroom]
  );

  const handleDashboardChange = useCallback(
    (key: keyof DashboardSettings, value: DashboardSettings[keyof DashboardSettings]) => {
      settingsHook.updateDashboard.mutate({ [key]: value });
    },
    [settingsHook.updateDashboard]
  );

  const handleDealsChange = useCallback(
    (key: keyof DealsSettings, value: DealsSettings[keyof DealsSettings]) => {
      settingsHook.updateDeals.mutate({ [key]: value });
    },
    [settingsHook.updateDeals]
  );

  const handleCustomersChange = useCallback(
    (key: keyof CustomersSettings, value: CustomersSettings[keyof CustomersSettings]) => {
      settingsHook.updateCustomers.mutate({ [key]: value });
    },
    [settingsHook.updateCustomers]
  );

  const handleInventoryChange = useCallback(
    (key: keyof InventorySettings, value: InventorySettings[keyof InventorySettings]) => {
      settingsHook.updateInventory.mutate({ [key]: value });
    },
    [settingsHook.updateInventory]
  );

  return {
    messages: handleMessagesChange,
    showroom: handleShowroomChange,
    dashboard: handleDashboardChange,
    deals: handleDealsChange,
    customers: handleCustomersChange,
    inventory: handleInventoryChange,
  };
}

/**
 * Hook for account settings handlers (privacy, security)
 */
function useAccountHandlers(settingsHook: ReturnType<typeof useSettings>) {
  const handlePrivacyChange = useCallback(
    (key: keyof PrivacySettings, value: PrivacySettings[keyof PrivacySettings]) => {
      settingsHook.updatePrivacy.mutate({ [key]: value });
    },
    [settingsHook.updatePrivacy]
  );

  const handleSecurityChange = useCallback(
    (key: keyof SecuritySettings, value: SecuritySettings[keyof SecuritySettings]) => {
      settingsHook.updateSecurity.mutate({ [key]: value });
    },
    [settingsHook.updateSecurity]
  );

  return {
    privacy: handlePrivacyChange,
    security: handleSecurityChange,
  };
}

/**
 * Settings state and update handlers
 */
export function useSettingsHandlers() {
  const { setTheme } = useTheme();
  const settingsHook = useSettings();

  const userSettings = settingsHook.settings.data;

  // Sync theme with settings
  useEffect(() => {
    const theme = userSettings?.appearance?.theme;
    if (theme && theme !== 'system') {
      setTheme(theme as 'light' | 'dark');
    }
  }, [userSettings?.appearance?.theme, setTheme]);

  // Get handlers from sub-hooks
  const handleAppearanceChange = useAppearanceHandler(settingsHook.updateAppearance, setTheme);
  const moduleHandlers = useModuleHandlers(settingsHook);
  const accountHandlers = useAccountHandlers(settingsHook);

  // Build settings with defaults - memoized
  const settings = useMemo(() => buildSettingsWithDefaults(userSettings), [userSettings]);

  // Combine all handlers
  const handlers = useMemo(
    () => ({
      appearance: handleAppearanceChange,
      ...moduleHandlers,
      ...accountHandlers,
    }),
    [handleAppearanceChange, moduleHandlers, accountHandlers]
  );

  return {
    settings,
    handlers,
    isLoading: settingsHook.isLoading,
    isMutating: settingsHook.isMutating,
  };
}
