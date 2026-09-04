import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Tailwind v4 chạy bằng plugin Vite, không qua PostCSS: không có
  // tailwind.config.js, không có postcss.config.js. Token nằm trong khối @theme
  // của src/styles/index.css.
  plugins: [react(), tailwindcss()],
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
      // Ảnh sản phẩm ở chế độ lưu đĩa cũng do API phục vụ. Cho đi qua cùng
      // proxy để URL trong dev là tương đối, không phụ thuộc cổng.
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
