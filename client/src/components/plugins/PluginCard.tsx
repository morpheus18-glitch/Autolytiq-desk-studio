/**
 * PluginCard Component
 *
 * Displays a plugin in the marketplace with installation status and actions.
 */

import type { JSX } from 'react';
import { Card, CardContent, Button } from '@design-system';
import { Download, Check, Star, ExternalLink, Shield } from 'lucide-react';
import type { PluginMetadata, PluginStatus } from '../../types/plugins';

interface PluginCardProps {
  plugin: PluginMetadata;
  status?: PluginStatus;
  onInstall?: (plugin: PluginMetadata) => void;
  onConfigure?: (plugin: PluginMetadata) => void;
  onViewDetails?: (plugin: PluginMetadata) => void;
  isInstalling?: boolean;
}

/**
 * Format download count for display
 */
function formatDownloads(count: number | undefined): string {
  if (!count) return '0';
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

/**
 * Get category display label
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'ai-assistant': 'AI Assistant',
    analytics: 'Analytics',
    integration: 'Integration',
    automation: 'Automation',
    communication: 'Communication',
    finance: 'Finance',
    inventory: 'Inventory',
    reporting: 'Reporting',
    security: 'Security',
    utility: 'Utility',
  };
  return labels[category] || category;
}

export function PluginCard({
  plugin,
  status,
  onInstall,
  onConfigure,
  onViewDetails,
  isInstalling = false,
}: PluginCardProps): JSX.Element {
  const isInstalled = status === 'installed' || status === 'disabled';

  return (
    <Card variant="elevated" hoverable className="flex flex-col h-full">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Plugin Icon */}
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            {plugin.icon_url ? (
              <img
                src={plugin.icon_url}
                alt={`${plugin.name} icon`}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {plugin.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Title & Author */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-foreground truncate">
                {plugin.name}
              </h3>
              {plugin.featured && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                  Featured
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                by {plugin.author.name}
              </span>
              {plugin.author.verified && (
                <Shield className="w-3 h-3 text-primary" aria-label="Verified author" />
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
          {plugin.description}
        </p>

        {/* Category & Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span className="px-2 py-0.5 rounded-full bg-muted">
            {getCategoryLabel(plugin.category)}
          </span>
          <div className="flex items-center gap-3">
            {plugin.rating && (
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {plugin.rating.toFixed(1)}
              </span>
            )}
            {plugin.download_count && (
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" />
                {formatDownloads(plugin.download_count)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onConfigure?.(plugin)}
              >
                Configure
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(plugin)}
                aria-label="View details"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => onInstall?.(plugin)}
                loading={isInstalling}
                icon={!isInstalling ? <Download className="w-4 h-4" /> : undefined}
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails?.(plugin)}
                aria-label="View details"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Installed badge */}
        {isInstalled && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-success">
            <Check className="w-4 h-4" />
            <span>
              {status === 'disabled' ? 'Installed (Disabled)' : 'Installed'}
            </span>
            <span className="text-muted-foreground">v{plugin.current_version.version}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for plugin cards
 */
export function PluginCardSkeleton(): JSX.Element {
  return (
    <Card variant="elevated" className="h-full">
      <CardContent className="p-4">
        {/* Header skeleton */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
          <div className="flex-1">
            <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Description skeleton */}
        <div className="space-y-2 mb-3">
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-4 w-4/5 bg-muted rounded animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
        </div>

        {/* Button skeleton */}
        <div className="h-8 w-full bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}
