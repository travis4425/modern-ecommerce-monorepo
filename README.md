# E-Commerce Platform

Nền tảng thương mại điện tử full-stack, xây theo hướng production-ready: phân tầng rõ ràng ở backend, kiểu dữ liệu dùng chung giữa hai đầu, đa ngôn ngữ EN/VI, và kiểm thử tự động.

> **Trạng thái:** Phase 4a/11 — API catalog công khai với tìm kiếm tiếng Việt không dấu, 94 test unit.

---

## Tech stack

| Lớp             | Công nghệ                                                              |
| --------------- | ---------------------------------------------------------------------- |
| Frontend        | React 18, Vite, TypeScript, Tailwind CSS, TanStack Query, React Router |
| Form & validate | React Hook Form + Zod (schema dùng chung với backend)                  |
| Backend         | Node.js, Express, TypeScript                                           |
| Database        | PostgreSQL 16 + Prisma ORM 7 (driver adapter @prisma/adapter-pg)       |
| Auth            | JWT access token + refresh token rotation (HTTPOnly cookie), RBAC      |
| Lưu trữ ảnh     | Cloudinary                                                             |
| Thanh toán      | COD + mock gateway có webhook                                          |
| Kiểm thử        | Jest, Supertest                                                        |
| Tài liệu API    | Swagger / OpenAPI                                                      |
| Hạ tầng dev     | pnpm workspace, Docker Compose                                         |

## Cấu trúc thư mục

```
.
├── apps/
│   ├── api/                    # Backend REST API
│   │   └── src/
│   │       ├── config/         # env, database, hằng số ứng dụng
│   │       ├── common/         # dùng chung: errors, middleware, utils, logger
│   │       └── domains/        # mỗi nghiệp vụ một thư mục
│   │           └── health/     #   routes → controller → service → repository
│   └── web/                    # Frontend React
│       └── src/
├── packages/
│   └── shared/                 # types, enums, Zod schema dùng chung FE ↔ BE
│   │   └── prisma/             # schema.prisma, migrations, seed
├── docs/                       # ERD (docs/ERD.md), ghi chú thiết kế
├── docker-compose.yml          # PostgreSQL + pgAdmin cho môi trường dev
└── tsconfig.base.json          # cấu hình TypeScript gốc
```

**Nguyên tắc phân tầng backend — một chiều, không được đi tắt:**

```
routes → controller → service → repository → database
```

- `controller` đọc request, gọi đúng một service, gói response. Không có nghiệp vụ, không truy vấn DB.
- `service` chứa toàn bộ business logic. Không bao giờ chạm vào `req` / `res`.
- `repository` là nơi duy nhất nói chuyện với database.

## Yêu cầu môi trường

- Node.js >= 20.11
- pnpm >= 9 (`npm install -g pnpm` hoặc `corepack enable pnpm`)
- Docker Desktop (để chạy PostgreSQL)

## Cài đặt

```bash
# 1. Cài dependencies cho toàn bộ workspace
pnpm install

# 2. Tạo file môi trường
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 3. Dựng PostgreSQL + pgAdmin
pnpm db:up

# 4. Tạo bảng và nạp dữ liệu mẫu
pnpm db:migrate      # sinh migration đầu tiên rồi áp dụng
pnpm db:seed         # 18 danh mục, 38 sản phẩm, 5 mã giảm giá, 4 tài khoản

# 5. Chạy song song frontend và backend
pnpm dev
```

### Tài khoản mẫu

Mật khẩu chung: `Password@123`

| Email                | Vai trò | Ghi chú                           |
| -------------------- | ------- | --------------------------------- |
| `admin@example.com`  | ADMIN   | Toàn bộ 25 quyền                  |
| `staff@example.com`  | STAFF   | 10 quyền vận hành đơn hàng và kho |
| `khach1@example.com` | USER    | Đã xác thực email, có 2 địa chỉ   |
| `khach2@example.com` | USER    | Chưa xác thực email               |

