import type { Config } from 'jest';

/**
 * Hai project tách bạch, chạy riêng được:
 *
 *  unit        — không chạm database, không mở cổng. Chạy ở bất cứ đâu, kể cả
 *                trên CI chưa dựng Postgres. Đây là phần chạy trong mọi commit.
 *  integration — cần PostgreSQL đang chạy và đã migrate. Gọi API thật qua
 *                Supertest, xuống tới database thật.
 *
 * Tách ra vì hai loại có chi phí khác nhau: bắt lập trình viên dựng database
 * chỉ để kiểm một hàm băm là cách nhanh nhất khiến không ai chạy test nữa.
 */
const config: Config = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/helpers/setup-env.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'CommonJS', esModuleInterop: true } }],
      },
      moduleNameMapper: {
        '^@ecom/shared$': '<rootDir>/../../packages/shared/src/index.ts',
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/helpers/setup-env.ts'],
      // Test tích hợp dùng chung một database nên phải chạy tuần tự, nếu không
      // chúng xoá dữ liệu của nhau giữa chừng.
      maxWorkers: 1,
      testTimeout: 20_000,
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'CommonJS', esModuleInterop: true } }],
      },
      moduleNameMapper: {
        '^@ecom/shared$': '<rootDir>/../../packages/shared/src/index.ts',
      },
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/generated/**', '!src/docs/**', '!src/server.ts'],
};

export default config;
