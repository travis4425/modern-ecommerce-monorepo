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

## Quy trình làm việc

Làm từng phase một. Kết thúc mỗi phase thì dừng lại, báo cáo, chờ người dùng kiểm tra trên localhost, chụp ảnh màn hình và commit. Chỉ đi tiếp khi người dùng xác nhận.

Commit theo Conventional Commits, có `commitlint` kiểm tra qua Git hook.
