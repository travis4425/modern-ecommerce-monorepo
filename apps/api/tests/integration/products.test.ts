import { prisma } from '../../src/config/prisma';
import { pool } from '../../src/config/database';
import { api, url } from '../helpers/api';

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe('GET /products', () => {
  it('trả danh sách kèm meta phân trang nhất quán', async () => {
    const response = await api().get(url('/products?limit=5')).expect(200);

    expect(response.body.data).toHaveLength(5);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 5, hasPrev: false });

    // Khẳng định TÍNH CHẤT chứ không phải con số lấy từ seed: con số sẽ sai
    // ngay lần đầu ai đó thêm sản phẩm, và test đỏ vì lý do vô nghĩa thì sớm
    // muộn cũng bị bỏ qua.
    expect(response.body.meta.total).toBeGreaterThanOrEqual(response.body.data.length);
    expect(response.body.meta.totalPages).toBe(
      Math.ceil(response.body.meta.total / response.body.meta.limit),
    );
    expect(response.body.meta.hasNext).toBe(response.body.meta.totalPages > 1);
  });

  it('trả tiền dưới dạng CHUỖI, không phải number', async () => {
    // numeric(12,2) vượt độ chính xác an toàn của số dấu phẩy động JavaScript.
    const response = await api().get(url('/products?limit=1')).expect(200);
    const product = response.body.data[0];

    expect(typeof product.price).toBe('string');
    expect(product.price).toMatch(/^\d+\.\d{2}$/);
  });

  it('tìm kiếm KHÔNG DẤU cho cùng kết quả với có dấu', async () => {
    // Điểm mấu chốt của tìm kiếm tiếng Việt. 'Kết nối' xuất hiện trong mô tả
    // ngắn của hầu hết sản phẩm điện tử.
    const withAccent = await api().get(url('/products?q=k%E1%BA%BFt%20n%E1%BB%91i')).expect(200);
    const withoutAccent = await api().get(url('/products?q=ket%20noi')).expect(200);

    expect(withoutAccent.body.meta.total).toBeGreaterThan(0);
    expect(withoutAccent.body.meta.total).toBe(withAccent.body.meta.total);
  });

  it('tìm được theo TÊN DANH MỤC, không chỉ tên sản phẩm', async () => {
    // Tên sản phẩm thật là mã model — 'Keychron K8 Pro', 'Akko 3068B'. Không
    // sản phẩm nào chứa chữ 'bàn phím', nên nếu chỉ tìm trên bảng products thì
    // khách gõ 'ban phim' sẽ nhận về trang trống.
    const response = await api().get(url('/products?q=ban%20phim')).expect(200);

    expect(response.body.meta.total).toBeGreaterThan(0);
    for (const product of response.body.data) {
      expect(product.category.slug).toMatch(/^ban-phim/);
    }
  });

  it('khớp tên sản phẩm xếp trên khớp tên danh mục', async () => {
    // Nếu không, gõ tên một thương hiệu sẽ bị cả danh mục đè xuống dưới.
    const response = await api().get(url('/products?q=keychron&sort=relevance')).expect(200);
    expect(response.body.data[0].brand).toBe('Keychron');
  });

  it('tìm được theo thương hiệu và theo SKU', async () => {
    const byBrand = await api().get(url('/products?q=logitech')).expect(200);
    expect(byBrand.body.meta.total).toBeGreaterThan(0);

    const bySku = await api().get(url('/products?q=KB-AKKO-3068B')).expect(200);
    expect(bySku.body.meta.total).toBeGreaterThan(0);
  });

  it('xếp sản phẩm khớp TÊN lên trên sản phẩm chỉ khớp mô tả', async () => {
    const response = await api().get(url('/products?q=akko&sort=relevance')).expect(200);
    expect(response.body.data[0].name.toLowerCase()).toContain('akko');
  });

  it('lọc theo danh mục cha thì lấy cả sản phẩm của danh mục con', async () => {
    // Sản phẩm luôn gán vào danh mục lá, nên lọc theo 'ban-phim' mà không lấy
    // được gì thì trang danh mục cha sẽ trống trơn.
    const parent = await api().get(url('/products?category=ban-phim')).expect(200);
    const child = await api().get(url('/products?category=ban-phim-co')).expect(200);

    expect(parent.body.meta.total).toBeGreaterThan(child.body.meta.total);
  });

  it('lọc theo khoảng giá', async () => {
    const response = await api()
      .get(url('/products?minPrice=1000000&maxPrice=3000000'))
      .expect(200);

    expect(response.body.meta.total).toBeGreaterThan(0);
    for (const product of response.body.data) {
      expect(Number(product.price)).toBeGreaterThanOrEqual(1000000);
      expect(Number(product.price)).toBeLessThanOrEqual(3000000);
    }
  });

  it('inStock=true loại bỏ sản phẩm hết hàng', async () => {
    const all = await api().get(url('/products?limit=100')).expect(200);
    const inStock = await api().get(url('/products?inStock=true&limit=100')).expect(200);
    const outOfStock = await api().get(url('/products?inStock=false&limit=100')).expect(200);

    // Kiểm quan hệ giữa ba tập, không kiểm con số cụ thể của seed.
    expect(inStock.body.meta.total + outOfStock.body.meta.total).toBe(all.body.meta.total);
    expect(outOfStock.body.meta.total).toBeGreaterThan(0);

    for (const product of inStock.body.data) {
      expect(product.stock).toBeGreaterThan(0);
    }
    for (const product of outOfStock.body.data) {
      expect(product.stock).toBe(0);
    }
  });

  it('sắp xếp theo giá tăng dần và giảm dần', async () => {
    const asc = await api().get(url('/products?sort=price&limit=10')).expect(200);
    const desc = await api().get(url('/products?sort=-price&limit=10')).expect(200);

    // Kiểm tính KHÔNG GIẢM chứ không so sánh sâu với một mảng đã sort: dữ liệu
    // có sản phẩm trùng giá, và so sánh sâu sẽ phụ thuộc vào thứ tự các phần tử
    // bằng nhau — thứ không phải là điều ta muốn khẳng định.
    const ascPrices = asc.body.data.map((p: { price: string }) => Number(p.price));
    for (let i = 1; i < ascPrices.length; i += 1) {
      expect(ascPrices[i]).toBeGreaterThanOrEqual(ascPrices[i - 1]);
    }

    const descPrices = desc.body.data.map((p: { price: string }) => Number(p.price));
    for (let i = 1; i < descPrices.length; i += 1) {
      expect(descPrices[i]).toBeLessThanOrEqual(descPrices[i - 1]);
    }

    expect(descPrices[0]).toBeGreaterThan(ascPrices[0] as number);
  });

  it('phân trang không trả về dòng trùng giữa các trang', async () => {
    // Sắp xếp thiếu tie-breaker là nguyên nhân kinh điển khiến cùng một sản
    // phẩm xuất hiện ở cả trang 1 lẫn trang 2.
    const page1 = await api().get(url('/products?sort=price&page=1&limit=10')).expect(200);
    const page2 = await api().get(url('/products?sort=price&page=2&limit=10')).expect(200);

    const ids1 = page1.body.data.map((p: { id: string }) => p.id);
    const ids2 = page2.body.data.map((p: { id: string }) => p.id);
    expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
  });

  it('từ khoá không khớp gì thì trả mảng rỗng, không lỗi', async () => {
    const response = await api().get(url('/products?q=xyzkhongcogi')).expect(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
    expect(response.body.meta.totalPages).toBe(0);
  });

  it('từ chối tham số không hợp lệ', async () => {
    await api().get(url('/products?sort=password_hash')).expect(422);
    await api().get(url('/products?minPrice=abc')).expect(422);
    await api().get(url('/products?minPrice=500&maxPrice=100')).expect(422);
    await api().get(url('/products?limit=99999')).expect(422);
  });

  it('không cho SQL injection lọt qua tham số', async () => {
    // Mọi giá trị đều đi qua tham số của driver; validator chặn sớm hơn nữa.
    await api().get(url("/products?category='%20OR%201=1--")).expect(422);
    const injected = await api()
      .get(url('/products?q=%27%3B%20DROP%20TABLE%20products%3B--'))
      .expect(200);
    expect(injected.body.success).toBe(true);

    // Bảng vẫn còn nguyên.
    const stillThere = await api().get(url('/products?limit=1')).expect(200);
    expect(stillThere.body.meta.total).toBeGreaterThan(0);
  });
});

