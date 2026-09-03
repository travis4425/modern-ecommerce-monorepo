# Hướng dẫn cho AI khi làm việc trên dự án này

Dự án: nền tảng E-Commerce full-stack, pnpm monorepo, React + Vite / Express + TypeScript / PostgreSQL + Prisma.

## Active Skills

| Skill                   | Dùng khi                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `api-architecture`      | Thêm resource backend, quyết định logic đặt ở tầng nào        |
| `sql-schema-design`     | Thiết kế bảng, chọn kiểu dữ liệu, khoá, index, viết migration |
| `code-review-checklist` | Rà soát trước mỗi commit ở cuối phase                         |
| `skill-sync`            | Cập nhật chính file này khi tech stack thay đổi               |

## Skill Gaps — sẽ tạo trong quá trình làm

| Skill dự kiến                 | Phase | Nội dung                                                           |
| ----------------------------- | ----- | ------------------------------------------------------------------ |
| `ecommerce-order-transaction` | 8, 9  | Khoá tồn kho, idempotency, rollback, hoàn kho khi huỷ đơn          |
| `jwt-refresh-rotation`        | 3     | Rotation, revoke, phát hiện tái sử dụng token, interceptor phía FE |
| `error-code-i18n-contract`    | 2, 5  | Hợp đồng mã lỗi giữa backend và bảng dịch frontend                 |
| `react-i18n-setup`            | 5     | Dựng react-i18next, tách namespace, chặn hardcode chuỗi            |

---

## Quy chuẩn bất biến

Những điều dưới đây đã chốt. Không sửa nếu không có lý do rõ ràng và không thông báo trước.

**Phân tầng backend — một chiều, không đi tắt**

```
routes → controller → service → repository → database
```

- Controller không chứa nghiệp vụ và không truy vấn database.
- Service không bao giờ đọc `req` / `res` / `headers`.
- Repository là nơi duy nhất chạm vào database.
- Mỗi nghiệp vụ nằm trong `src/domains/<tên>/` với đủ bộ `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `*.types.ts`.

**Dữ liệu**

- Mọi cột tiền: `Decimal(12,2)` trong Prisma → `NUMERIC` trong Postgres. Cấm `Float`.
- Mọi cột thời gian: `TIMESTAMPTZ`, lưu UTC. Chỉ đổi múi giờ ở tầng hiển thị.
- Soft delete bằng `deleted_at TIMESTAMPTZ NULL` trên users, products, categories, orders, reviews.
- Trừ tồn kho phải dùng `UPDATE ... WHERE quantity >= n` kèm kiểm `rowCount`, trong transaction có `SELECT ... FOR UPDATE`. Transaction thôi là chưa đủ để chống oversell.

**API**

- Mọi route nằm dưới `/api/v1` (hằng số `API_PREFIX` trong `@ecom/shared`).
- Response luôn theo envelope `{ success, data, meta?, error? }` — kiểu định nghĩa ở `packages/shared/src/types/api.ts`.
- Backend không trả message đã dịch. Trả `error.code` ổn định, frontend tra bảng i18n.
- Phân trang offset-based: `?page=&limit=&sort=`, trả `meta`.
- Endpoint tạo đơn nhận header `Idempotency-Key`.

**Code**

- `strict: true`, không dùng `any`. Không rõ kiểu thì dùng `unknown` rồi thu hẹp.
- Không viết `process.env` ngoài `src/config/env.ts`.
- Không `console.log` trong mã nghiệp vụ — dùng logger (có từ Phase 2).
- Validate ở tầng route bằng Zod. Service được quyền tin rằng input đã sạch.
- Kiểu và schema dùng chung đặt ở `packages/shared`, không khai báo lặp hai đầu.
- Không ném chuỗi hay object trần. Luôn ném lớp kế thừa `AppError`.

## Thêm một resource mới — theo đúng thứ tự này

Kernel ở `src/common/` đã lo phần lặp lại. Một resource mới chỉ cần sáu file trong
`src/domains/<tên>/`, viết theo thứ tự:

1. `*.types.ts` — hình dạng dữ liệu repository trả về và DTO của request. Đây là hợp
   đồng, viết trước tiên. Dùng kiểu của chúng ta, không dùng kiểu model sinh tự động
   của Prisma, để tầng trên không phụ thuộc vào cột mà truy vấn không hề lấy về.
2. `*.repository.ts` — kế thừa `BaseRepository`, một lần ép kiểu delegate ở constructor.
   Chỉ chứa truy vấn, không chứa nghiệp vụ.
3. `*.service.ts` — toàn bộ business logic. Không chạm `req`/`res`. Ném `AppError`.
4. `*.controller.ts` — đọc request đã validate, gọi đúng một service, gọi `sendSuccess`.
5. `*.validator.ts` — schema Zod cho body/query/params.
6. `*.routes.ts` — nối `validate(...)` + `asyncHandler(controller)`.

Rồi đăng ký router trong `app.ts` và bổ sung endpoint vào `src/docs/openapi.ts`.

Mã lỗi mới phải thêm vào `packages/shared/src/constants/error-codes.ts` TRƯỚC khi dùng.

## Bẫy đã gặp, đừng lặp lại

- **Prisma 7 không tự chạy seed** sau `migrate dev` hay `migrate reset`. Mọi script
  reset phải nối `&& prisma db seed` tường minh, nếu không database sẽ rỗng mà
  không có thông báo lỗi nào.
- **Không dùng TLD `.local` / `.test` / `.localhost`** cho email: pgAdmin và phần
  lớn dịch vụ SMTP từ chối. Dùng `@example.com` (RFC 2606).
- **`dotenv` không ghi đè biến môi trường đã tồn tại.** Ở dev phải bật `override`,
  nếu không một `DATABASE_URL` sót lại ở cấp máy sẽ âm thầm chiếm chỗ.
- **`z.coerce.boolean()` coi chuỗi `'false'` là `true`.** Tham số boolean trên query
  string phải dùng `z.enum(['true','false'])` rồi transform.

## Cảnh báo bảo mật phải không có báo động giả

Log ở mức `error` gắn với sự cố bảo mật (ví dụ "PHÁT HIỆN DÙNG LẠI REFRESH TOKEN")
chỉ được bắn khi thật sự có dấu hiệu tấn công. Một lần đăng xuất bình thường, một
lần đặt lại mật khẩu, hay một tab cũ gọi lại API — đều KHÔNG được kích hoạt chúng.

Cảnh báo kêu sai nhiều lần thì đến lúc kêu đúng cũng không ai còn để ý. Khi thêm
một cảnh báo mới, luôn tự hỏi: đường đi bình thường nào có thể chạm vào nó?

## Quy trình làm việc

Làm từng phase một. Kết thúc mỗi phase thì dừng lại, báo cáo, chờ người dùng kiểm tra trên localhost, chụp ảnh màn hình và commit. Chỉ đi tiếp khi người dùng xác nhận.

Commit theo Conventional Commits, có `commitlint` kiểm tra qua Git hook.
