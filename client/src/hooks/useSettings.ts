/**
 * Settings Hooks
 *
 * React Query hooks for user and dealership settings with
 * optimistic updates and section-specific mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type {
  UserSettings,
  DealershipSettings,
  AppearanceSettings,
  LocalizationSettings,
  NotificationSettings,
  DashboardSettings,
  DealsSettings,
  CustomersSettings,
  InventorySettings,
  ShowroomSettings,
  MessagesSettings,
  PrivacySettings,
  SecuritySettings,
} from '@/types/settings';

/**
 * Hook to get user settings
 */
export function useUserSettings() {
  return useQuery({
    queryKey: queryKeys.settings.user(),
    queryFn: () => api.get<UserSettings>('/v1/settings/user'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}

/**
 * Hook to update all user settings
 */
export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<UserSettings>) =>
      api.put<UserSettings>('/v1/settings/user', settings),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.user(), data);
    },
  });
}

/**
 * Generic hook to update a specific settings section
 */
function useUpdateSettingsSection<T>(section: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<T>) =>
      api.patch<UserSettings>(`/v1/settings/user/${section}`, settings),
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.user() });

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<UserSettings>(queryKeys.settings.user());

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData(queryKeys.settings.user(), {
          ...previousSettings,
          [section]: {
            ...(previousSettings[section as keyof UserSettings] as object),
            ...newSettings,
          },
        });
      }

      return { previousSettings };
    },
    onError: (_err, _newSettings, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.settings.user(), context.previousSettings);
      }
    },
    onSettled: () => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.user() });
    },
  });
}

/**
 * Hook to update appearance settings
 */
export function useUpdateAppearanceSettings() {
  return useUpdateSettingsSection<AppearanceSettings>('appearance');
}

/**
 * Hook to update localization settings
 */
export function useUpdateLocalizationSettings() {
  return useUpdateSettingsSection<LocalizationSettings>('localization');
}

/**
 * Hook to update notification settings
 */
export function useUpdateNotificationSettings() {
  return useUpdateSettingsSection<NotificationSettings>('notifications');
}

/**
 * Hook to update dashboard settings
 */
export function useUpdateDashboardSettings() {
  return useUpdateSettingsSection<DashboardSettings>('dashboard');
}

/**
 * Hook to update deals settings
 */
export function useUpdateDealsSettings() {
  return useUpdateSettingsSection<DealsSettings>('deals');
}

/**
 * Hook to update customers settings
 */
export function useUpdateCustomersSettings() {
  return useUpdateSettingsSection<CustomersSettings>('customers');
}

/**
 * Hook to update inventory settings
 */
export function useUpdateInventorySettings() {
  return useUpdateSettingsSection<InventorySettings>('inventory');
}

/**
 * Hook to update showroom settings
 */
export function useUpdateShowroomSettings() {
  return useUpdateSettingsSection<ShowroomSettings>('showroom');
}

/**
 * Hook to update messages settings
 */
export function useUpdateMessagesSettings() {
  return useUpdateSettingsSection<MessagesSettings>('messages');
}

/**
 * Hook to update privacy settings
 */
export function useUpdatePrivacySettings() {
  return useUpdateSettingsSection<PrivacySettings>('privacy');
}

/**
 * Hook to update security settings
 */
export function useUpdateSecuritySettings() {
  return useUpdateSettingsSection<SecuritySettings>('security');
}

/**
 * Hook to delete user settings (reset to defaults)
 */
export function useDeleteUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete('/v1/settings/user'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.user() });
    },
  });
}

/**
 * Hook to get dealership settings (admin only)
 */
export function useDealershipSettings() {
  return useQuery({
    queryKey: queryKeys.settings.dealership(),
    queryFn: () => api.get<DealershipSettings>('/v1/settings/dealership'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update dealership settings (admin only)
 */
export function useUpdateDealershipSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: Partial<DealershipSettings>) =>
      api.put<DealershipSettings>('/v1/settings/dealership', settings),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.settings.dealership(), data);
    },
  });
}

/**
 * Convenience hook that returns settings with section-specific update functions
 */
export function useSettings() {
  const settings = useUserSettings();
  const updateAppearance = useUpdateAppearanceSettings();
  const updateLocalization = useUpdateLocalizationSettings();
  const updateNotifications = useUpdateNotificationSettings();
  const updateDashboard = useUpdateDashboardSettings();
  const updateDeals = useUpdateDealsSettings();
  const updateCustomers = useUpdateCustomersSettings();
  const updateInventory = useUpdateInventorySettings();
  const updateShowroom = useUpdateShowroomSettings();
  const updateMessages = useUpdateMessagesSettings();
  const updatePrivacy = useUpdatePrivacySettings();
  const updateSecurity = useUpdateSecuritySettings();

  return {
    settings,
    updateAppearance,
    updateLocalization,
    updateNotifications,
    updateDashboard,
    updateDeals,
    updateCustomers,
    updateInventory,
    updateShowroom,
    updateMessages,
    updatePrivacy,
    updateSecurity,
    isLoading: settings.isLoading,
    isError: settings.isError,
    isMutating:
      updateAppearance.isPending ||
      updateLocalization.isPending ||
      updateNotifications.isPending ||
      updateDashboard.isPending ||
      updateDeals.isPending ||
      updateCustomers.isPending ||
      updateInventory.isPending ||
      updateShowroom.isPending ||
      updateMessages.isPending ||
      updatePrivacy.isPending ||
      updateSecurity.isPending,
  };
}
