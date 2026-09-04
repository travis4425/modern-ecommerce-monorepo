import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { uploadRoot } from '../../src/common/upload/disk.storage';
import { api, bearer, loginAs, url } from '../helpers/api';

let adminToken: string;
let customerToken: string;
let leafCategoryId: string;

/** PNG 1x1 thật, đủ để đi qua bước kiểm chữ ký byte. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Chỉ có phần đầu JPEG là thật — tầng lưu trữ không giải mã ảnh nên đủ dùng. */
const JPEG_HEADER = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)]);

beforeAll(async () => {
  adminToken = (await loginAs('admin@example.com')).accessToken;
  customerToken = (await loginAs('khach1@example.com')).accessToken;

  // Chọn theo TÍNH CHẤT (là danh mục lá, chưa xoá), không theo vị trí: các bộ
  // test dùng chung một database và tự thêm danh mục của riêng chúng, nên
  // "danh mục đầu tiên" không phải một thứ ổn định.
  const leaf = await prisma.category.findFirst({
    where: { deletedAt: null, parentId: { not: null }, children: { none: {} } },
    select: { id: true },
  });
  if (!leaf) throw new Error('Không tìm thấy danh mục lá nào — chạy `pnpm db:seed` trước.');
  leafCategoryId = leaf.id;
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

const asAdmin = () => bearer(adminToken);
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

async function createProduct(): Promise<string> {
  const suffix = unique();
  const response = await api()
    .post(url('/admin/products'))
    .set(...asAdmin())
    .send({
      categoryId: leafCategoryId,
      sku: `IMG-${suffix}`.toUpperCase().replace(/[^A-Z0-9-]/g, '-'),
      name: `San pham anh ${suffix}`,
      price: '199000',
    })
    .expect(201);
  return response.body.data.id as string;
}

function uploadPng(productId: string, extra: Record<string, string> = {}) {
  const request = api()
    .post(url(`/admin/products/${productId}/images`))
    .set(...asAdmin());
  for (const [field, value] of Object.entries(extra)) request.field(field, value);
  return request.attach('file', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' });
}

describe('phân quyền endpoint ảnh sản phẩm', () => {
  it('khách vãng lai bị chặn 401', async () => {
    const productId = await createProduct();
    await api()
      .get(url(`/admin/products/${productId}/images`))
      .expect(401);
  });

  it('khách hàng đã đăng nhập bị chặn 403', async () => {
    const productId = await createProduct();
    const response = await api()
      .get(url(`/admin/products/${productId}/images`))
      .set(...bearer(customerToken))
      .expect(403);
    expect(response.body.error.code).toBe('AUTH_INSUFFICIENT_PERMISSION');
  });
});

describe('tải ảnh lên', () => {
  it('lưu được ảnh và ảnh ĐẦU TIÊN tự thành ảnh đại diện', async () => {
    const productId = await createProduct();
    const response = await uploadPng(productId, { alt: 'Mặt trước' }).expect(201);

    expect(response.body.data).toMatchObject({
      alt: 'Mặt trước',
      isPrimary: true,
      sortOrder: 0,
    });
    expect(response.body.data.url).toContain('/uploads/products/');
    // publicId là khoá nội bộ của tầng lưu trữ, không được lộ ra API.
    expect(response.body.data).not.toHaveProperty('publicId');
  });

  it('tệp thật sự nằm trên đĩa ở chế độ lưu đĩa', async () => {
    const productId = await createProduct();
    const created = await uploadPng(productId).expect(201);

    const row = await prisma.productImage.findUnique({
      where: { id: created.body.data.id as string },
      select: { publicId: true },
    });
    expect(row?.publicId).toBeTruthy();
    expect(fs.existsSync(path.join(uploadRoot, row!.publicId as string))).toBe(true);
  });

  it('TỪ CHỐI tệp văn bản đội lốt PNG — kiểm nội dung, không tin Content-Type', async () => {
    const productId = await createProduct();
    const response = await api()
      .post(url(`/admin/products/${productId}/images`))
      .set(...asAdmin())
      .attach('file', Buffer.from('<svg onload=alert(1)></svg>'), {
        filename: 'anh.png',
        contentType: 'image/png',
      })
      .expect(415);

    expect(response.body.error.code).toBe('UPLOAD_FILE_TYPE_UNSUPPORTED');
    // Tệp bị từ chối không được để lại dấu vết nào trong database.
    expect(await prisma.productImage.count({ where: { productId } })).toBe(0);
  });

  it('request không kèm tệp nào bị từ chối 400', async () => {
    const productId = await createProduct();
    const response = await api()
      .post(url(`/admin/products/${productId}/images`))
      .set(...asAdmin())
      .field('alt', 'thiếu tệp')
      .expect(400);
    expect(response.body.error.code).toBe('UPLOAD_FILE_MISSING');
  });

  it('sản phẩm không tồn tại trả 404', async () => {
    const response = await api()
      .post(url('/admin/products/00000000-0000-4000-8000-000000000000/images'))
      .set(...asAdmin())
      .attach('file', PNG_1X1, { filename: 'anh.png', contentType: 'image/png' })
      .expect(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it("isPrimary='false' KHÔNG được hiểu thành true", async () => {
    // Chuỗi 'false' là chuỗi khác rỗng, nên ép kiểu boolean kiểu JavaScript sẽ
    // ra true. Đây là lý do validator dùng enum thay vì z.coerce.boolean().
    const productId = await createProduct();
    await uploadPng(productId).expect(201);
    const second = await uploadPng(productId, { isPrimary: 'false' }).expect(201);

    expect(second.body.data.isPrimary).toBe(false);
  });

  it("isPrimary='true' chuyển vai trò đại diện và chỉ còn đúng MỘT ảnh giữ nó", async () => {
    const productId = await createProduct();
    const first = await uploadPng(productId).expect(201);
    const second = await uploadPng(productId, { isPrimary: 'true' }).expect(201);

    const list = await api()
      .get(url(`/admin/products/${productId}/images`))
      .set(...asAdmin())
      .expect(200);

    const primaries = (list.body.data as Array<{ id: string; isPrimary: boolean }>).filter(
      (image) => image.isPrimary,
    );
    expect(primaries).toHaveLength(1);
    expect(primaries[0]!.id).toBe(second.body.data.id);
    expect(primaries[0]!.id).not.toBe(first.body.data.id);
  });
});

describe('sắp xếp, thay và xoá ảnh', () => {
  it('sắp xếp lại theo danh sách id gửi lên', async () => {
    const productId = await createProduct();
    const a = (await uploadPng(productId).expect(201)).body.data.id as string;
    const b = (await uploadPng(productId).expect(201)).body.data.id as string;
    const c = (await uploadPng(productId).expect(201)).body.data.id as string;

    const response = await api()
      .put(url(`/admin/products/${productId}/images/order`))
      .set(...asAdmin())
      .send({ order: [c, a, b] })
      .expect(200);

    expect((response.body.data as Array<{ id: string }>).map((image) => image.id)).toEqual([
      c,
      a,
      b,
    ]);
  });

  it('từ chối danh sách sắp xếp thiếu ảnh', async () => {
    const productId = await createProduct();
    const a = (await uploadPng(productId).expect(201)).body.data.id as string;
    await uploadPng(productId).expect(201);

    const response = await api()
      .put(url(`/admin/products/${productId}/images/order`))
      .set(...asAdmin())
      .send({ order: [a] })
      .expect(400);
    expect(response.body.error.code).toBe('PRODUCT_IMAGE_ORDER_MISMATCH');
  });

  it('thay ảnh giữ nguyên id và XOÁ tệp cũ khỏi đĩa', async () => {
    const productId = await createProduct();
    const imageId = (await uploadPng(productId).expect(201)).body.data.id as string;

    const before = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { publicId: true },
    });
    const oldFile = path.join(uploadRoot, before!.publicId as string);
    expect(fs.existsSync(oldFile)).toBe(true);

    const replaced = await api()
      .put(url(`/admin/products/${productId}/images/${imageId}`))
      .set(...asAdmin())
      .attach('file', JPEG_HEADER, { filename: 'moi.jpg', contentType: 'image/jpeg' })
      .expect(200);

    expect(replaced.body.data.id).toBe(imageId);
    expect(replaced.body.data.url).toMatch(/\.jpg$/);
    expect(fs.existsSync(oldFile)).toBe(false);
  });

  it('xoá ảnh đại diện thì ảnh còn lại đứng đầu kế thừa vai trò', async () => {
    const productId = await createProduct();
    const first = (await uploadPng(productId).expect(201)).body.data.id as string;
    const second = (await uploadPng(productId).expect(201)).body.data.id as string;

    await api()
      .delete(url(`/admin/products/${productId}/images/${first}`))
      .set(...asAdmin())
      .expect(204);

    const list = await api()
      .get(url(`/admin/products/${productId}/images`))
      .set(...asAdmin())
      .expect(200);

    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: second, isPrimary: true });
  });

  it('xoá ảnh cũng xoá tệp trên đĩa', async () => {
    const productId = await createProduct();
    const imageId = (await uploadPng(productId).expect(201)).body.data.id as string;
    const row = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { publicId: true },
    });
    const file = path.join(uploadRoot, row!.publicId as string);

    await api()
      .delete(url(`/admin/products/${productId}/images/${imageId}`))
      .set(...asAdmin())
      .expect(204);

    expect(fs.existsSync(file)).toBe(false);
  });

  it('không sửa được ảnh của sản phẩm khác qua id sản phẩm của mình', async () => {
    // Lỗi tham chiếu trực tiếp đối tượng: repository lọc theo CẢ productId lẫn
    // imageId nên đường tắt này bị chặn.
    const mine = await createProduct();
    const other = await createProduct();
    const otherImage = (await uploadPng(other).expect(201)).body.data.id as string;

    const response = await api()
      .delete(url(`/admin/products/${mine}/images/${otherImage}`))
      .set(...asAdmin())
      .expect(404);
    expect(response.body.error.code).toBe('PRODUCT_IMAGE_NOT_FOUND');
  });

  it('đặt alt qua PATCH, và đặt lại ảnh đại diện', async () => {
    const productId = await createProduct();
    const first = (await uploadPng(productId).expect(201)).body.data.id as string;
    const second = (await uploadPng(productId).expect(201)).body.data.id as string;

    const patched = await api()
      .patch(url(`/admin/products/${productId}/images/${second}`))
      .set(...asAdmin())
      .send({ alt: 'Mặt sau', isPrimary: true })
      .expect(200);

    expect(patched.body.data).toMatchObject({ alt: 'Mặt sau', isPrimary: true });

    const list = await api()
      .get(url(`/admin/products/${productId}/images`))
      .set(...asAdmin())
      .expect(200);
    const firstRow = (list.body.data as Array<{ id: string; isPrimary: boolean }>).find(
      (image) => image.id === first,
    );
    expect(firstRow!.isPrimary).toBe(false);
  });
});
