/**
 * Plugin Registry
 *
 * Central registry for managing plugins, including built-in plugins
 * and marketplace plugins. Handles plugin discovery, loading, and lifecycle.
 */

import type {
  PluginMetadata,
  PluginCategory,
  PluginPermission,
} from '../../types/plugins';

/**
 * Built-in plugin definitions that are always available
 */
export const BUILT_IN_PLUGINS: PluginMetadata[] = [
  {
    id: 'anthropics-claude-code',
    name: 'Claude Code',
    slug: 'anthropics/claude-code',
    description:
      'AI-powered coding assistant by Anthropic. Provides intelligent code generation, analysis, and assistance directly within the desk studio.',
    long_description: `Claude Code is Anthropic's official AI coding assistant that integrates seamlessly with Autolytiq Desk Studio.

**Key Features:**
- **Intelligent Code Generation**: Generate code snippets, functions, and entire modules based on natural language descriptions
- **Code Analysis**: Get detailed explanations of complex code, identify potential issues, and receive optimization suggestions
- **Interactive Assistance**: Ask questions about your codebase and get contextual answers
- **Task Automation**: Automate repetitive coding tasks with AI-powered workflows
- **Multi-Language Support**: Works with TypeScript, JavaScript, Go, Rust, and more

**Use Cases:**
- Generate API endpoints and service handlers
- Debug complex issues with AI-assisted analysis
- Write unit tests and documentation
- Refactor and optimize existing code
- Learn new patterns and best practices

Claude Code respects your codebase structure and follows your project's coding conventions.`,
    category: 'ai-assistant' as PluginCategory,
    author: {
      name: 'Anthropic',
      email: 'support@anthropic.com',
      url: 'https://anthropic.com',
      verified: true,
    },
    repository: 'https://github.com/anthropics/claude-code',
    homepage: 'https://claude.ai/code',
    documentation_url: 'https://docs.anthropic.com/claude-code',
    icon_url: '/plugins/icons/claude-code.svg',
    screenshots: [
      '/plugins/screenshots/claude-code-1.png',
      '/plugins/screenshots/claude-code-2.png',
      '/plugins/screenshots/claude-code-3.png',
    ],
    tags: ['ai', 'coding', 'assistant', 'automation', 'anthropic', 'claude'],
    license: 'Anthropic Commercial License',
    permissions: [
      'read:deals' as PluginPermission,
      'read:customers' as PluginPermission,
      'read:inventory' as PluginPermission,
      'read:config' as PluginPermission,
      'execute:commands' as PluginPermission,
      'access:api' as PluginPermission,
    ],
    config_schema: {
      fields: [
        {
          key: 'api_key',
          label: 'API Key',
          type: 'secret',
          description: 'Your Anthropic API key for Claude Code access',
          required: true,
        },
        {
          key: 'model',
          label: 'Model',
          type: 'select',
          description: 'Select the Claude model to use',
          required: true,
          default: 'claude-sonnet-4-5-20250929',
          options: [
            { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Latest)' },
            { value: 'claude-opus-4-5-20251101', label: 'Claude Opus 4 (Most Capable)' },
            { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Fastest)' },
          ],
        },
        {
          key: 'auto_suggestions',
          label: 'Enable Auto Suggestions',
          type: 'boolean',
          description: 'Automatically suggest code improvements while editing',
          required: false,
          default: true,
        },
        {
          key: 'context_lines',
          label: 'Context Lines',
          type: 'number',
          description: 'Number of surrounding lines to include for context',
          required: false,
          default: 50,
          validation: {
            min: 10,
            max: 500,
          },
        },
        {
          key: 'workspace_path',
          label: 'Workspace Path',
          type: 'string',
          description: 'Root path for code analysis (leave empty for auto-detect)',
          required: false,
        },
      ],
    },
    hooks: [
      {
        event: 'editor:save',
        handler: 'onFileSave',
        priority: 10,
        async: true,
      },
      {
        event: 'editor:open',
        handler: 'onFileOpen',
        priority: 5,
        async: true,
      },
      {
        event: 'command:execute',
        handler: 'onCommand',
        priority: 1,
        async: true,
      },
    ],
    commands: [
      {
        name: '/ask',
        description: 'Ask Claude a question about your code',
        usage: '/ask <question>',
        examples: ['/ask How does the authentication flow work?'],
      },
      {
        name: '/generate',
        description: 'Generate code based on a description',
        usage: '/generate <description>',
        examples: ['/generate Create a REST endpoint for customer search'],
      },
      {
        name: '/explain',
        description: 'Get an explanation of selected code',
        usage: '/explain [selection]',
        examples: ['/explain (with code selected)'],
      },
      {
        name: '/refactor',
        description: 'Suggest refactoring improvements',
        usage: '/refactor [selection]',
        examples: ['/refactor (with function selected)'],
      },
      {
        name: '/test',
        description: 'Generate tests for selected code',
        usage: '/test [selection]',
        examples: ['/test (with component selected)'],
      },
      {
        name: '/fix',
        description: 'Attempt to fix errors in selected code',
        usage: '/fix [selection]',
        examples: ['/fix (with buggy code selected)'],
      },
    ],
    current_version: {
      version: '1.0.0',
      release_date: '2025-12-01',
      changelog: 'Initial release of Claude Code plugin for Autolytiq Desk Studio',
      min_app_version: '1.0.0',
    },
    versions: [
      {
        version: '1.0.0',
        release_date: '2025-12-01',
        changelog: 'Initial release of Claude Code plugin for Autolytiq Desk Studio',
        min_app_version: '1.0.0',
      },
    ],
    download_count: 15420,
    rating: 4.9,
    rating_count: 892,
    featured: true,
  },
];

/**
 * Plugin Registry class for managing all plugins
 */
export class PluginRegistry {
  private plugins: Map<string, PluginMetadata> = new Map();
  private static instance: PluginRegistry | null = null;

  private constructor() {
    this.loadBuiltInPlugins();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Load built-in plugins into registry
   */
  private loadBuiltInPlugins(): void {
    for (const plugin of BUILT_IN_PLUGINS) {
      this.plugins.set(plugin.slug, plugin);
    }
  }

  /**
   * Get a plugin by slug
   */
  getPlugin(slug: string): PluginMetadata | undefined {
    return this.plugins.get(slug);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): PluginMetadata[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: PluginCategory): PluginMetadata[] {
    return this.getAllPlugins().filter((p) => p.category === category);
  }

  /**
   * Get featured plugins
   */
  getFeaturedPlugins(): PluginMetadata[] {
    return this.getAllPlugins().filter((p) => p.featured);
  }

  /**
   * Search plugins by query
   */
  searchPlugins(query: string): PluginMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPlugins().filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.tags?.some((t) => t.toLowerCase().includes(lowerQuery)) ||
        p.author.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Register a new plugin (for marketplace plugins)
   */
  registerPlugin(plugin: PluginMetadata): void {
    this.plugins.set(plugin.slug, plugin);
  }

  /**
   * Check if a plugin exists
   */
  hasPlugin(slug: string): boolean {
    return this.plugins.has(slug);
  }

  /**
   * Get plugin count
   */
  getPluginCount(): number {
    return this.plugins.size;
  }
}

/**
 * Get the plugin registry instance
 */
export function getPluginRegistry(): PluginRegistry {
  return PluginRegistry.getInstance();
}

/**
 * Resolve a plugin slug to metadata
 */
export function resolvePlugin(slug: string): PluginMetadata | undefined {
  return getPluginRegistry().getPlugin(slug);
}
