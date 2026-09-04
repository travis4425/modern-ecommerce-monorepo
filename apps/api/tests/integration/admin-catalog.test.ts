import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { api, bearer, loginAs, url } from '../helpers/api';

let adminToken: string;
let customerToken: string;

beforeAll(async () => {
  adminToken = (await loginAs('admin@example.com')).accessToken;
  customerToken = (await loginAs('khach1@example.com')).accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

const asAdmin = () => bearer(adminToken);
const unique = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

describe('phân quyền khu vực quản trị catalog', () => {
  it('khách vãng lai bị chặn 401', async () => {
    await api().post(url('/admin/categories')).send({ name: 'Thử' }).expect(401);
    await api().get(url('/admin/categories')).expect(401);
  });

  it('khách hàng đã đăng nhập bị chặn 403', async () => {
    const response = await api()
      .post(url('/admin/categories'))
      .set(...bearer(customerToken))
      .send({ name: 'Thử' })
      .expect(403);
    expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSION');
  });
});

describe('CRUD danh mục', () => {
  it('tạo danh mục gốc và tự sinh slug từ tiếng Việt có dấu', async () => {
    const name = `Bàn phím ${unique('x')}`;
    const response = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name })
      .expect(201);

    expect(response.body.data.slug).toMatch(/^ban-phim-x-/);
    expect(response.body.data.slug).not.toMatch(/[^a-z0-9-]/);
  });

  it('hai danh mục trùng tên nhận slug khác nhau', async () => {
    const name = `Ổ cứng ${unique('y')}`;
    const first = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name })
      .expect(201);
    const second = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name })
      .expect(201);

    expect(second.body.data.slug).toBe(`${first.body.data.slug}-2`);
  });

  it('chặn cây danh mục sâu quá hai cấp', async () => {
    // Ràng buộc này không diễn đạt được bằng khoá ngoại nên tầng service phải giữ.
    const root = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('Goc') })
      .expect(201);
    const child = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('Con'), parentId: root.body.data.id })
      .expect(201);

    const grandchild = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('Chau'), parentId: child.body.data.id })
      .expect(400);

    expect(grandchild.body.error.code).toBe('CATEGORY_DEPTH_EXCEEDED');
  });

  it('không cho danh mục làm cha của chính nó', async () => {
    const category = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('TuLamCha') })
      .expect(201);

    const response = await api()
      .patch(url(`/admin/categories/${category.body.data.id}`))
      .set(...asAdmin())
      .send({ parentId: category.body.data.id })
      .expect(400);

    expect(response.body.error.code).toBe('CATEGORY_DEPTH_EXCEEDED');
  });

  it('đổi tên thì slug đi theo', async () => {
    const created = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('TenCu') })
      .expect(201);

    const renamed = await api()
      .patch(url(`/admin/categories/${created.body.data.id}`))
      .set(...asAdmin())
      .send({ name: 'Màn hình đồ hoạ chuyên nghiệp' })
      .expect(200);

    expect(renamed.body.data.slug).toMatch(/^man-hinh-do-hoa-chuyen-nghiep/);
  });

  it('từ chối xoá danh mục còn danh mục con', async () => {
    const root = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('ConCon') })
      .expect(201);
    await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('LaCon'), parentId: root.body.data.id })
      .expect(201);

    const response = await api()
      .delete(url(`/admin/categories/${root.body.data.id}`))
      .set(...asAdmin())
      .expect(409);

    expect(response.body.error.code).toBe('CATEGORY_HAS_CHILDREN');
  });

  it('từ chối xoá danh mục còn sản phẩm', async () => {
    const list = await api().get(url('/products?limit=1')).expect(200);
    const slug = list.body.data[0].category.slug;
    const admin = await api()
      .get(url('/admin/categories'))
      .set(...asAdmin())
      .expect(200);
    const target = admin.body.data.find((c: { slug: string }) => c.slug === slug);

    const response = await api()
      .delete(url(`/admin/categories/${target.id}`))
      .set(...asAdmin())
      .expect(409);

    expect(response.body.error.code).toBe('CATEGORY_HAS_PRODUCTS');
  });

  it('xoá MỀM: danh mục biến khỏi API công khai nhưng vẫn còn trong database', async () => {
    const created = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('SeXoa') })
      .expect(201);

    await api()
      .delete(url(`/admin/categories/${created.body.data.id}`))
      .set(...asAdmin())
      .expect(204);

    const publicList = await api().get(url('/categories?includeEmpty=true')).expect(200);
    const stillPublic = publicList.body.data.some(
      (c: { id: string }) => c.id === created.body.data.id,
    );
    expect(stillPublic).toBe(false);

    const row = await prisma.category.findUnique({
      where: { id: created.body.data.id },
      select: { deletedAt: true },
    });
    expect(row?.deletedAt).not.toBeNull();
  });
});

