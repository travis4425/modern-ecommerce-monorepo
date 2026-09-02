import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    // @ecom/shared là mã nguồn TypeScript trong workspace, để Vite tự biên dịch
    // thay vì pre-bundle như một dependency thông thường.
    exclude: ['@ecom/shared'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Nhờ proxy này, frontend gọi '/api/...' cùng origin nên dev không vướng CORS
      // và cookie HTTPOnly của refresh token (Phase 3) hoạt động đúng.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
