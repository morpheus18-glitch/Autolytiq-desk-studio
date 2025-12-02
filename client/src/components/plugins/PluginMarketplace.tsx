/**
 * PluginMarketplace Component
 *
 * Main component for browsing, searching, and managing plugins.
 */

import { useState, useMemo, type JSX } from 'react';
import { PageHeader, PageContent, Button, Card, CardContent } from '@design-system';
import { Search, Filter, X, RefreshCw, Grid, List, Package } from 'lucide-react';
import { PluginCard, PluginCardSkeleton } from './PluginCard';
import { PluginDetailModal } from './PluginDetailModal';
import { useMarketplacePlugins, useInstalledPlugins, useInstallPlugin } from '../../hooks/usePlugins';
import type { PluginMetadata, PluginCategory, PluginSearchFilters } from '../../types/plugins';

const PLUGIN_CATEGORIES: { value: PluginCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'ai-assistant', label: 'AI Assistants' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'integration', label: 'Integrations' },
  { value: 'automation', label: 'Automation' },
  { value: 'communication', label: 'Communication' },
  { value: 'finance', label: 'Finance' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'security', label: 'Security' },
  { value: 'utility', label: 'Utilities' },
];

type ViewMode = 'grid' | 'list';

export function PluginMarketplace(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<PluginMetadata | null>(null);
  const [installingPluginId, setInstallingPluginId] = useState<string | null>(null);

  // Build filters
  const filters: PluginSearchFilters = useMemo(() => {
    const f: PluginSearchFilters = {};
    if (searchQuery.trim()) f.query = searchQuery.trim();
    if (selectedCategory !== 'all') f.category = selectedCategory;
    if (showFeaturedOnly) f.featured = true;
    return f;
  }, [searchQuery, selectedCategory, showFeaturedOnly]);

  // Fetch plugins
  const { data: marketplaceData, isLoading, refetch, isRefetching } = useMarketplacePlugins(filters);
  const { data: installedPlugins } = useInstalledPlugins();
  const installMutation = useInstallPlugin();

  const plugins = marketplaceData?.plugins ?? [];

  // Get plugin installation status
  const getPluginStatus = (pluginSlug: string) => {
    const installed = installedPlugins?.find((p) => p.metadata.slug === pluginSlug);
    return installed?.status;
  };

  // Handle install
  const handleInstall = async (plugin: PluginMetadata) => {
    setInstallingPluginId(plugin.id);
    try {
      await installMutation.mutateAsync({
        plugin_slug: plugin.slug,
        version: plugin.current_version.version,
      });
    } finally {
      setInstallingPluginId(null);
    }
  };

  // Handle configure
  const handleConfigure = (plugin: PluginMetadata) => {
    setSelectedPlugin(plugin);
  };

  // Handle view details
  const handleViewDetails = (plugin: PluginMetadata) => {
    setSelectedPlugin(plugin);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setShowFeaturedOnly(false);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || showFeaturedOnly;

  return (
    <>
      <PageHeader
        title="Plugin Marketplace"
        description="Extend your dealership with powerful plugins and integrations"
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />}
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            Refresh
          </Button>
        }
      />

      <PageContent>
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                aria-label="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as PluginCategory | 'all')}
              className="h-8 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {PLUGIN_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Featured Toggle */}
            <button
              onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
              className={`h-8 px-3 rounded-lg border text-sm transition-colors ${
                showFeaturedOnly
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              Featured Only
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="h-8 px-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                Clear Filters
              </button>
            )}

            {/* Results Count */}
            <div className="ml-auto text-sm text-muted-foreground">
              {plugins.length} plugin{plugins.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Plugin Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <PluginCardSkeleton key={i} />
            ))}
          </div>
        ) : plugins.length === 0 ? (
          <Card variant="outlined" className="p-12 text-center">
            <CardContent>
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No plugins found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search query'
                  : 'Check back later for new plugins'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
            {plugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                status={getPluginStatus(plugin.slug)}
                onInstall={handleInstall}
                onConfigure={handleConfigure}
                onViewDetails={handleViewDetails}
                isInstalling={installingPluginId === plugin.id}
              />
            ))}
          </div>
        )}
      </PageContent>

      {/* Plugin Detail Modal */}
      {selectedPlugin && (
        <PluginDetailModal
          plugin={selectedPlugin}
          isOpen={!!selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          status={getPluginStatus(selectedPlugin.slug)}
          onInstall={() => handleInstall(selectedPlugin)}
          isInstalling={installingPluginId === selectedPlugin.id}
        />
      )}
    </>
  );
}
