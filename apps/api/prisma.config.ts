import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

/**
 * Cấu hình cho Prisma CLI (migrate, db seed, studio).
 *
 * `override: true` là có chủ đích. Mặc định dotenv KHÔNG ghi đè biến môi trường
 * đã tồn tại trong tiến trình, nên một biến DATABASE_URL còn sót lại ở cấp máy
 * (từ dự án khác, từ Supabase CLI...) sẽ âm thầm vô hiệu hoá file .env của dự
 * án này và khiến migration chạy nhầm vào database khác. Ở môi trường dev,
 * .env của dự án phải là nguồn sự thật duy nhất.
 *
 * Ở production ta chạy `prisma migrate deploy` với biến môi trường thật và
 * không có file .env, nên nhánh này không đụng tới.
 */
if (process.env.NODE_ENV !== 'production') {
  loadEnv({ override: true });
} else {
  loadEnv();
}

// In ra đích thật sự trước mọi lệnh migrate. Định dạng khớp với dòng
// describeDatabaseTarget() mà server in lúc khởi động, để hai bên đối chiếu được.
if (process.env.DATABASE_URL && process.env.NODE_ENV !== 'production') {
  try {
    const url = new URL(process.env.DATABASE_URL);
    const database = url.pathname.replace(/^\//, '') || '(không rõ)';
    console.warn(
      `[prisma] Database đích: ${url.username}@${url.hostname}:${url.port || '5432'}/${database}`,
    );
  } catch {
    console.warn('[prisma] DATABASE_URL không phải URL hợp lệ');
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7 không tự chạy seed sau `migrate dev` nữa — phải gọi `prisma db seed`.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
