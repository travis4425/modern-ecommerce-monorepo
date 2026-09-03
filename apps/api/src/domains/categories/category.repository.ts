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
}

export const categoryRepository = new CategoryRepository();
