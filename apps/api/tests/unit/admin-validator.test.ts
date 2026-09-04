import {
  createCategorySchema,
  updateCategorySchema,
} from '../../src/domains/categories/category.admin.validator';
import {
  createProductSchema,
  updateProductSchema,
} from '../../src/domains/products/product.admin.validator';

describe('tạo danh mục', () => {
  it('chấp nhận danh mục gốc', () => {
    expect(createCategorySchema.safeParse({ name: 'Bàn phím' }).success).toBe(true);
  });

  it('từ chối parentId không phải uuid', () => {
    expect(createCategorySchema.safeParse({ name: 'Bàn phím', parentId: '123' }).success).toBe(
      false,
    );
  });

  it('từ chối PATCH rỗng', () => {
    // PATCH rỗng không đổi gì nhưng vẫn ghi một dòng nhật ký thao tác.
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
  });
});

describe('tạo sản phẩm', () => {
  const valid = {
    categoryId: '11111111-1111-4111-8111-111111111111',
    sku: 'KB-TEST-01',
    name: 'Bàn phím thử nghiệm',
    price: '1500000',
  };

  it('chấp nhận dữ liệu hợp lệ', () => {
    expect(createProductSchema.safeParse(valid).success).toBe(true);
  });

  it('viết hoa SKU để không có hai SKU chỉ khác hoa thường', () => {
    const parsed = createProductSchema.parse({ ...valid, sku: 'kb-test-01' });
    expect(parsed.sku).toBe('KB-TEST-01');
  });

  it.each(['ab', 'KB TEST', 'KB_TEST', 'KB@TEST'])('từ chối SKU %p', (sku) => {
    expect(createProductSchema.safeParse({ ...valid, sku }).success).toBe(false);
  });

  it('giữ giá dưới dạng chuỗi', () => {
    const parsed = createProductSchema.parse({ ...valid, price: '1500000.50' });
    expect(parsed.price).toBe('1500000.50');
  });

  it.each(['1500000.555', '-100', 'abc', ''])('từ chối giá %p', (price) => {
    expect(createProductSchema.safeParse({ ...valid, price }).success).toBe(false);
  });

  it('từ chối thông số trùng tên', () => {
    // Bảng product_attributes có unique(product_id, name); chặn sớm ở đây cho
    // người dùng thấy lỗi theo field thay vì một lỗi ràng buộc từ database.
    const result = createProductSchema.safeParse({
      ...valid,
      attributes: [
        { name: 'Kết nối', value: 'Bluetooth' },
        { name: 'Kết nối', value: 'USB-C' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('chấp nhận thông số khác tên', () => {
    expect(
      createProductSchema.safeParse({
        ...valid,
        attributes: [
          { name: 'Kết nối', value: 'Bluetooth' },
          { name: 'Switch', value: 'Gateron Brown' },
        ],
      }).success,
    ).toBe(true);
  });

  it('không cho đổi SKU khi sửa sản phẩm', () => {
    // SKU là định danh đối chiếu với kho và với đơn hàng cũ. Đổi nó là đổi
    // danh tính của món hàng, phải làm bằng thao tác riêng chứ không lẫn vào PATCH.
    const parsed = updateProductSchema.parse({ name: 'Tên mới', sku: 'KHAC-01' } as never);
    expect(parsed).not.toHaveProperty('sku');
  });
});
