import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@design-system': path.resolve(__dirname, '../shared/design-system'),
    },
    // Ensure shared components resolve deps from client's node_modules
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  // Allow importing from shared directory outside of client root
  optimizeDeps: {
    include: ['lucide-react'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      // Allow serving files from parent directory (shared/)
      allow: ['..'],
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // Ensure external packages resolve from client's node_modules
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/, /shared/],
    },
  },
});
