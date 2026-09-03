import {
  buildPaginationMeta,
  parseSort,
  resolvePagination,
} from '../../src/common/http/pagination';

describe('resolvePagination', () => {
  it('dùng giá trị mặc định khi không có tham số', () => {
    expect(resolvePagination({})).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('ép limit về trần 100 — không ai kéo được cả bảng', () => {
    expect(resolvePagination({ limit: 99999 }).limit).toBe(100);
  });

  it('ép page và limit nhỏ hơn 1 về mức tối thiểu', () => {
    expect(resolvePagination({ page: -5, limit: 0 })).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
      take: 1,
    });
  });

  it('cắt phần thập phân thay vì để lọt xuống database', () => {
    expect(resolvePagination({ page: 2.9, limit: 10.7 })).toEqual({
      page: 2,
      limit: 10,
      skip: 10,
      take: 10,
    });
  });

  it('tính skip đúng theo trang', () => {
    expect(resolvePagination({ page: 4, limit: 25 }).skip).toBe(75);
  });
});

describe('buildPaginationMeta', () => {
  it.each([
    [45, 2, 20, { totalPages: 3, hasNext: true, hasPrev: true }],
    [45, 1, 20, { totalPages: 3, hasNext: true, hasPrev: false }],
    [45, 3, 20, { totalPages: 3, hasNext: false, hasPrev: true }],
    [0, 1, 20, { totalPages: 0, hasNext: false, hasPrev: false }],
    [20, 1, 20, { totalPages: 1, hasNext: false, hasPrev: false }],
  ])('total=%p page=%p limit=%p', (total, page, limit, expected) => {
    expect(buildPaginationMeta(total, page, limit)).toMatchObject(expected);
  });
});

describe('parseSort', () => {
  const allowed = { created_at: 'createdAt', email: 'email' } as const;
  const fallback: ['createdAt', 'desc'] = ['createdAt', 'desc'];

  it('không có tham số thì dùng mặc định', () => {
    expect(parseSort(undefined, allowed, fallback)).toEqual({ createdAt: 'desc' });
  });

  it('tiền tố - nghĩa là giảm dần', () => {
    expect(parseSort('-email', allowed, fallback)).toEqual({ email: 'desc' });
  });

  it('không có tiền tố nghĩa là tăng dần', () => {
    expect(parseSort('email', allowed, fallback)).toEqual({ email: 'asc' });
  });

  it('cột ngoài danh sách trắng rơi về mặc định', () => {
    // Cho phép sắp xếp theo cột tuỳ ý là cho phép sắp theo cột không có index,
    // biến mỗi request thành một lần quét toàn bảng.
    expect(parseSort('password_hash', allowed, fallback)).toEqual({ createdAt: 'desc' });
    expect(parseSort('-password_hash', allowed, fallback)).toEqual({ createdAt: 'desc' });
  });

  it('ánh xạ tên cột công khai sang tên field của Prisma', () => {
    expect(parseSort('created_at', allowed, fallback)).toEqual({ createdAt: 'asc' });
  });
});
