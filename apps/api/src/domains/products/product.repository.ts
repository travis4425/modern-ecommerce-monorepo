import { pool } from '../../config/database';
import { prisma } from '../../config/prisma';
import type { ListProductsQuery, ProductRawRow } from './product.types';

/**
 * Danh sách sản phẩm được viết bằng SQL thô, không dùng query builder của Prisma.
 *
 * Lý do: truy vấn này cần `websearch_to_tsquery`, `ts_rank`, `LATERAL JOIN` để
 * lấy đúng một ảnh đại diện, và `COUNT(*) OVER()` để có tổng số dòng mà không
 * phải chạy thêm một truy vấn đếm. Prisma không diễn đạt được những thứ đó.
 *
 * Từ khoá được đối chiếu với CẢ search_vector của sản phẩm lẫn của danh mục, vì
 * tên sản phẩm thật là mã model ("Keychron K8 Pro") chứ không chứa loại hàng.
 * Điểm xếp hạng cộng gộp, khớp danh mục chỉ tính hệ số 0.5 để khớp tên sản phẩm
 * luôn đứng trên.
 *
 * AN TOÀN: mọi giá trị do người dùng nhập đều đi qua tham số $1..$8 của driver.
 * Không có bất kỳ chuỗi nào được nối vào SQL — trừ mệnh đề ORDER BY, và nó chỉ
 * nhận giá trị từ bảng hằng ORDER_BY bên dưới, không bao giờ từ request.
 */
const ORDER_BY: Record<string, string> = {
  relevance: 'rank DESC, p.created_at DESC',
  price: 'p.price ASC, p.id ASC',
  '-price': 'p.price DESC, p.id ASC',
  created_at: 'p.created_at ASC, p.id ASC',
  '-created_at': 'p.created_at DESC, p.id ASC',
  rating: 'p.rating_average DESC, p.review_count DESC, p.id ASC',
  name: 'p.name ASC, p.id ASC',
  '-name': 'p.name DESC, p.id ASC',
};

const LIST_SQL = (orderBy: string) => `
SELECT
  p.id, p.sku, p.name, p.slug, p.brand,
  p.price, p.compare_at_price, p.rating_average, p.review_count,
  p.is_featured, p.created_at,
  c.name AS category_name, c.slug AS category_slug,
  COALESCE(inv.quantity, 0) AS stock,
  img.url AS image_url,
  CASE WHEN $1::text IS NULL THEN 0
       ELSE ts_rank(p.search_vector, websearch_to_tsquery('simple', immutable_unaccent($1)))
          + 0.5 * ts_rank(c.search_vector, websearch_to_tsquery('simple', immutable_unaccent($1)))
  END AS rank,
  COUNT(*) OVER() AS total_count
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN inventory inv ON inv.product_id = p.id
LEFT JOIN LATERAL (
  SELECT url FROM product_images
  WHERE product_id = p.id
  ORDER BY is_primary DESC, sort_order ASC
  LIMIT 1
) img ON TRUE
WHERE p.deleted_at IS NULL
  AND p.is_active
  AND c.deleted_at IS NULL
  AND (
    $1::text IS NULL
    OR p.search_vector @@ websearch_to_tsquery('simple', immutable_unaccent($1))
    -- Tìm cả theo tên danh mục: tên sản phẩm là mã model nên "ban phim" sẽ
    -- không khớp sản phẩm nào nếu chỉ tìm trên bảng products.
    OR c.search_vector @@ websearch_to_tsquery('simple', immutable_unaccent($1))
  )
  AND ($2::text IS NULL OR c.slug = $2 OR c.parent_id = (SELECT id FROM categories WHERE slug = $2))
  AND ($3::numeric IS NULL OR p.price >= $3)
  AND ($4::numeric IS NULL OR p.price <= $4)
  AND ($5::text IS NULL OR p.brand = $5)
  AND ($6::boolean IS NULL OR (COALESCE(inv.quantity, 0) > 0) = $6)
ORDER BY ${orderBy}
LIMIT $7 OFFSET $8`;

export const productRepository = {
  async list(
    query: ListProductsQuery,
    skip: number,
  ): Promise<{ rows: ProductRawRow[]; total: number }> {
    // Khi không có từ khoá thì không có gì để xếp hạng, nên 'relevance' rơi về
    // sản phẩm mới nhất.
    const sortKey = query.sort === 'relevance' && !query.q ? '-created_at' : query.sort;
    const orderBy = ORDER_BY[sortKey] ?? ORDER_BY['-created_at'];

    const result = await pool.query<ProductRawRow>(LIST_SQL(orderBy as string), [
      query.q ?? null,
      query.category ?? null,
      query.minPrice ?? null,
      query.maxPrice ?? null,
      query.brand ?? null,
      query.inStock ?? null,
      query.limit,
      skip,
    ]);

    // COUNT(*) OVER() chỉ có mặt khi có ít nhất một dòng. Không dòng nào nghĩa
    // là tổng bằng 0.
    const total = result.rows.length > 0 ? Number(result.rows[0]?.total_count ?? 0) : 0;

    return { rows: result.rows, total };
  },

  /**
   * Chi tiết sản phẩm dùng Prisma chứ không dùng SQL thô: đây là truy vấn đọc
   * theo quan hệ thông thường, đúng thứ query builder làm tốt.
   */
  async findBySlug(slug: string) {
    return prisma.product.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: {
        id: true,
        sku: true,
        name: true,
        slug: true,
        brand: true,
        description: true,
        shortDescription: true,
        price: true,
        compareAtPrice: true,
        ratingAverage: true,
        reviewCount: true,
        isFeatured: true,
        category: { select: { name: true, slug: true } },
        images: {
          select: { url: true, alt: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        attributes: {
          select: { name: true, value: true },
          orderBy: { sortOrder: 'asc' },
        },
        inventory: { select: { quantity: true, lowStockThreshold: true } },
      },
    });
  },

  /**
   * Tập thương hiệu đang bán, CHƯA sắp xếp.
   *
   * Cố ý không dùng ORDER BY: thứ tự của Postgres phụ thuộc collation của
   * database, mà collation khác nhau giữa máy dev, image Docker và máy chủ
   * production — cùng một API sẽ trả về thứ tự khác nhau ở mỗi nơi. Việc sắp
   * xếp cho người đọc thuộc về tầng service, nơi ta chọn được quy tắc rõ ràng.
   */
  async listDistinctBrands(): Promise<string[]> {
    const result = await pool.query<{ brand: string }>(
      `SELECT DISTINCT brand FROM products
       WHERE deleted_at IS NULL AND is_active AND brand IS NOT NULL`,
    );
    return result.rows.map((row) => row.brand);
  },
};
