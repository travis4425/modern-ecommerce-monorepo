import { ERROR_CODES, slugify, uniqueSlug } from '@ecom/shared';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { recordAudit } from '../../common/services/audit-log.service';
import { prisma } from '../../config/prisma';
import { productAdminRepository } from './product.admin.repository';

export interface CreateProductInput {
  categoryId: string;
  sku: string;
  name: string;
  brand?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  price: string;
  compareAtPrice?: string | null;
  isActive?: boolean;
  isFeatured?: boolean;
  attributes?: Array<{ name: string; value: string }>;
  initialStock?: number;
  lowStockThreshold?: number;
}

/**
 * Sản phẩm chỉ được gán vào danh mục LÁ.
 *
 * Gán vào danh mục cha sẽ khiến sản phẩm đó biến mất khỏi mọi trang danh mục
 * con, mà bộ lọc theo danh mục cha lại gom sản phẩm của các con — nên nó cũng
 * không xuất hiện đúng chỗ. Chặn ngay từ lúc tạo là rẻ nhất.
 */
async function assertLeafCategory(categoryId: string): Promise<void> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, deletedAt: null },
    select: { id: true, parentId: true, _count: { select: { children: true } } },
  });

  if (!category) {
    throw new NotFoundError(ERROR_CODES.CATEGORY_NOT_FOUND, `Category ${categoryId} not found`);
  }
  if (category._count.children > 0) {
    throw new BadRequestError(
      ERROR_CODES.CATEGORY_NOT_LEAF,
      'Products can only be assigned to leaf categories',
    );
  }
}

export async function createProduct(input: CreateProductInput) {
  await assertLeafCategory(input.categoryId);

  if (await productAdminRepository.skuExists(input.sku)) {
    throw new ConflictError(ERROR_CODES.PRODUCT_SKU_EXISTS, `SKU ${input.sku} is already in use`);
  }

  const slug = uniqueSlug(slugify(input.name), await productAdminRepository.takenSlugs());

  // Sản phẩm và dòng tồn kho phải sinh ra cùng nhau. Nếu tách rời, một lỗi ở
  // giữa để lại sản phẩm không có bản ghi tồn kho — và mọi truy vấn lọc theo
  // còn hàng sẽ âm thầm bỏ qua nó.
  const created = await productAdminRepository.createWithInventory({
    ...input,
    slug,
    initialStock: input.initialStock ?? 0,
    lowStockThreshold: input.lowStockThreshold ?? 5,
  });

  await recordAudit({
    action: 'product.create',
    entityType: 'product',
    entityId: created.id,
    after: { sku: input.sku, name: input.name, slug, price: input.price },
  });

  return created;
}

export async function updateProduct(id: string, input: Partial<CreateProductInput>) {
  const before = await productAdminRepository.findRaw(id);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  }

  if (input.categoryId && input.categoryId !== before.categoryId) {
    await assertLeafCategory(input.categoryId);
  }

  const data: Record<string, unknown> = { ...input };
  delete data.attributes;

  if (input.name && input.name !== before.name) {
    const taken = await productAdminRepository.takenSlugs();
    taken.delete(before.slug);
    data.slug = uniqueSlug(slugify(input.name), taken);
  }

  const updated = await productAdminRepository.update(id, data, input.attributes);

  await recordAudit({
    action: 'product.update',
    entityType: 'product',
    entityId: id,
    before,
    after: data,
  });

  return updated;
}

export async function deleteProduct(id: string) {
  const before = await productAdminRepository.findRaw(id);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  }

  // Xoá MỀM, luôn luôn. order_items tham chiếu sản phẩm bằng RESTRICT: xoá cứng
  // sẽ làm bốc hơi lịch sử mua hàng, hoặc đơn giản là bị database từ chối.
  const deleted = await productAdminRepository.softDelete(id);

  await recordAudit({
    action: 'product.delete',
    entityType: 'product',
    entityId: id,
    before,
  });

  return deleted;
}