describe('CRUD sản phẩm', () => {
  async function leafCategoryId(): Promise<string> {
    const admin = await api()
      .get(url('/admin/categories'))
      .set(...asAdmin())
      .expect(200);
    const leaf = admin.body.data.find((c: { parentId: string | null }) => c.parentId !== null);
    return leaf.id as string;
  }

  const productPayload = async () => ({
    categoryId: await leafCategoryId(),
    sku: unique('SKU')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '-'),
    name: `Bàn phím thử ${unique('p')}`,
    brand: 'TestBrand',
    price: '1990000',
    initialStock: 7,
    attributes: [
      { name: 'Kết nối', value: 'Bluetooth 5.0' },
      { name: 'Switch', value: 'Gateron Brown' },
    ],
  });

  it('tạo sản phẩm kèm tồn kho và thông số trong một lần', async () => {
    const payload = await productPayload();
    const created = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(payload)
      .expect(201);

    const detail = await api()
      .get(url(`/products/${created.body.data.slug}`))
      .expect(200);
    expect(detail.body.data.stock).toBe(7);
    expect(detail.body.data.attributes).toHaveLength(2);
    expect(detail.body.data.price).toBe('1990000.00');
  });

  it('sản phẩm mới tìm được ngay bằng tiếng Việt không dấu', async () => {
    // search_vector là cột generated nên Postgres tự cập nhật — không cần bước
    // đánh chỉ mục lại nào ở tầng ứng dụng.
    const payload = { ...(await productPayload()), name: `Chuột không dây ${unique('m')}` };
    await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(payload)
      .expect(201);

    const found = await api().get(url('/products?q=chuot%20khong%20day')).expect(200);
    expect(found.body.meta.total).toBeGreaterThan(0);
  });

  it('từ chối SKU trùng', async () => {
    const payload = await productPayload();
    await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(payload)
      .expect(201);

    const duplicate = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send({ ...payload, name: 'Tên khác hoàn toàn' })
      .expect(409);

    expect(duplicate.body.error.code).toBe('PRODUCT_SKU_EXISTS');
  });

  it('từ chối gán sản phẩm vào danh mục CHA', async () => {
    // Sản phẩm gán vào danh mục cha sẽ không hiện ở trang danh mục con nào cả.
    const admin = await api()
      .get(url('/admin/categories'))
      .set(...asAdmin())
      .expect(200);
    const parent = admin.body.data.find((c: { parentId: string | null }) => c.parentId === null);

    const response = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send({ ...(await productPayload()), categoryId: parent.id })
      .expect(400);

    expect(response.body.error.code).toBe('CATEGORY_NOT_LEAF');
  });

  it('sửa thông số THAY THẾ toàn bộ danh sách cũ', async () => {
    const created = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(await productPayload())
      .expect(201);

    await api()
      .patch(url(`/admin/products/${created.body.data.id}`))
      .set(...asAdmin())
      .send({ attributes: [{ name: 'Trọng lượng', value: '58g' }] })
      .expect(200);

    const detail = await api()
      .get(url(`/products/${created.body.data.slug}`))
      .expect(200);
    expect(detail.body.data.attributes).toEqual([{ name: 'Trọng lượng', value: '58g' }]);
  });

  it('xoá MỀM: sản phẩm biến khỏi API công khai nhưng bản ghi vẫn còn', async () => {
    const created = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(await productPayload())
      .expect(201);

    await api()
      .delete(url(`/admin/products/${created.body.data.id}`))
      .set(...asAdmin())
      .expect(204);
    await api()
      .get(url(`/products/${created.body.data.slug}`))
      .expect(404);

    const row = await prisma.product.findUnique({
      where: { id: created.body.data.id },
      select: { deletedAt: true },
    });
    expect(row?.deletedAt).not.toBeNull();
  });

  it('SKU của sản phẩm đã xoá mềm vẫn không dùng lại được', async () => {
    // Unique index của database không biết tới xoá mềm, và tái dùng SKU cũ làm
    // rối lịch sử đơn hàng.
    const payload = await productPayload();
    const created = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(payload)
      .expect(201);
    await api()
      .delete(url(`/admin/products/${created.body.data.id}`))
      .set(...asAdmin())
      .expect(204);

    const reuse = await api()
      .post(url('/admin/products'))
      .set(...asAdmin())
      .send(payload)
      .expect(409);
    expect(reuse.body.error.code).toBe('PRODUCT_SKU_EXISTS');
  });
});

describe('nhật ký thao tác', () => {
  it('ghi lại ai đã tạo danh mục', async () => {
    const created = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('CoNhatKy') })
      .expect(201);

    const entry = await prisma.auditLog.findFirst({
      where: { entityType: 'category', entityId: created.body.data.id },
      select: { action: true, actorEmail: true, after: true },
    });

    expect(entry?.action).toBe('category.create');
    expect(entry?.actorEmail).toBe('admin@example.com');
    expect(entry?.after).toMatchObject({ slug: created.body.data.slug });
  });

  it('ghi cả trạng thái trước và sau khi sửa', async () => {
    const created = await api()
      .post(url('/admin/categories'))
      .set(...asAdmin())
      .send({ name: unique('SuaCoLog') })
      .expect(201);

    await api()
      .patch(url(`/admin/categories/${created.body.data.id}`))
      .set(...asAdmin())
      .send({ sortOrder: 42 })
      .expect(200);

    const entry = await prisma.auditLog.findFirst({
      where: { entityType: 'category', entityId: created.body.data.id, action: 'category.update' },
      select: { before: true, after: true },
    });

    expect(entry?.before).toMatchObject({ sortOrder: 0 });
    expect(entry?.after).toMatchObject({ sortOrder: 42 });
  });
});
