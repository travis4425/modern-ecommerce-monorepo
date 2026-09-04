import { ERROR_CODES, slugify, uniqueSlug } from '@ecom/shared';
import { BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { recordAudit } from '../../common/services/audit-log.service';
import { categoryRepository } from './category.repository';

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * Cây danh mục chỉ có HAI cấp.
 *
 * Ràng buộc này không diễn đạt được bằng khoá ngoại (self-reference cho phép
 * sâu vô hạn), nên tầng service phải giữ. Nếu để lọt cấp ba, mọi truy vấn dựng
 * cây và mọi bộ lọc "lấy cả danh mục con" đều sai một cách âm thầm.
 */
async function assertParentIsRoot(parentId: string): Promise<void> {
  const parent = await categoryRepository.findRaw(parentId);

  if (!parent) {
    throw new NotFoundError(
      ERROR_CODES.CATEGORY_NOT_FOUND,
      `Parent category ${parentId} not found`,
    );
  }
  if (parent.parentId !== null) {
    throw new BadRequestError(
      ERROR_CODES.CATEGORY_DEPTH_EXCEEDED,
      'Category tree is limited to two levels',
    );
  }
}

export async function createCategory(input: CreateCategoryInput) {
  if (input.parentId) await assertParentIsRoot(input.parentId);

  const slug = uniqueSlug(slugify(input.name), await categoryRepository.takenSlugs());

  const created = await categoryRepository.insert({
    name: input.name,
    slug,
    parentId: input.parentId ?? null,
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
  });

  await recordAudit({
    action: 'category.create',
    entityType: 'category',
    entityId: created.id,
    after: { ...input, slug },
  });

  return created;
}

export async function updateCategory(id: string, input: Partial<CreateCategoryInput>) {
  const before = await categoryRepository.findRaw(id);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.CATEGORY_NOT_FOUND, `Category ${id} not found`);
  }

  if (input.parentId) {
    if (input.parentId === id) {
      throw new BadRequestError(
        ERROR_CODES.CATEGORY_DEPTH_EXCEEDED,
        'A category cannot be its own parent',
      );
    }
    await assertParentIsRoot(input.parentId);

    // Danh mục đang có con thì không thể tự trở thành con của ai — làm vậy sẽ
    // tạo ra cấp thứ ba.
    const { children } = await categoryRepository.countDependents(id);
    if (children > 0) {
      throw new BadRequestError(
        ERROR_CODES.CATEGORY_DEPTH_EXCEEDED,
        'Category has children and cannot be nested under another category',
      );
    }
  }

  const data: Record<string, unknown> = { ...input };

  // Đổi tên thì slug đi theo. Slug cũ chết là chấp nhận được ở khu vực quản
  // trị; giữ slug cũ mãi mãi sẽ khiến URL không còn liên quan gì tới tên hiện tại.
  if (input.name && input.name !== before.name) {
    const taken = await categoryRepository.takenSlugs();
    taken.delete(before.slug);
    data.slug = uniqueSlug(slugify(input.name), taken);
  }

  const updated = await categoryRepository.patch(id, data);

  await recordAudit({
    action: 'category.update',
    entityType: 'category',
    entityId: id,
    before,
    after: data,
  });

  return updated;
}

/**
 * Xoá mềm. Từ chối khi danh mục còn con hoặc còn sản phẩm.
 *
 * Khoá ngoại đã đặt RESTRICT, nhưng để database ném lỗi ra thì người dùng nhận
 * được một mã lỗi chung chung về ràng buộc. Kiểm ở đây cho phép trả về đúng lý
 * do và số lượng đang vướng.
 */
export async function deleteCategory(id: string) {
  const before = await categoryRepository.findRaw(id);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.CATEGORY_NOT_FOUND, `Category ${id} not found`);
  }

  const { children, products } = await categoryRepository.countDependents(id);

  if (children > 0) {
    throw new ConflictError(
      ERROR_CODES.CATEGORY_HAS_CHILDREN,
      `Category still has ${children} child categories`,
    );
  }
  if (products > 0) {
    throw new ConflictError(
      ERROR_CODES.CATEGORY_HAS_PRODUCTS,
      `Category still has ${products} products`,
    );
  }

  const deleted = await categoryRepository.markDeleted(id);

  await recordAudit({
    action: 'category.delete',
    entityType: 'category',
    entityId: id,
    before,
  });

  return deleted;
}

export async function listForAdmin() {
  return categoryRepository.findAllForAdmin();
}
