import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

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
    https: fs.existsSync('../.cert/key.pem') && fs.existsSync('../.cert/cert.pem') ? {
      key: fs.readFileSync('../.cert/key.pem'),
      cert: fs.readFileSync('../.cert/cert.pem'),
    } : false,
    proxy: {
      '/api/v1/auth': {
        target: 'http://localhost:8087',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/v1\/auth/, '/auth'),
      },
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
