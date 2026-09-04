import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      // Prisma Client sinh tự động — không phải mã ta viết, không lint
      '**/src/generated/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.config.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Backend: môi trường Node
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Frontend: môi trường trình duyệt
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Quy tắc hook của React. Hai lỗi mà chỉ máy mới thấy được: gọi hook trong
  // nhánh điều kiện, và mảng phụ thuộc thiếu biến (đóng gói giá trị cũ lại rồi
  // hiển thị dữ liệu của lần render trước mà không báo gì).
  //
  // Dùng `configs.flat.recommended`, KHÔNG dùng `configs['recommended-latest']`:
  // ở plugin v7 chỉ nhánh `flat` mới đúng định dạng flat config, còn hai cái
  // kia vẫn là eslintrc cũ (`plugins` là mảng chuỗi) và ESLint 9 từ chối thẳng
  // với thông báo không nói rõ nguyên nhân.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
  },

  // File cấu hình viết theo CommonJS (commitlint, lint-staged...)
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // File cấu hình được phép dùng console
  {
    files: ['**/*.config.{ts,mts,mjs,cjs}', '**/scripts/**/*.ts', '**/prisma/*.ts'],
    rules: { 'no-console': 'off' },
  },

  prettier,
);
