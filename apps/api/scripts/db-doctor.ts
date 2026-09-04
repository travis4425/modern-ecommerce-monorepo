/**
 * Chẩn đoán tầng dữ liệu — tách bạch từng lớp để biết chính xác chỗ nào hỏng.
 *
 *   pnpm --filter @ecom/api db:doctor
 *
 * Chạy bốn phép thử theo thứ tự từ thấp lên cao. Phép nào hỏng đầu tiên chính
 * là lớp có vấn đề:
 *
 *   1. pg thuần            → mạng, cổng, thông tin đăng nhập
 *   2. pg đọc bảng users   → migration đã chạy chưa
 *   3. Prisma $queryRaw    → driver adapter có nối được không
 *   4. Prisma truy vấn model → client sinh ra có khớp database không
 */
import { pool } from '../src/config/database';
import { env, describeDatabaseTarget } from '../src/config/env';
import { prisma } from '../src/config/prisma';

function dumpError(error: unknown): void {
  const e = error as Record<string, unknown> & { message?: string; stack?: string };
  console.error('    name        :', (e as { name?: string }).name);
  console.error('    message     :', JSON.stringify(e?.message));
  console.error('    code        :', JSON.stringify(e?.code));
  console.error('    clientVersion:', JSON.stringify(e?.clientVersion));
  console.error('    meta        :', JSON.stringify(e?.meta));
  console.error(
    '    cause       :',
    JSON.stringify(e?.cause, Object.getOwnPropertyNames(e?.cause ?? {})),
  );
  console.error(
    '    mọi thuộc tính:',
    JSON.stringify(e, Object.getOwnPropertyNames(e ?? {}), 2)?.slice(0, 2000),
  );
}

async function step(label: string, run: () => Promise<unknown>): Promise<boolean> {
  process.stdout.write(`\n── ${label}\n`);
  try {
    const result = await run();
    console.log(
      '   OK  ',
      typeof result === 'object' ? JSON.stringify(result)?.slice(0, 300) : result,
    );
    return true;
  } catch (error) {
    console.error('   HỎNG');
    dumpError(error);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('\n=== Chẩn đoán tầng dữ liệu ===');
  console.log('Đích      :', describeDatabaseTarget());
  console.log('NODE_ENV  :', env.NODE_ENV);

  const pgOk = await step('1. pg thuần: SELECT 1', async () => {
    const r = await pool.query('SELECT 1 AS ok');
    return r.rows[0];
  });

  if (pgOk) {
    await step('2. pg đọc bảng users và đếm bản ghi', async () => {
      const r = await pool.query(
        'SELECT count(*)::int AS users, (SELECT count(*)::int FROM roles) AS roles FROM users',
      );
      return r.rows[0];
    });

    await step('2b. các bảng đang có trong schema public', async () => {
      const r = await pool.query(
        "SELECT count(*)::int AS so_bang FROM information_schema.tables WHERE table_schema='public'",
      );
      return r.rows[0];
    });

    await step('2c. migration đã áp dụng', async () => {
      const r = await pool.query(
        'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at',
      );
      return r.rows;
    });
  }

  await step('3. Prisma $queryRaw: SELECT 1', async () => prisma.$queryRaw`SELECT 1 AS ok`);

  await step('4. Prisma đếm bản ghi model User', async () => prisma.user.count());

  await step('5. Prisma findFirst đúng select mà auth dùng', async () =>
    prisma.user.findFirst({
      where: { email: 'admin@example.com', deletedAt: null },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: {
          select: {
            name: true,
            permissions: { select: { permission: { select: { code: true } } } },
          },
        },
      },
    }),
  );

  await step('6. Prisma findFirst tối giản (chỉ id)', async () =>
    prisma.user.findFirst({ select: { id: true } }),
  );

  console.log('\n=== Xong ===\n');
}

main()
  .catch((error) => {
    console.error('\nScript hỏng ngoài dự kiến:');
    dumpError(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  });
