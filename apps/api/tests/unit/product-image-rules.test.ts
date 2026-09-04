import {
  nextSortOrder,
  planReorder,
  primaryAfterDelete,
  shouldBecomePrimary,
  type ImageRow,
} from '../../src/domains/products/product-image.rules';

const row = (id: string, sortOrder: number, isPrimary = false): ImageRow => ({
  id,
  sortOrder,
  isPrimary,
});

describe('nextSortOrder', () => {
  it('ảnh đầu tiên nhận thứ tự 0', () => {
    expect(nextSortOrder([])).toBe(0);
  });

  it('ảnh mới xếp sau ảnh có thứ tự lớn nhất, không phải sau số lượng ảnh', () => {
    // Sau vài lần xoá, thứ tự có lỗ. Dùng length sẽ sinh ra số đã có người dùng.
    expect(nextSortOrder([{ sortOrder: 0 }, { sortOrder: 7 }])).toBe(8);
  });
});

describe('shouldBecomePrimary', () => {
  it('ảnh đầu tiên luôn là đại diện dù client không yêu cầu', () => {
    expect(shouldBecomePrimary(0, undefined)).toBe(true);
    expect(shouldBecomePrimary(0, false)).toBe(true);
  });

  it('sản phẩm đã có ảnh thì chỉ đổi khi client yêu cầu rõ ràng', () => {
    expect(shouldBecomePrimary(3, undefined)).toBe(false);
    expect(shouldBecomePrimary(3, false)).toBe(false);
    expect(shouldBecomePrimary(3, true)).toBe(true);
  });
});

describe('primaryAfterDelete', () => {
  it('xoá ảnh thường thì không phải sắp xếp lại vai trò', () => {
    expect(primaryAfterDelete([row('a', 0, true), row('b', 1)], false)).toBeNull();
  });

  it('xoá ảnh đại diện thì ảnh còn lại đứng đầu kế thừa', () => {
    expect(primaryAfterDelete([row('c', 5), row('b', 1)], true)).toBe('b');
  });

  it('xoá ảnh cuối cùng thì không còn ai để kế thừa', () => {
    expect(primaryAfterDelete([], true)).toBeNull();
  });

  it('không làm gì nếu vẫn còn một ảnh đại diện', () => {
    expect(primaryAfterDelete([row('b', 1, true)], true)).toBeNull();
  });
});

describe('planReorder', () => {
  const existing = [row('a', 0), row('b', 1), row('c', 2)];

  it('gán lại thứ tự 0..n theo đúng danh sách gửi lên', () => {
    const plan = planReorder(existing, ['c', 'a', 'b']);
    expect(plan).toEqual({
      ok: true,
      updates: [
        { id: 'c', sortOrder: 0 },
        { id: 'a', sortOrder: 1 },
        { id: 'b', sortOrder: 2 },
      ],
    });
  });

  it('từ chối danh sách thiếu ảnh', () => {
    expect(planReorder(existing, ['c', 'a'])).toEqual({ ok: false });
  });

  it('từ chối danh sách có id lặp', () => {
    expect(planReorder(existing, ['a', 'a', 'b'])).toEqual({ ok: false });
  });

  it('từ chối id không thuộc sản phẩm này', () => {
    // Chính là chốt chặn khiến không thể kéo ảnh của sản phẩm khác vào đây.
    expect(planReorder(existing, ['a', 'b', 'z'])).toEqual({ ok: false });
  });

  it('sản phẩm không có ảnh thì danh sách rỗng là hợp lệ', () => {
    expect(planReorder([], [])).toEqual({ ok: true, updates: [] });
  });
});