| Dịch vụ      | Địa chỉ                             |
| ------------ | ----------------------------------- |
| Frontend     | http://localhost:5173               |
| Backend API  | http://localhost:8080/api/v1        |
| Healthcheck  | http://localhost:8080/api/v1/health |
| Tài liệu API | http://localhost:8080/api/docs      |
| pgAdmin      | http://localhost:5050               |

## Script

| Lệnh                     | Tác dụng                              |
| ------------------------ | ------------------------------------- |
| `pnpm dev`               | Chạy song song api và web             |
| `pnpm dev:api`           | Chỉ chạy backend                      |
| `pnpm dev:web`           | Chỉ chạy frontend                     |
| `pnpm build`             | Build toàn bộ workspace               |
| `pnpm typecheck`         | Kiểm tra kiểu toàn bộ workspace       |
| `pnpm lint`              | ESLint, không chấp nhận warning       |
| `pnpm format`            | Prettier ghi đè toàn bộ file          |
| `pnpm db:up` / `db:down` | Bật / tắt PostgreSQL bằng Docker      |
| `pnpm db:migrate`        | Tạo và áp dụng migration              |
| `pnpm db:seed`           | Nạp dữ liệu mẫu                       |
| `pnpm db:reset`          | Xoá sạch, chạy lại migration và seed  |
| `pnpm db:studio`         | Mở Prisma Studio để xem dữ liệu       |
| `pnpm db:generate`       | Sinh lại Prisma Client                |
| `pnpm verify`            | Toàn bộ cổng chất lượng, không cần DB |
| `pnpm verify:full`       | Như trên, kèm test tích hợp           |

## Quy ước API

**Envelope.** Mọi endpoint trả về cùng một hình dạng:

```jsonc
// thành công
{ "success": true, "data": { }, "meta": { } }   // meta chỉ có ở endpoint danh sách

// thất bại
{ "success": false, "error": { "code": "PRODUCT_NOT_FOUND", "message": "...", "details": [] } }
```

**Mã lỗi.** `error.code` là hợp đồng công khai, định nghĩa tập trung tại
`packages/shared/src/constants/error-codes.ts`. Frontend tra `errors.<MÃ>` trong file i18n
để hiển thị. Trường `error.message` chỉ dành cho developer đọc log — không bao giờ
hiển thị thẳng cho người dùng. Mã đã phát hành thì không đổi và không xoá.

**Truy vết.** Mọi response đều kèm header `x-request-id`. Mã này xuất hiện trong mọi
dòng log của request đó, kể cả log viết từ sâu trong tầng service. Người dùng báo lỗi
kèm mã này là tra ra ngay toàn bộ dấu vết.

**Phân trang.** `?page=1&limit=20&sort=-created_at`. `limit` bị ép về tối đa 100.
`sort` chỉ chấp nhận các cột nằm trong danh sách trắng của từng endpoint.

**Xử lý lỗi.** Không bao giờ `throw` chuỗi hay object trần — luôn ném một lớp kế thừa
`AppError`. Mọi handler bất đồng bộ phải bọc trong `asyncHandler`, nếu không promise bị
reject sẽ làm request treo tới khi timeout mà không để lại dòng log nào.

## Xác thực

| Endpoint                | Mô tả                                               |
| ----------------------- | --------------------------------------------------- |
| `POST /auth/register`   | Đăng ký. Giới hạn 10 request / 15 phút theo IP.     |
| `POST /auth/login`      | Đăng nhập.                                          |
| `POST /auth/refresh`    | Làm mới access token, đồng thời xoay refresh token. |
| `POST /auth/logout`     | Đăng xuất thiết bị hiện tại.                        |
| `POST /auth/logout-all` | Thu hồi mọi phiên.                                  |
| `GET /auth/me`          | Hồ sơ và danh sách quyền của người đang đăng nhập.  |

**Access token** sống 15 phút, nằm trong body, frontend giữ trong bộ nhớ. Quyền được
nhúng thẳng vào token để mỗi request không phải join ba bảng — đổi lại quyền có thể cũ
tối đa 15 phút.

