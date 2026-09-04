/**
 * Sản phẩm trong danh sách.
 *
 * Mọi giá trị tiền đều là CHUỖI, không phải number. Cột numeric(12,2) của
 * Postgres vượt quá độ chính xác an toàn của số dấu phẩy động JavaScript, nên
 * chuyển sang number là mở đường cho sai số kiểu 0.1 + 0.2 !== 0.3. Frontend
 * định dạng để hiển thị, và tính toán bằng thư viện decimal.
 */
export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string | null;
  price: string;
  compareAtPrice: string | null;
  ratingAverage: string;
  reviewCount: number;
  isFeatured: boolean;
  imageUrl: string | null;
  stock: number;
  category: { name: string; slug: string };
}

export interface ProductAttributeItem {
  name: string;
  value: string;
}

export interface ProductImageItem {
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

/**
 * Ảnh nhìn từ khu quản trị: có thêm id và thứ tự để sửa và sắp xếp.
 * `publicId` của Cloudinary KHÔNG bao giờ lộ ra ngoài — nó là khoá để xoá
 * tệp trên dịch vụ lưu trữ, chỉ backend cần biết.
 */
export interface ProductImageAdminItem extends ProductImageItem {
  id: string;
  sortOrder: number;
}

export interface ProductDetail extends ProductListItem {
  description: string | null;
  shortDescription: string | null;
  images: ProductImageItem[];
  attributes: ProductAttributeItem[];
  lowStock: boolean;
}

/** Các cách sắp xếp được hỗ trợ ở endpoint danh sách sản phẩm. */
export const PRODUCT_SORTS = [
  'relevance',
  'price',
  '-price',
  'created_at',
  '-created_at',
  'rating',
  'name',
  '-name',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];
