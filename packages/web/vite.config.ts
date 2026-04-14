import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@web': path.resolve(__dirname, 'src'),
      '@hex/engine': path.resolve(__dirname, '../engine/src'),
    },
  },
  server: {
    port: 5174,
  },
  build: {
    // Split the bundle so initial load is leaner. The single 602 kB chunk warning
    // was real — engine + react + game-data dwarfed the actual UI code.
    rollupOptions: {
      output: {
        manualChunks: {
          // React + ReactDOM stay together (shared runtime).
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    // Engine code is large (data registries) but unavoidable for offline play.
    // Bump the warning threshold past the engine chunk so we don't see noise.
    chunkSizeWarningLimit: 700,
  },
});