**Refresh token** sống 7 ngày, là chuỗi ngẫu nhiên 256 bit (không phải JWT), chỉ lưu
SHA-256 trong database. Nó đi bằng cookie `httpOnly` + `sameSite=strict` +
`path=/api/v1/auth`, nên JavaScript không đọc được và không bị gửi kèm ở request khác.

**Xoay và phát hiện đánh cắp.** Mỗi lần làm mới sinh token mới và thu hồi token cũ trong
cùng một transaction. Mỗi lần đăng nhập mở một _family_ riêng. Nếu một token ĐÃ bị thu hồi
được dùng lại — điều không thể xảy ra trong luồng bình thường — nghĩa là có hai bên cùng
giữ token, nên toàn bộ family bị thu hồi và cả hai phải đăng nhập lại.

**Phân quyền theo quyền hạt mịn**, không theo tên vai trò:
`requirePermission('order:update_status')`. Thêm vai trò mới không phải sửa route nào.

**Chống dò tài khoản.** Sai email và sai mật khẩu trả về cùng một mã lỗi _và_ tốn cùng
lượng thời gian — khi email không tồn tại, service vẫn chạy một phép so bcrypt giả.

## Kiểm thử

```bash
pnpm --filter @ecom/api test:unit          # 70 test, không cần database
pnpm --filter @ecom/api test:integration   # cần Postgres đã seed
pnpm --filter @ecom/api test               # cả hai
pnpm --filter @ecom/api test:cov           # kèm báo cáo coverage
```

Hai loại tách bạch có lý do: bắt lập trình viên dựng database chỉ để kiểm một hàm băm
là cách nhanh nhất khiến không ai chạy test nữa. Test unit chạy ở mọi nơi trong khoảng
2 giây và là phần chạy trong mọi commit; test tích hợp gọi API thật qua Supertest xuống
tới database thật, nên bắt được thứ test unit không thể: transaction, ràng buộc của
database, và thứ tự middleware.

Trước khi chạy test tích hợp:

```bash
pnpm db:up && pnpm db:reset
```

## Quên mật khẩu

`POST /auth/forgot-password` luôn trả về cùng một phản hồi, dù email có tồn tại hay
không — khác biệt bất kỳ sẽ biến nó thành công cụ liệt kê tài khoản.

Token đặt lại sống 15 phút, chỉ dùng được một lần, và mỗi lần phát mới sẽ vô hiệu hoá
mọi token cũ chưa dùng. Đổi mật khẩu thành công thì **mọi phiên đăng nhập đều bị thu
hồi**: kịch bản đặt lại mật khẩu thường bắt nguồn từ việc tài khoản đã bị chiếm, nên để
phiên cũ sống tiếp là để kẻ chiếm quyền ở nguyên bên trong.

