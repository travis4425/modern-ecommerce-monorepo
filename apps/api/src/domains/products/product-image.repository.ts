import { prisma } from '../../config/prisma';
import type { ImageRow } from './product-image.rules';

interface InsertData {
  productId: string;
  url: string;
  publicId: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

const SELECT = {
  id: true,
  url: true,
  publicId: true,
  alt: true,
  sortOrder: true,
  isPrimary: true,
} as const;

export const productImageRepository = {
  /** Sắp xếp theo (sortOrder, id): id làm khoá phá hoà để phân trang và test ổn định. */
  async listByProduct(productId: string) {
    return prisma.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: SELECT,
    });
  },

  async findOne(productId: string, imageId: string) {
    // Lọc theo CẢ HAI khoá, không chỉ imageId: nếu chỉ tra theo id thì một
    // request tới /admin/products/A/images/<id-của-B> vẫn xoá được ảnh của
    // sản phẩm B — lỗi tham chiếu trực tiếp đối tượng kinh điển.
    return prisma.productImage.findFirst({ where: { id: imageId, productId }, select: SELECT });
  },

  /** Thêm ảnh. Nếu ảnh mới là đại diện thì gỡ cờ của mọi ảnh cũ trong cùng transaction. */
  async insert(data: InsertData) {
    return prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.productImage.updateMany({
          where: { productId: data.productId, isPrimary: true },
          data: { isPrimary: false },
        });
      }
      return tx.productImage.create({ data, select: SELECT });
    });
  },

  async patch(imageId: string, data: { url?: string; publicId?: string; alt?: string | null }) {
    return prisma.productImage.update({ where: { id: imageId }, data, select: SELECT });
  },

  async setPrimary(productId: string, imageId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
      return tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
        select: SELECT,
      });
    });
  },

  /**
   * XOÁ CỨNG, khác với sản phẩm và danh mục.
   *
   * Ảnh không được bảng nào tham chiếu tới — order_items chụp lại tên và giá
   * sản phẩm chứ không trỏ vào product_images. Giữ lại bản ghi đã xoá mềm ở đây
   * chỉ tạo ra một cột deletedAt mà mọi truy vấn đều phải nhớ lọc, đổi lại
   * không cứu được dữ liệu gì: tệp trên dịch vụ lưu trữ đã đi rồi.
   */
  async deleteOne(imageId: string) {
    await prisma.productImage.delete({ where: { id: imageId } });
  },

  async applyOrder(updates: Array<{ id: string; sortOrder: number }>) {
    // Một transaction cho cả lô: sắp xếp dở dang để lại thứ tự lộn xộn hơn cả
    // trước khi bắt đầu.
    await prisma.$transaction(
      updates.map((update) =>
        prisma.productImage.update({
          where: { id: update.id },
          data: { sortOrder: update.sortOrder },
        }),
      ),
    );
  },

  toRows(images: Array<{ id: string; sortOrder: number; isPrimary: boolean }>): ImageRow[] {
    return images.map((image) => ({
      id: image.id,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    }));
  },
};
