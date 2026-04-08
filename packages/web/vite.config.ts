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
});
