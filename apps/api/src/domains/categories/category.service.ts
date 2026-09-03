import type { CategoryNode, CategorySummary } from '@ecom/shared';
import { categoryRepository } from './category.repository';
import type { CategoryRow, ListCategoriesQuery } from './category.types';

function toSummary(row: CategoryRow): CategorySummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    productCount: row._count.products,
  };
}

/**
 * Dựng cây danh mục hai cấp từ danh sách phẳng.
 *
 * Gom trên bộ nhớ trong một lượt thay vì truy vấn lồng nhau: toàn bộ danh mục
 * của một cửa hàng chỉ vài chục dòng, nên một lần đọc rồi gom là rẻ hơn nhiều
 * so với để Prisma sinh truy vấn lồng.
 */
export async function getCategoryTree(query: ListCategoriesQuery): Promise<CategoryNode[]> {
  const rows = await categoryRepository.findActiveTree();

  const parents = rows.filter((row) => row.parentId === null);
  const childrenByParent = new Map<string, CategoryRow[]>();

  for (const row of rows) {
    if (row.parentId === null) continue;
    const bucket = childrenByParent.get(row.parentId);
    if (bucket) bucket.push(row);
    else childrenByParent.set(row.parentId, [row]);
  }

  const tree = parents.map((parent) => {
    const children = (childrenByParent.get(parent.id) ?? []).map(toSummary);
    const visibleChildren = query.includeEmpty
      ? children
      : children.filter((child) => child.productCount > 0);

    // Số sản phẩm của danh mục cha là tổng của các con: sản phẩm luôn được gán
    // vào danh mục lá, nên _count của chính danh mục cha luôn bằng 0.
    const productCount = children.reduce((sum, child) => sum + child.productCount, 0);

    const node: CategoryNode = {
      ...toSummary(parent),
      productCount,
      children: visibleChildren,
    };
    return node;
  });

  return query.includeEmpty ? tree : tree.filter((node) => node.productCount > 0);
}
