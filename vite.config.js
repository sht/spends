import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [],
  root: 'src-modern',
  publicDir: '../public-assets',
  base: './',

  build: {
    outDir: '../dist-modern',
    emptyOutDir: true,
    sourcemap: false,
    // Warn for chunks over 500KB
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src-modern/index.html'),
        inventory: resolve(__dirname, 'src-modern/inventory.html'),
        settings: resolve(__dirname, 'src-modern/settings.html'),
      },

      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core Bootstrap framework
          'vendor-bootstrap': ['bootstrap', '@popperjs/core'],
          // Charting libraries
          'vendor-charts': ['chart.js', 'apexcharts'],
          // UI utilities
          'vendor-ui': ['alpinejs', 'sweetalert2', 'dayjs'],
        },
        // Asset naming for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  server: {
    port: 3000,
    open: true,
    // Enable CORS for development
    cors: true,
  },

  preview: {
    port: 4173,
    open: true,
  },

  css: {
    // Enable CSS source maps in development
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src-modern'),
      '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
    },
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['bootstrap', 'alpinejs', 'chart.js', 'apexcharts', 'sweetalert2', 'dayjs'],
    exclude: ['lucide'], // Optional dependency, loaded dynamically
  },
});
