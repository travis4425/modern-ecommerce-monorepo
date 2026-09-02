import { defineConfig } from 'tsup';

/**
 * tsc chỉ dùng để kiểm tra kiểu (`noEmit`), việc dựng bản build giao cho tsup.
 *
 * Lý do: `@ecom/shared` được tiêu thụ dưới dạng mã nguồn TypeScript ở cả ba nơi
 * (tsx khi dev, tsup khi build, Vite ở frontend). Nhờ vậy không cần bước build
 * trung gian cho package dùng chung, không có file .d.ts cũ gây lệch kiểu, và
 * `rootDir` của backend không bị kéo ra ngoài thư mục src.
 */
export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Gộp thẳng mã nguồn của package dùng chung vào bundle
  noExternal: ['@ecom/shared'],
});