describe('GET /products/:slug', () => {
  it('trả chi tiết với đúng hình dạng dữ liệu', async () => {
    const list = await api().get(url('/products?limit=1')).expect(200);
    const slug = list.body.data[0].slug;

    const response = await api()
      .get(url(`/products/${slug}`))
      .expect(200);
    const product = response.body.data;

    expect(product.slug).toBe(slug);
    expect(Array.isArray(product.images)).toBe(true);
    expect(Array.isArray(product.attributes)).toBe(true);
    expect(typeof product.lowStock).toBe('boolean');
    expect(product.price).toMatch(/^\d+\.\d{2}$/);
  });

  it('trả đủ ảnh và thông số của sản phẩm có sẵn hai thứ đó', async () => {
    // CHỌN sản phẩm theo tính chất cần kiểm, không lấy "sản phẩm đầu tiên".
    //
    // Các file test tích hợp dùng chung một database và chạy tuần tự, nên
    // admin-catalog.test.ts tạo ra sản phẩm chưa có ảnh và chúng là mới nhất.
    // Lấy phần tử đầu danh sách rồi giả định nó có ảnh là buộc file test này
    // vào thứ tự chạy của file khác.
    const list = await api().get(url('/products?limit=100')).expect(200);
    const withImage = list.body.data.find((p: { imageUrl: string | null }) => p.imageUrl !== null);
    expect(withImage).toBeDefined();

    const response = await api()
      .get(url(`/products/${withImage.slug}`))
      .expect(200);
    const product = response.body.data;

    expect(product.images.length).toBeGreaterThan(0);
    expect(product.images[0].url).toBe(withImage.imageUrl);
    expect(product.attributes.length).toBeGreaterThan(0);
  });

  it('trả 404 với mã PRODUCT_NOT_FOUND', async () => {
    const response = await api().get(url('/products/khong-ton-tai-dau')).expect(404);
    expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
  });

  it('từ chối slug sai định dạng bằng 422', async () => {
    await api().get(url('/products/Cho-Viet-Hoa')).expect(422);
  });
});

describe('GET /products/brands', () => {
  it('trả danh sách thương hiệu đã sắp xếp, không trùng', async () => {
    const response = await api().get(url('/products/brands')).expect(200);
    const brands: string[] = response.body.data;

    expect(brands.length).toBeGreaterThan(5);
    expect(new Set(brands).size).toBe(brands.length);

    // Thứ tự do TẦNG SERVICE quyết định bằng Intl.Collator, không phải do
    // ORDER BY của database. Nhờ vậy kết quả giống nhau ở mọi môi trường, và
    // test khẳng định được đúng hợp đồng đó thay vì đoán collation của máy.
    const collator = new Intl.Collator('vi', { sensitivity: 'base', numeric: true });
    for (let i = 1; i < brands.length; i += 1) {
      expect(collator.compare(brands[i - 1] as string, brands[i] as string)).toBeLessThanOrEqual(0);
    }
  });
});
