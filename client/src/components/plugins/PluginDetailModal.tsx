/**
 * PluginDetailModal Component
 *
 * Modal for viewing detailed plugin information and configuration.
 */

import type { JSX } from 'react';
import { Button } from '@design-system';
import { Modal } from '../ui/Modal';
import {
  Download,
  Check,
  Star,
  Shield,
  ExternalLink,
  BookOpen,
  Github,
  Terminal,
  Lock,
} from 'lucide-react';
import type { PluginMetadata, PluginStatus, PluginPermission } from '../../types/plugins';

interface PluginDetailModalProps {
  plugin: PluginMetadata;
  isOpen: boolean;
  onClose: () => void;
  status?: PluginStatus;
  onInstall?: () => void;
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
 * Get permission display label
 */
function getPermissionLabel(permission: PluginPermission): string {
  const labels: Record<PluginPermission, string> = {
    'read:deals': 'Read deals data',
    'write:deals': 'Modify deals',
    'read:customers': 'Read customer data',
    'write:customers': 'Modify customers',
    'read:inventory': 'Read inventory data',
    'write:inventory': 'Modify inventory',
    'read:users': 'Read user data',
    'write:users': 'Modify users',
    'read:config': 'Read configuration',
    'write:config': 'Modify configuration',
    'execute:commands': 'Execute commands',
    'access:api': 'Access API',
  };
  return labels[permission] || permission;
}

export function PluginDetailModal({
  plugin,
  isOpen,
  onClose,
  status,
  onInstall,
  isInstalling = false,
}: PluginDetailModalProps): JSX.Element {
  const isInstalled = status === 'installed' || status === 'disabled';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plugin.name}
      description={`by ${plugin.author.name}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header with icon and stats */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            {plugin.icon_url ? (
              <img
                src={plugin.icon_url}
                alt={`${plugin.name} icon`}
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {plugin.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-foreground">{plugin.name}</h2>
              {plugin.featured && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded">
                  Featured
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by {plugin.author.name}</span>
              {plugin.author.verified && (
                <Shield className="w-4 h-4 text-primary" aria-label="Verified author" />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {plugin.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {plugin.rating.toFixed(1)}
                  {plugin.rating_count && (
                    <span className="text-xs">({plugin.rating_count} reviews)</span>
                  )}
                </span>
              )}
              {plugin.download_count && (
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {formatDownloads(plugin.download_count)} downloads
                </span>
              )}
              <span>v{plugin.current_version.version}</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex-shrink-0">
            {isInstalled ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-lg">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Installed</span>
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={onInstall}
                loading={isInstalling}
                icon={!isInstalling ? <Download className="w-4 h-4" /> : undefined}
              >
                {isInstalling ? 'Installing...' : 'Install Plugin'}
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {plugin.long_description || plugin.description}
          </div>
        </div>

        {/* Commands */}
        {plugin.commands && plugin.commands.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Available Commands
            </h3>
            <div className="space-y-2">
              {plugin.commands.map((cmd) => (
                <div
                  key={cmd.name}
                  className="p-3 bg-muted/50 rounded-lg border border-border"
                >
                  <code className="text-sm font-mono text-primary">{cmd.name}</code>
                  <p className="text-sm text-muted-foreground mt-1">{cmd.description}</p>
                  {cmd.usage && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      Usage: {cmd.usage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Permissions */}
        {plugin.permissions && plugin.permissions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Required Permissions
            </h3>
            <div className="flex flex-wrap gap-2">
              {plugin.permissions.map((permission) => (
                <span
                  key={permission}
                  className="px-2 py-1 text-xs bg-muted rounded border border-border"
                >
                  {getPermissionLabel(permission)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {plugin.tags && plugin.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {plugin.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          {plugin.repository && (
            <a
              href={plugin.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              Repository
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {plugin.documentation_url && (
            <a
              href={plugin.documentation_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {plugin.homepage && (
            <a
              href={plugin.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Website
            </a>
          )}
        </div>

        {/* Version Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t border-border">
          <p>
            Version {plugin.current_version.version} released on{' '}
            {new Date(plugin.current_version.release_date).toLocaleDateString()}
          </p>
          {plugin.license && <p className="mt-1">License: {plugin.license}</p>}
        </div>
      </div>
    </Modal>
  );
}
