/** Danh mục dạng phẳng, đúng những gì frontend cần để hiển thị. */
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  sortOrder: number;
  /** Số sản phẩm đang bán thuộc danh mục này. */
  productCount: number;
}

/** Danh mục cha kèm các danh mục con của nó. */
export interface CategoryNode extends CategorySummary {
  children: CategorySummary[];
}
