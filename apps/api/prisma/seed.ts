import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PERMISSIONS, STAFF_PERMISSIONS, CATEGORY_TREE, PRODUCTS, COUPONS } from './seed-data';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Thiếu DATABASE_URL — kiểm tra apps/api/.env');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** Mật khẩu chung cho mọi tài khoản mẫu. Chỉ dùng ở môi trường dev. */
const DEMO_PASSWORD = 'Password@123';
const BCRYPT_ROUNDS = 12;

/** Bỏ dấu tiếng Việt rồi tạo slug an toàn cho URL. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Xoá sạch theo đúng thứ tự khoá ngoại (con trước, cha sau).
 * Đây là xoá cứng có chủ đích: dữ liệu seed không phải dữ liệu thật.
 */
async function reset(): Promise<void> {
  await prisma.auditLog.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.review.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.address.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Từ chối chạy seed trên môi trường production.');
  }

  const startedAt = Date.now();
  console.log('Đang xoá dữ liệu cũ...');
  await reset();

  // ── Quyền và vai trò ──────────────────────────────────────────────────
  await prisma.permission.createMany({
    data: PERMISSIONS.map(([code, description]) => ({ code, description })),
  });
  const permissions = await prisma.permission.findMany();
  const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));

  const [adminRole, staffRole, userRole] = await Promise.all([
    prisma.role.create({ data: { name: 'ADMIN', description: 'Toàn quyền hệ thống' } }),
    prisma.role.create({
      data: { name: 'STAFF', description: 'Nhân viên vận hành đơn hàng và kho' },
    }),
    prisma.role.create({ data: { name: 'USER', description: 'Khách hàng' } }),
  ]);

  await prisma.rolePermission.createMany({
    data: [
      // ADMIN nhận toàn bộ quyền
      ...permissions.map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
      // STAFF chỉ nhận tập con phục vụ vận hành
      ...STAFF_PERMISSIONS.map((code) => {
        const permissionId = permissionByCode.get(code);
        if (!permissionId)
          throw new Error(`STAFF_PERMISSIONS tham chiếu quyền không tồn tại: ${code}`);
        return { roleId: staffRole.id, permissionId };
      }),
      // USER không cần quyền quản trị nào — chỉ thao tác trên tài nguyên của chính mình
    ],
  });

  // ── Người dùng ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date();

  const [, , customer1, customer2] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash,
        fullName: 'Quản trị viên',
        phone: '0900000001',
        roleId: adminRole.id,
        emailVerifiedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        email: 'staff@example.com',
        passwordHash,
        fullName: 'Nhân viên vận hành',
        phone: '0900000002',
        roleId: staffRole.id,
        emailVerifiedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        email: 'khach1@example.com',
        passwordHash,
        fullName: 'Nguyễn Văn An',
        phone: '0912345678',
        roleId: userRole.id,
        emailVerifiedAt: now,
      },
    }),
    prisma.user.create({
      data: {
        email: 'khach2@example.com',
        passwordHash,
        fullName: 'Trần Thị Bình',
        phone: '0987654321',
        roleId: userRole.id,
      },
    }),
  ]);

  await prisma.address.createMany({
    data: [
      {
        userId: customer1.id,
        recipientName: 'Nguyễn Văn An',
        phone: '0912345678',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận Gò Vấp',
        ward: 'Phường 10',
        streetAddress: '123 Quang Trung',
        isDefault: true,
      },
      {
        userId: customer1.id,
        recipientName: 'Nguyễn Văn An (công ty)',
        phone: '0912345678',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        streetAddress: '45 Lê Duẩn, toà nhà Sunwah',
      },
      {
        userId: customer2.id,
        recipientName: 'Trần Thị Bình',
        phone: '0987654321',
        province: 'TP. Hà Nội',
        district: 'Quận Cầu Giấy',
        ward: 'Phường Dịch Vọng',
        streetAddress: '78 Xuân Thuỷ',
        isDefault: true,
      },
    ],
  });

  // ── Danh mục hai cấp ──────────────────────────────────────────────────
  const categoryIdByName = new Map<string, string>();
  for (const [index, parent] of CATEGORY_TREE.entries()) {
    const createdParent = await prisma.category.create({
      data: { name: parent.name, slug: slugify(parent.name), sortOrder: index },
    });
    categoryIdByName.set(parent.name, createdParent.id);

    for (const [childIndex, childName] of parent.children.entries()) {
      const child = await prisma.category.create({
        data: {
          name: childName,
          slug: slugify(childName),
          parentId: createdParent.id,
          sortOrder: childIndex,
        },
      });
      categoryIdByName.set(childName, child.id);
    }
  }

  // ── Sản phẩm, ảnh, thông số, tồn kho ─────────────────────────────────
  for (const item of PRODUCTS) {
    const categoryId = categoryIdByName.get(item.category);
    if (!categoryId)
      throw new Error(`Sản phẩm ${item.sku} trỏ tới danh mục không tồn tại: ${item.category}`);

    const specLine = item.attributes.map(([name, value]) => `${name}: ${value}`).join(' · ');

    await prisma.product.create({
      data: {
        categoryId,
        sku: item.sku,
        name: item.name,
        slug: slugify(item.name),
        brand: item.brand,
        shortDescription: specLine.slice(0, 500),
        description:
          `${item.name} chính hãng ${item.brand}, bảo hành theo tiêu chuẩn nhà sản xuất.\n\n` +
          `Thông số nổi bật:\n` +
          item.attributes.map(([name, value]) => `• ${name}: ${value}`).join('\n'),
        price: item.price,
        compareAtPrice: item.compareAtPrice ?? null,
        isFeatured: item.featured ?? false,
        images: {
          create: [
            {
              url: `https://picsum.photos/seed/${item.sku}/900/900`,
              alt: item.name,
              sortOrder: 0,
              isPrimary: true,
            },
            {
              url: `https://picsum.photos/seed/${item.sku}-2/900/900`,
              alt: `${item.name} - góc chụp 2`,
              sortOrder: 1,
            },
          ],
        },
        attributes: {
          create: item.attributes.map(([name, value], order) => ({
            name,
            value,
            sortOrder: order,
          })),
        },
        inventory: {
          create: { quantity: item.stock, lowStockThreshold: 5 },
        },
      },
    });
  }

  // ── Mã giảm giá ───────────────────────────────────────────────────────
  await prisma.coupon.createMany({
    data: COUPONS.map((c) => ({
      code: c.code,
      description: c.description,
      type: c.type,
      value: c.value,
      minOrderAmount: c.minOrderAmount,
      maxDiscountAmount: c.maxDiscountAmount,
      usageLimit: c.usageLimit,
      perUserLimit: c.perUserLimit,
      startsAt: daysFromNow(c.daysValid < 0 ? c.daysValid - 30 : -1),
      expiresAt: daysFromNow(c.daysValid),
    })),
  });

  // ── Tổng kết ──────────────────────────────────────────────────────────
  const [roles, perms, users, categories, products, inventoryTotal, coupons] = await Promise.all([
    prisma.role.count(),
    prisma.permission.count(),
    prisma.user.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.inventory.aggregate({ _sum: { quantity: true } }),
    prisma.coupon.count(),
  ]);

  console.log(`
  Seed hoàn tất trong ${((Date.now() - startedAt) / 1000).toFixed(1)}s

    Vai trò            ${roles}
    Quyền              ${perms}
    Người dùng         ${users}
    Danh mục           ${categories}
    Sản phẩm           ${products}
    Tổng tồn kho       ${inventoryTotal._sum.quantity ?? 0}
    Mã giảm giá        ${coupons}

  Tài khoản mẫu (mật khẩu chung: ${DEMO_PASSWORD})
    admin@example.com    ADMIN
    staff@example.com    STAFF
    khach1@example.com   USER — đã xác thực email, có 2 địa chỉ
    khach2@example.com   USER — chưa xác thực email
`);
}

main()
  .catch((error) => {
    console.error('\nSeed thất bại:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
