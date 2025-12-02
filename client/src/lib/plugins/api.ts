/**
 * Plugin API Client
 *
 * API functions for plugin marketplace operations including
 * listing, installing, updating, and configuring plugins.
 */

import { api, queryKeys } from '../api';
import type {
  PluginMetadata,
  InstalledPlugin,
  PluginInstallRequest,
  PluginUpdateRequest,
  PluginSearchFilters,
  PluginMarketplaceResponse,
} from '../../types/plugins';
import { getPluginRegistry } from './registry';

const PLUGINS_BASE = '/plugins';

/**
 * Query keys for plugin-related queries
 */
export const pluginQueryKeys = {
  ...queryKeys,
  plugins: {
    all: ['plugins'] as const,
    marketplace: () => [...pluginQueryKeys.plugins.all, 'marketplace'] as const,
    search: (filters: PluginSearchFilters) =>
      [...pluginQueryKeys.plugins.marketplace(), filters] as const,
    installed: () => [...pluginQueryKeys.plugins.all, 'installed'] as const,
    installedList: (filters: Record<string, unknown>) =>
      [...pluginQueryKeys.plugins.installed(), filters] as const,
    details: () => [...pluginQueryKeys.plugins.all, 'detail'] as const,
    detail: (slug: string) => [...pluginQueryKeys.plugins.details(), slug] as const,
    config: (pluginId: string) =>
      [...pluginQueryKeys.plugins.all, 'config', pluginId] as const,
  },
};

/**
 * Fetch all available plugins from marketplace
 */
export async function fetchMarketplacePlugins(
  filters?: PluginSearchFilters
): Promise<PluginMarketplaceResponse> {
  // For now, use the local registry; in production, this would call the API
  const registry = getPluginRegistry();
  let plugins = registry.getAllPlugins();

  // Apply filters
  if (filters?.query) {
    plugins = registry.searchPlugins(filters.query);
  }

  if (filters?.category) {
    plugins = plugins.filter((p) => p.category === filters.category);
  }

  if (filters?.featured) {
    plugins = plugins.filter((p) => p.featured);
  }

  if (filters?.tags && filters.tags.length > 0) {
    plugins = plugins.filter((p) =>
      filters.tags?.some((tag) => p.tags?.includes(tag))
    );
  }

  // Apply sorting
  if (filters?.sort_by) {
    plugins = [...plugins].sort((a, b) => {
      const order = filters.sort_order === 'desc' ? -1 : 1;
      switch (filters.sort_by) {
        case 'name':
          return order * a.name.localeCompare(b.name);
        case 'downloads':
          return order * ((a.download_count ?? 0) - (b.download_count ?? 0));
        case 'rating':
          return order * ((a.rating ?? 0) - (b.rating ?? 0));
        default:
          return 0;
      }
    });
  }

  return {
    plugins,
    total: plugins.length,
    page: 1,
    limit: 50,
    total_pages: 1,
  };
}

/**
 * Fetch a specific plugin by slug
 */
export async function fetchPlugin(slug: string): Promise<PluginMetadata | null> {
  // First check local registry
  const registry = getPluginRegistry();
  const localPlugin = registry.getPlugin(slug);
  if (localPlugin) {
    return localPlugin;
  }

  // Fall back to API
  try {
    return await api.get<PluginMetadata>(`${PLUGINS_BASE}/marketplace/${slug}`);
  } catch {
    return null;
  }
}

/**
 * Fetch installed plugins for the current dealership
 */
export async function fetchInstalledPlugins(): Promise<InstalledPlugin[]> {
  try {
    return await api.get<InstalledPlugin[]>(`${PLUGINS_BASE}/installed`);
  } catch {
    // Return empty array if endpoint not available yet
    return [];
  }
}

/**
 * Fetch a specific installed plugin
 */
export async function fetchInstalledPlugin(
  pluginId: string
): Promise<InstalledPlugin | null> {
  try {
    return await api.get<InstalledPlugin>(`${PLUGINS_BASE}/installed/${pluginId}`);
  } catch {
    return null;
  }
}

/**
 * Install a plugin
 */
export async function installPlugin(
  request: PluginInstallRequest
): Promise<InstalledPlugin> {
  return api.post<InstalledPlugin>(`${PLUGINS_BASE}/install`, request);
}

/**
 * Uninstall a plugin
 */
export async function uninstallPlugin(pluginId: string): Promise<void> {
  return api.delete<void>(`${PLUGINS_BASE}/installed/${pluginId}`);
}

/**
 * Update a plugin
 */
export async function updatePlugin(
  pluginId: string,
  request: PluginUpdateRequest
): Promise<InstalledPlugin> {
  return api.patch<InstalledPlugin>(`${PLUGINS_BASE}/installed/${pluginId}`, request);
}

/**
 * Enable a plugin
 */
export async function enablePlugin(pluginId: string): Promise<InstalledPlugin> {
  return api.post<InstalledPlugin>(`${PLUGINS_BASE}/installed/${pluginId}/enable`);
}

/**
 * Disable a plugin
 */
export async function disablePlugin(pluginId: string): Promise<InstalledPlugin> {
  return api.post<InstalledPlugin>(`${PLUGINS_BASE}/installed/${pluginId}/disable`);
}

/**
 * Update plugin configuration
 */
export async function updatePluginConfig(
  pluginId: string,
  config: Record<string, string | number | boolean>
): Promise<InstalledPlugin> {
  return api.patch<InstalledPlugin>(`${PLUGINS_BASE}/installed/${pluginId}/config`, {
    config,
  });
}

/**
 * Validate plugin configuration
 */
export async function validatePluginConfig(
  pluginSlug: string,
  config: Record<string, string | number | boolean>
): Promise<{ valid: boolean; errors?: Record<string, string> }> {
  return api.post<{ valid: boolean; errors?: Record<string, string> }>(
    `${PLUGINS_BASE}/validate-config`,
    {
      plugin_slug: pluginSlug,
      config,
    }
  );
}
