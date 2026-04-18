/// <reference types="vitest" />
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
  test: {
    // Exclude Playwright specs — they live in e2e/ and use @playwright/test
    // APIs that vitest cannot execute. Without this, vitest collects 18-19
    // .spec.ts files and reports them as file-level failures on every run,
    // polluting the pass/fail signal. Unit + integration tests live in
    // src/**/__tests__/ and are unaffected.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
      'e2e/**',
      '**/e2e/**/*.spec.*',
    ],
  },
});
