/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/zakaz/',
  server: {
    host: '127.0.0.1',
    port: 5177,
    strictPort: true,
    watch: {
      ignored: ['**/*.tmpdir/**', '**/.*.tmpdir/**'],
    },
    proxy: {
      '/zakaz/api': {
        target: 'http://127.0.0.1:8006',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/zakaz\/api/, '/api'),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2019',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@vkontakte/vk-bridge'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
