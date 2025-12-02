/**
 * Plugin Hooks
 *
 * React Query hooks for plugin marketplace operations including
 * fetching, installing, updating, and configuring plugins.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  pluginQueryKeys,
  fetchMarketplacePlugins,
  fetchPlugin,
  fetchInstalledPlugins,
  fetchInstalledPlugin,
  installPlugin,
  uninstallPlugin,
  updatePlugin,
  enablePlugin,
  disablePlugin,
  updatePluginConfig,
} from '../lib/plugins/api';
import type {
  PluginSearchFilters,
  PluginInstallRequest,
  PluginUpdateRequest,
  InstalledPlugin,
} from '../types/plugins';

/**
 * Hook to fetch marketplace plugins with optional filters
 */
export function useMarketplacePlugins(filters?: PluginSearchFilters) {
  return useQuery({
    queryKey: pluginQueryKeys.plugins.search(filters ?? {}),
    queryFn: () => fetchMarketplacePlugins(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a specific plugin by slug
 */
export function usePlugin(slug: string) {
  return useQuery({
    queryKey: pluginQueryKeys.plugins.detail(slug),
    queryFn: () => fetchPlugin(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch installed plugins
 */
export function useInstalledPlugins() {
  return useQuery({
    queryKey: pluginQueryKeys.plugins.installed(),
    queryFn: fetchInstalledPlugins,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a specific installed plugin
 */
export function useInstalledPlugin(pluginId: string) {
  return useQuery({
    queryKey: pluginQueryKeys.plugins.config(pluginId),
    queryFn: () => fetchInstalledPlugin(pluginId),
    enabled: !!pluginId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to install a plugin
 */
export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PluginInstallRequest) => installPlugin(request),
    onSuccess: () => {
      // Invalidate installed plugins cache
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
    },
  });
}

/**
 * Hook to uninstall a plugin
 */
export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pluginId: string) => uninstallPlugin(pluginId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
    },
  });
}

/**
 * Hook to update a plugin
 */
export function useUpdatePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pluginId,
      request,
    }: {
      pluginId: string;
      request: PluginUpdateRequest;
    }) => updatePlugin(pluginId, request),
    onSuccess: (data: InstalledPlugin) => {
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
      queryClient.setQueryData(
        pluginQueryKeys.plugins.config(data.plugin_id),
        data
      );
    },
  });
}

/**
 * Hook to enable a plugin
 */
export function useEnablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pluginId: string) => enablePlugin(pluginId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
    },
  });
}

/**
 * Hook to disable a plugin
 */
export function useDisablePlugin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pluginId: string) => disablePlugin(pluginId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
    },
  });
}

/**
 * Hook to update plugin configuration
 */
export function useUpdatePluginConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      pluginId,
      config,
    }: {
      pluginId: string;
      config: Record<string, string | number | boolean>;
    }) => updatePluginConfig(pluginId, config),
    onSuccess: (data: InstalledPlugin) => {
      queryClient.invalidateQueries({
        queryKey: pluginQueryKeys.plugins.installed(),
      });
      queryClient.setQueryData(
        pluginQueryKeys.plugins.config(data.plugin_id),
        data
      );
    },
  });
}

/**
 * Hook to check if a specific plugin is installed
 */
export function useIsPluginInstalled(pluginSlug: string) {
  const { data: installedPlugins } = useInstalledPlugins();

  return {
    isInstalled:
      installedPlugins?.some((p) => p.metadata.slug === pluginSlug) ?? false,
    installedPlugin: installedPlugins?.find(
      (p) => p.metadata.slug === pluginSlug
    ),
  };
}