Email song ngữ theo header `Accept-Language`. Ở dev, **không cần cấu hình gì**: bỏ trống
`SMTP_HOST` thì nội dung email được in thẳng ra terminal. Muốn thử gửi thật thì đăng ký
[Mailtrap](https://mailtrap.io) miễn phí và điền SMTP vào `.env` — mọi email sẽ nằm lại
trong hộp thư Mailtrap, không bao giờ bay tới người thật.

## Tìm kiếm sản phẩm

Tìm kiếm toàn văn **không phân biệt dấu**: gõ `ban phim` tìm được `Bàn phím`.

Cách làm: cột `search_vector` kiểu `tsvector` được Postgres **tự sinh** từ tên, thương
hiệu, SKU và mô tả ngắn — cột generated, không phải trigger, nên chỉ mục không bao giờ
lệch với dữ liệu. Dấu tiếng Việt được bỏ qua hàm `immutable_unaccent`. Chỉ mục GIN phục
vụ truy vấn.

`setweight` xếp hạng: khớp ở **tên** (hạng A) luôn đứng trên khớp ở **mô tả** (hạng C).

Dùng cấu hình `simple` chứ không phải `english`: Postgres không có bộ stemmer tiếng
Việt, và stemmer tiếng Anh sẽ cắt sai từ tiếng Việt.

Truy vấn danh sách viết bằng SQL thô có tham số hoá — nó cần `websearch_to_tsquery`,
`LATERAL JOIN` để lấy đúng một ảnh đại diện, và `COUNT(*) OVER()` để có tổng số dòng
mà không phải chạy thêm truy vấn đếm. Prisma không diễn đạt được những thứ đó. Mọi giá
trị người dùng nhập đều đi qua tham số `$1..$8` của driver; chỉ mệnh đề `ORDER BY` được
nối chuỗi, và nó chỉ nhận giá trị từ một bảng hằng.

**Tiền luôn là chuỗi trong JSON.** `numeric(12,2)` vượt độ chính xác an toàn của số dấu
phẩy động JavaScript, nên chuyển sang `number` là mở đường cho sai số.

## Ảnh sản phẩm

Chạy được ngay sau khi clone: không cấu hình gì thì ảnh được lưu vào `apps/api/uploads`
và phục vụ tại `http://localhost:8080/uploads/...`. Điền ba biến `CLOUDINARY_*` trong
`.env` thì hệ thống tự chuyển sang Cloudinary — không phải sửa dòng mã nào.

**Kiểu tệp được kết luận bằng chữ ký byte, không bằng lời khai của client.** Đổi tên
`payload.svg` thành `anh.png` rồi khai `Content-Type: image/png` là việc của một dòng
lệnh; nếu tin lời khai thì tệp đó được lưu lại và phục vụ từ chính origin của cửa hàng
— nghĩa là XSS lưu trữ. Danh sách cho phép cố ý không có SVG (là XML, chứa được
`<script>`) và không có GIF.

Chi tiết khác:

- Tệp giữ trong bộ nhớ, có trần kích thước, chỉ ghi xuống nơi lưu trữ sau khi qua kiểm.
- Tên tệp do server sinh — tên client gửi lên có thể chứa `../`.
- Ghi tệp trước, ghi database sau; database lỗi thì xoá tệp vừa lưu, không để lại tệp
  mồ côi. Khi thay ảnh: lưu tệp mới, cập nhật bản ghi, rồi mới xoá tệp cũ.
- Mỗi sản phẩm luôn có đúng **một** ảnh đại diện: ảnh đầu tiên tự nhận vai trò, và khi
  ảnh đại diện bị xoá thì ảnh còn lại đứng đầu kế thừa.
- Endpoint: `GET|POST /admin/products/:id/images`,
  `PUT /admin/products/:id/images/order`,
  `PUT|PATCH|DELETE /admin/products/:id/images/:imageId`.

## Frontend

Bộ khung ở `apps/web`: React Router, Tailwind v4, TanStack Query, react-i18next.

**Design token khai báo một lần** trong khối `@theme` của `src/index.css`. Tailwind v4
không dùng `tailwind.config.js` nữa — mỗi biến CSS ở đó tự sinh ra tiện ích tương ứng
(`--color-brand-500` → `bg-brand-500`, `text-brand-500`, `border-brand-500`). Đổi tông
thương hiệu là sửa đúng một khối, không phải đi tìm mã màu khắp nơi.

**Song ngữ, và trình biên dịch giữ cho nó đúng.** Ba lớp ràng buộc:

| Ràng buộc                                | Bắt được gì                                   |
| ---------------------------------------- | --------------------------------------------- |
| `i18n/i18next.d.ts`                      | `t('home.titlee')` — gõ sai khoá              |
| `en: Dictionary` (suy từ bản tiếng Việt) | Bản dịch thiếu khoá, hoặc thừa khoá đã bỏ     |
| `errors: Record<ErrorCode, string>`      | Thêm mã lỗi ở backend mà quên dịch ở frontend |

Cả ba đều nổ lúc `pnpm typecheck`, không đợi tới lúc người dùng nhìn thấy chuỗi
`PRODUCT_NOT_FOUND` giữa giao diện tiếng Việt.

**Lỗi hiển thị luôn tra theo `error.code`.** Trường `message` mà backend trả về viết cho
lập trình viên đọc log — nó có thể chứa tên bảng, tên cột — nên không bao giờ đem hiển
thị. `useErrorMessage()` là cửa duy nhất đổi lỗi thành câu người đọc được.

## Hành trình khách vãng lai

Trang chủ → danh mục → danh sách có lọc → chi tiết sản phẩm. Không cần đăng nhập.

**URL là nguồn sự thật duy nhất của bộ lọc.** Không có state song song trong component.
Đổi lấy ba thứ mà giữ state riêng không bao giờ có: nút Back lùi đúng một bước lọc, dán
link cho người khác thì họ thấy đúng kết quả đó, và F5 không mất gì. Cái giá là mọi thứ
đều là chuỗi — nhưng backend cũng nhận chuỗi, nên không có bước chuyển kiểu nào bị bỏ lỡ.

Vài chi tiết dễ bỏ qua nhưng người dùng cảm nhận được ngay:

- Đổi bộ lọc luôn quay về trang 1. Không làm thì đang ở trang 5, lọc lại còn 2 trang, và
  danh sách rỗng dù rõ ràng có kết quả.
- Ô tìm kiếm hoãn 350 ms; `keepPreviousData` giữ lưới cũ mờ đi trong lúc tải trang mới
  thay vì cho nó biến mất rồi hiện lại, nên trang không nhảy.
- Khung xương có ĐÚNG kích thước thẻ thật, nên không giật khi dữ liệu về.
- Ảnh hỏng rơi về ô nền có chữ cái đầu, không để trình duyệt vẽ biểu tượng ảnh vỡ.
- 404 của một sản phẩm là câu trả lời hợp lệ, không phải sự cố: hiện lối về danh sách
  chứ không hiện nút "thử lại" mà bấm bao nhiêu lần cũng vẫn 404.

**Tiền là chuỗi cho tới đúng bước vẽ ra màn hình.** `formatMoney` là nơi duy nhất đổi
sang `number`, và nó an toàn vì `numeric(12,2)` tối đa 10 chữ số phần nguyên, còn số
nguyên an toàn của JavaScript là 2^53. Nếu cột tiền nới rộng hơn, chỗ đó phải đổi sang
thư viện decimal — ràng buộc được ghi ngay trong file.

## Quy ước commit

Dự án dùng [Conventional Commits](https://www.conventionalcommits.org/), được `commitlint` kiểm tra tự động qua Git hook.

```
<type>(<scope>): <mô tả>

type : feat | fix | chore | docs | style | refactor | perf | test | build | ci | revert
scope: api | web | shared | db | auth | catalog | cart | order | admin | infra | deps
```

## Lộ trình

| Phase | Nội dung                                           | Trạng thái |
| ----- | -------------------------------------------------- | ---------- |
| 0     | Monorepo, Docker, hàng rào chất lượng code         | ✅ xong    |
| 1     | Thiết kế database, Prisma schema, seed             | ✅ xong    |
| 2     | Kernel backend: BaseRepository, AppError, logger   | ✅ xong    |
| 3a    | Auth, refresh token rotation, RBAC                 | ✅ xong    |
| 3b    | Quên/đặt lại mật khẩu qua email, bộ test Jest      | ✅ xong    |
| 4a    | API catalog công khai, full-text search tiếng Việt | ✅ xong    |
| 4b    | CRUD admin sản phẩm/danh mục, nhật ký thao tác     | ✅ xong    |
| 4c    | Upload ảnh sản phẩm (đĩa hoặc Cloudinary)          | ✅ xong    |
| 5     | Bộ khung frontend, design tokens, i18n             | ✅ xong    |
| 6     | Hành trình khách vãng lai                          | ✅ xong    |
| 7     | Auth frontend, hợp nhất giỏ hàng, hồ sơ            | ⏳         |
| 8     | Checkout, coupon, transaction đặt hàng             | ⏳         |
| 9     | Lịch sử đơn, huỷ đơn, đánh giá                     | ⏳         |
| 10    | Khu vực Staff và Admin                             | ⏳         |
| 11    | Kiểm thử, tài liệu, CI/CD, deploy                  | ⏳         |

## Giấy phép

Dự án cá nhân phục vụ mục đích học tập và trình bày năng lực.
