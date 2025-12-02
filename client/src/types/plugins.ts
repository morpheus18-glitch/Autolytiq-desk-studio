/**
 * Plugin Marketplace Types
 *
 * Type definitions for the plugin system, including plugin metadata,
 * configuration, and marketplace interactions.
 */

import { BaseEntity } from './index';

/**
 * Plugin status in the marketplace
 */
export type PluginStatus = 'available' | 'installed' | 'updating' | 'disabled' | 'error';

/**
 * Plugin category for organization
 */
export type PluginCategory =
  | 'ai-assistant'
  | 'analytics'
  | 'integration'
  | 'automation'
  | 'communication'
  | 'finance'
  | 'inventory'
  | 'reporting'
  | 'security'
  | 'utility';

/**
 * Plugin permission scope
 */
export type PluginPermission =
  | 'read:deals'
  | 'write:deals'
  | 'read:customers'
  | 'write:customers'
  | 'read:inventory'
  | 'write:inventory'
  | 'read:users'
  | 'write:users'
  | 'read:config'
  | 'write:config'
  | 'execute:commands'
  | 'access:api';

/**
 * Plugin author information
 */
export interface PluginAuthor {
  name: string;
  email?: string;
  url?: string;
  verified: boolean;
}

/**
 * Plugin version information
 */
export interface PluginVersion {
  version: string;
  release_date: string;
  changelog?: string;
  min_app_version?: string;
  max_app_version?: string;
}

/**
 * Plugin configuration schema field
 */
export interface PluginConfigField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'secret';
  description?: string;
  required: boolean;
  default?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  fields: PluginConfigField[];
}

/**
 * Plugin hook definition
 */
export interface PluginHook {
  event: string;
  handler: string;
  priority?: number;
  async?: boolean;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  name: string;
  description: string;
  usage?: string;
  examples?: string[];
}

/**
 * Plugin metadata from the registry
 */
export interface PluginMetadata {
  id: string;
  name: string;
  slug: string;
  description: string;
  long_description?: string;
  category: PluginCategory;
  author: PluginAuthor;
  repository?: string;
  homepage?: string;
  documentation_url?: string;
  icon_url?: string;
  screenshots?: string[];
  tags?: string[];
  license?: string;
  permissions: PluginPermission[];
  config_schema?: PluginConfigSchema;
  hooks?: PluginHook[];
  commands?: PluginCommand[];
  current_version: PluginVersion;
  versions?: PluginVersion[];
  download_count?: number;
  rating?: number;
  rating_count?: number;
  featured?: boolean;
}

/**
 * Installed plugin instance
 */
export interface InstalledPlugin extends BaseEntity {
  plugin_id: string;
  dealership_id: string;
  metadata: PluginMetadata;
  installed_version: string;
  status: PluginStatus;
  enabled: boolean;
  config: Record<string, string | number | boolean>;
  installed_by: string;
  last_updated_by?: string;
}

/**
 * Plugin installation request
 */
export interface PluginInstallRequest {
  plugin_slug: string;
  version?: string;
  config?: Record<string, string | number | boolean>;
}

/**
 * Plugin update request
 */
export interface PluginUpdateRequest {
  version?: string;
  config?: Record<string, string | number | boolean>;
}

/**
 * Plugin marketplace search filters
 */
export interface PluginSearchFilters {
  query?: string;
  category?: PluginCategory;
  author?: string;
  tags?: string[];
  featured?: boolean;
  installed?: boolean;
  sort_by?: 'name' | 'downloads' | 'rating' | 'updated' | 'created';
  sort_order?: 'asc' | 'desc';
}

/**
 * Plugin marketplace response
 */
export interface PluginMarketplaceResponse {
  plugins: PluginMetadata[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/**
 * Plugin event payload
 */
export interface PluginEventPayload {
  plugin_id: string;
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  dealership_id: string;
  user_id: string;
  permissions: PluginPermission[];
  config: Record<string, string | number | boolean>;
}
