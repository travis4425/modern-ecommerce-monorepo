import {
  listProductsQuerySchema,
  productSlugParamSchema,
} from '../../src/domains/products/product.validator';

describe('tham số danh sách sản phẩm', () => {
  it('điền giá trị mặc định khi không truyền gì', () => {
    const parsed = listProductsQuerySchema.parse({});
    expect(parsed).toMatchObject({ page: 1, limit: 20, sort: 'relevance' });
  });

  it('giữ giá dưới dạng CHUỖI, không ép sang number', () => {
    // Ép sang number là tự tạo sai số dấu phẩy động cho đúng thứ cả hệ thống
    // đang cố giữ chính xác.
    const parsed = listProductsQuerySchema.parse({ minPrice: '1000000.50' });
    expect(parsed.minPrice).toBe('1000000.50');
    expect(typeof parsed.minPrice).toBe('string');
  });

  it.each(['abc', '-100', '1.234', ''])('từ chối giá sai định dạng %p', (minPrice) => {
    expect(listProductsQuerySchema.safeParse({ minPrice }).success).toBe(false);
  });

  it('từ chối khoảng giá đảo ngược', () => {
    const result = listProductsQuerySchema.safeParse({ minPrice: '500', maxPrice: '100' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('PRICE_RANGE_INVALID');
    }
  });

  it('chấp nhận khoảng giá bằng nhau', () => {
    expect(listProductsQuerySchema.safeParse({ minPrice: '500', maxPrice: '500' }).success).toBe(
      true,
    );
  });

  it('inStock=false phải là false, không phải true', () => {
    // z.coerce.boolean() coi chuỗi 'false' là true — cái bẫy này đã cắn dự án
    // một lần rồi, nên khoá lại bằng test.
    expect(listProductsQuerySchema.parse({ inStock: 'false' }).inStock).toBe(false);
    expect(listProductsQuerySchema.parse({ inStock: 'true' }).inStock).toBe(true);
    expect(listProductsQuerySchema.parse({}).inStock).toBeUndefined();
  });

  it.each(['Bàn Phím', 'ban_phim', 'ban phim', '../etc/passwd', 'BAN-PHIM'])(
    'từ chối slug danh mục sai định dạng %p',
    (category) => {
      expect(listProductsQuerySchema.safeParse({ category }).success).toBe(false);
    },
  );

  it('từ chối cách sắp xếp lạ', () => {
    expect(listProductsQuerySchema.safeParse({ sort: 'password_hash' }).success).toBe(false);
    expect(listProductsQuerySchema.safeParse({ sort: '-price' }).success).toBe(true);
  });

  it('ép limit về trần 100', () => {
    expect(listProductsQuerySchema.safeParse({ limit: 99999 }).success).toBe(false);
  });

  it('cắt khoảng trắng thừa của từ khoá', () => {
    expect(listProductsQuerySchema.parse({ q: '  ban phim  ' }).q).toBe('ban phim');
  });
});

describe('tham số slug sản phẩm', () => {
  it('chấp nhận slug hợp lệ', () => {
    expect(productSlugParamSchema.parse({ slug: 'akko-3068b-plus' }).slug).toBe('akko-3068b-plus');
  });

  it.each(['Akko-3068B', 'akko 3068b', '../../etc', 'akko_3068b'])('từ chối slug %p', (slug) => {
    expect(productSlugParamSchema.safeParse({ slug }).success).toBe(false);
  });
});
