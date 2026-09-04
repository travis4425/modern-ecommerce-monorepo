import { prisma } from '../../config/prisma';

interface CreateData {
  categoryId: string;
  sku: string;
  name: string;
  slug: string;
  brand?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  price: string;
  compareAtPrice?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  attributes?: Array<{ name: string; value: string }>;
  initialStock: number;
  lowStockThreshold: number;
}

export const productAdminRepository = {
  async skuExists(sku: string): Promise<boolean> {
    // KHÔNG lọc deletedAt: SKU của sản phẩm đã xoá mềm vẫn chiếm chỗ, vì unique
    // index của database không biết tới xoá mềm. Tái sử dụng SKU cũ cũng làm
    // rối lịch sử đơn hàng.
    return (await prisma.product.count({ where: { sku } })) > 0;
  },

  async takenSlugs(): Promise<Set<string>> {
    const rows = await prisma.product.findMany({ select: { slug: true } });
    return new Set(rows.map((row) => row.slug));
  },

  async findRaw(id: string) {
    return prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        categoryId: true,
        sku: true,
        name: true,
        slug: true,
        brand: true,
        price: true,
        isActive: true,
        isFeatured: true,
      },
    });
  },

  /** Sản phẩm, thông số và tồn kho sinh ra trong cùng một transaction. */
  async createWithInventory(data: CreateData) {
    return prisma.product.create({
      data: {
        categoryId: data.categoryId,
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        brand: data.brand ?? null,
        shortDescription: data.shortDescription ?? null,
        description: data.description ?? null,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? null,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
        attributes: data.attributes
          ? {
              create: data.attributes.map((attribute, index) => ({
                name: attribute.name,
                value: attribute.value,
                sortOrder: index,
              })),
            }
          : undefined,
        inventory: {
          create: { quantity: data.initialStock, lowStockThreshold: data.lowStockThreshold },
        },
      },
      select: { id: true, sku: true, slug: true, name: true },
    });
  },

  /**
   * Sửa sản phẩm. Nếu có gửi `attributes` thì THAY THẾ toàn bộ danh sách cũ,
   * không hợp nhất — form quản trị gửi lên trạng thái đầy đủ, và hợp nhất từng
   * phần sẽ khiến thông số bị xoá trên giao diện vẫn còn trong database.
   */
  async update(
    id: string,
    data: Record<string, unknown>,
    attributes?: Array<{ name: string; value: string }>,
  ) {
    return prisma.$transaction(async (tx) => {
      if (attributes) {
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        await tx.productAttribute.createMany({
          data: attributes.map((attribute, index) => ({
            productId: id,
            name: attribute.name,
            value: attribute.value,
            sortOrder: index,
          })),
        });
      }

      return tx.product.update({
        where: { id },
        data: data as never,
        select: { id: true, sku: true, slug: true, name: true },
      });
    });
  },

  async softDelete(id: string) {
    return prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
      select: { id: true, sku: true, slug: true },
    });
  },
};
