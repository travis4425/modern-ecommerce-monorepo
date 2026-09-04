import { prisma } from '../../config/prisma';
import { BaseRepository, type PrismaDelegateLike } from '../../common/repositories/base.repository';
import type { CategoryRow } from './category.types';

/** Các cột được lấy về, kèm số sản phẩm đang bán của từng danh mục. */
const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  sortOrder: true,
  parentId: true,
  _count: {
    select: {
      // Chỉ đếm sản phẩm còn bán được. Nếu đếm tất cả, danh mục toàn hàng đã
      // ẩn hoặc đã xoá mềm vẫn hiện số dương và khách bấm vào sẽ thấy trang rỗng.
      products: { where: { isActive: true, deletedAt: null } },
    },
  },
} as const;

class CategoryRepository extends BaseRepository<CategoryRow> {
  constructor() {
    // Một lần ép kiểu duy nhất, ngay tại ranh giới với Prisma. Xem chú thích ở
    // PrismaDelegateLike về lý do không dùng thẳng kiểu delegate của Prisma.
    super(prisma.category as unknown as PrismaDelegateLike<CategoryRow>, { softDelete: true });
  }

  /** Toàn bộ danh mục đang bật, đã sắp xếp sẵn theo thứ tự hiển thị. */
  async findActiveTree(): Promise<CategoryRow[]> {
    return this.findMany(
      { isActive: true },
      { select: CATEGORY_SELECT, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
    );
  }

  /** Gồm cả danh mục đang tắt — khu vực quản trị cần thấy hết. */
  async findAllForAdmin(): Promise<CategoryRow[]> {
    return this.findMany(
      {},
      { select: CATEGORY_SELECT, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
    );
  }

  /** Tập slug đã dùng, để sinh slug mới không trùng. */
  async takenSlugs(): Promise<Set<string>> {
    const rows = await prisma.category.findMany({ select: { slug: true } });
    return new Set(rows.map((row) => row.slug));
  }

  async findRaw(id: string) {
    return prisma.category.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }

  /** Đếm danh mục con và sản phẩm còn sống — dùng để chặn xoá. */
  async countDependents(id: string): Promise<{ children: number; products: number }> {
    const [children, products] = await Promise.all([
      prisma.category.count({ where: { parentId: id, deletedAt: null } }),
      prisma.product.count({ where: { categoryId: id, deletedAt: null } }),
    ]);
    return { children, products };
  }

  // Ba phương thức dưới đây cố ý KHÔNG tên là create/update/remove: chúng sẽ
  // giẫm lên phương thức cùng tên của BaseRepository nhưng trả về kiểu hẹp hơn
  // (chỉ id/slug/name thay vì cả CategoryRow). TypeScript bắt đúng chỗ này —
  // một lớp con thu hẹp kiểu trả về của lớp cha là cái bẫy chờ nổ ở nơi khác.
  async insert(data: Record<string, unknown>) {
    return prisma.category.create({
      data: data as never,
      select: { id: true, slug: true, name: true },
    });
  }

  async patch(id: string, data: Record<string, unknown>) {
    return prisma.category.update({
      where: { id },
      data: data as never,
      select: { id: true, slug: true, name: true },
    });
  }

  async markDeleted(id: string) {
    return prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, slug: true },
    });
  }
}

export const categoryRepository = new CategoryRepository();
