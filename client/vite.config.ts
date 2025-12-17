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
      '@shared': path.resolve(__dirname, '../shared'),
    },
    // Ensure shared components resolve deps from client's node_modules
    dedupe: ['react', 'react-dom', 'lucide-react'],
  },
  // Allow importing from shared directory outside of client root
  optimizeDeps: {
    include: ['lucide-react'],
    exclude: ['@shared/autoTaxEngine/wasm'], // Don't pre-bundle WASM
  },
  // Handle WASM files
  assetsInclude: ['**/*.wasm'],
  server: {
    port: 3000,
    https: fs.existsSync('../.cert/key.pem') && fs.existsSync('../.cert/cert.pem') ? {
      key: fs.readFileSync('../.cert/key.pem'),
      cert: fs.readFileSync('../.cert/cert.pem'),
    } : false,
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
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
