import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Helper to safely load optional Replit plugins
async function loadReplitPlugins() {
  if (process.env.NODE_ENV === 'production' || !process.env.REPL_ID) {
    return [];
  }

  const plugins = [];
  try {
    const runtimeErrorOverlay = await import('@replit/vite-plugin-runtime-error-modal');
    plugins.push(runtimeErrorOverlay.default());
  } catch {
    // Plugin not available, skip
  }
  try {
    const cartographer = await import('@replit/vite-plugin-cartographer');
    plugins.push(cartographer.cartographer());
  } catch {
    // Plugin not available, skip
  }
  try {
    const devBanner = await import('@replit/vite-plugin-dev-banner');
    plugins.push(devBanner.devBanner());
  } catch {
    // Plugin not available, skip
  }
  return plugins;
}

export default defineConfig({
  plugins: [
    react(),
    ...(await loadReplitPlugins()),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
      '@design-system': path.resolve(import.meta.dirname, 'shared', 'design-system'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
});
