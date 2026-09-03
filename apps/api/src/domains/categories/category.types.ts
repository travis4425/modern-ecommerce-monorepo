/**
 * Hình dạng một dòng danh mục mà repository trả về.
 *
 * Đây là kiểu của CHÚNG TA, không phải kiểu model sinh tự động của Prisma. Chủ
 * ý: repository chỉ `select` đúng những cột cần dùng, nên tầng trên không bao
 * giờ vô tình phụ thuộc vào một cột mà truy vấn không hề lấy về.
 */
export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  _count: { products: number };
}

/** Tham số của endpoint lấy cây danh mục. */
export interface ListCategoriesQuery {
  /** Mặc định false: danh mục chưa có sản phẩm nào thì không hiện ra cho khách. */
  includeEmpty: boolean;
}
