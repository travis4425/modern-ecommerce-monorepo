/**
 * Cấu hình viết bằng .mjs chứ không phải .ts: Jest 29 cần thêm ts-node mới đọc
 * được config TypeScript, và thêm một dependency chỉ để đọc file cấu hình là
 * không đáng.
 *
 * Hai project tách bạch, chạy riêng được:
 *
 *  unit        — không chạm database, không mở cổng. Chạy ở bất cứ đâu, kể cả
 *                CI chưa dựng Postgres. Đây là phần chạy trong mọi commit.
 *  integration — cần PostgreSQL đang chạy và đã migrate. Gọi API thật qua
 *                Supertest, xuống tới database thật.
 *
 * Tách ra vì hai loại có chi phí khác nhau: bắt lập trình viên dựng database
 * chỉ để kiểm một hàm băm là cách nhanh nhất khiến không ai chạy test nữa.
 */
const tsTransform = {
  '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'CommonJS', esModuleInterop: true } }],
};

const moduleNameMapper = {
  '^@ecom/shared$': '<rootDir>/../../packages/shared/src/index.ts',
};

/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/helpers/setup-env.ts'],
      transform: tsTransform,
      moduleNameMapper,
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/helpers/setup-env.ts'],
      // Kiểm tra database MỘT LẦN trước khi chạy. Không có bước này, database
      // không nối được biểu hiện thành hàng chục dòng "expected 200, got 500"
      // chẳng nói lên điều gì.
      globalSetup: '<rootDir>/tests/helpers/ensure-database.ts',
      // Test tích hợp dùng chung một database nên phải chạy tuần tự, nếu không
      // chúng xoá dữ liệu của nhau giữa chừng.
      maxWorkers: 1,
      transform: tsTransform,
      moduleNameMapper,
    },
  ],
  // testTimeout phải nằm ở cấp gốc, đặt trong project sẽ bị Jest bỏ qua.
  testTimeout: 20000,
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/docs/**', '!src/server.ts'],
};
