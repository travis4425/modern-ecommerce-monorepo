# Hướng dẫn cho AI khi làm việc trên dự án này

Dự án: nền tảng E-Commerce full-stack, pnpm monorepo, React + Vite / Express + TypeScript / PostgreSQL + Prisma.

## Active Skills

| Skill                   | Dùng khi                                                      |
| ----------------------- | ------------------------------------------------------------- |
| `api-architecture`      | Thêm resource backend, quyết định logic đặt ở tầng nào        |
| `sql-schema-design`     | Thiết kế bảng, chọn kiểu dữ liệu, khoá, index, viết migration |
| `code-review-checklist` | Rà soát trước mỗi commit ở cuối phase                         |
| `skill-sync`            | Cập nhật chính file này khi tech stack thay đổi               |
| `test-suite-hygiene`    | Viết/sửa test, quyết định test sai hay code sai, gỡ test rung |

## Skill Gaps — sẽ tạo trong quá trình làm

| Skill dự kiến                  | Phase | Nội dung                                                                |
| ------------------------------ | ----- | ----------------------------------------------------------------------- |
| `ecommerce-order-transaction`  | 8, 9  | Khoá tồn kho, idempotency, rollback, hoàn kho khi huỷ đơn               |
| `jwt-refresh-rotation`         | 3     | Rotation, revoke, phát hiện tái sử dụng token, interceptor phía FE      |
| ~~`error-code-i18n-contract`~~ | 5     | ✅ Đã làm ở Phase 5 — `Record<ErrorCode, string>` bắt lỗi lúc biên dịch |
| ~~`react-i18n-setup`~~         | 5     | ✅ Đã làm ở Phase 5 — xem `apps/web/src/i18n/`                          |

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

**Frontend**

- Không có chuỗi hiển thị nào viết thẳng trong JSX. Mọi chữ đi qua `t()`, và
  `i18n/i18next.d.ts` biến khoá dịch thành KIỂU — gõ sai khoá là lỗi biên dịch.
- Bản tiếng Anh khai kiểu `Dictionary` (suy ra từ bản tiếng Việt), nên hai bộ từ
  điển không thể thiếu hoặc thừa khoá so với nhau.
- Bảng `errors` khai kiểu `Record<ErrorCode, string>`: thêm mã lỗi ở
  `packages/shared` mà quên dịch thì `pnpm typecheck` đỏ.
- Màu, bo góc, bóng đổ chỉ khai báo trong khối `@theme` của `apps/web/src/index.css`.
  Cấm mã màu thô (`#1f6f5c`, `rgb(...)`) trong component — dùng token `brand-500`,
  `ink-muted`, `line`, `rounded-card`, `shadow-card`.
- Kiểu dáng lặp lại thì tách thành component ở `components/ui/`, không sao chép
  chuỗi class Tailwind giữa các trang.
- Lỗi hiển thị cho người dùng lấy từ `useErrorMessage()`, không bao giờ lấy
  `error.message` của backend — trường đó viết cho log và có thể lộ tên bảng.

**Tệp người dùng gửi lên**

- Kiểu tệp kết luận bằng CHỮ KÝ BYTE (`common/upload/file-type.ts`), không bao giờ
  bằng `Content-Type` hay phần mở rộng do client khai — cả hai đều đổi được.
- Cho phép jpeg / png / webp / avif. KHÔNG svg (là XML, chứa được `<script>` →
  XSS lưu trữ khi phục vụ lại từ origin của mình), không gif.
- Tên tệp trên đĩa do server sinh (`randomUUID`), không lấy từ tên client gửi.
- Giữ tệp trong bộ nhớ (`multer.memoryStorage`) kèm `limits.fileSize`; không ghi
  xuống đĩa trước khi kiểm.
- Ghi tệp trước, ghi database sau — database lỗi thì XOÁ tệp vừa lưu. Khi thay
  ảnh: lưu tệp mới, cập nhật bản ghi, rồi mới xoá tệp cũ.

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
- **Không để `ORDER BY` của database quyết định thứ tự hiển thị cho người đọc.**
  Collation khác nhau giữa máy dev, image Docker (musl khác glibc) và production,
  nên cùng một endpoint trả về thứ tự khác nhau ở mỗi nơi. Sắp xếp ở tầng service
  bằng `compareForDisplay` (Intl.Collator 'vi'). ORDER BY trong SQL chỉ dùng để
  phân trang ổn định, và luôn kèm tie-breaker `id`.
- **Test không khẳng định con số lấy từ seed** (`total === 38`) và không so sánh sâu
  với mảng đã `sort()`. Khẳng định TÍNH CHẤT: tổng các tập con bằng tập cha, dãy
  không giảm, `totalPages` khớp công thức. Con số cứng sẽ vỡ ngay lần đầu seed đổi,
  và test đỏ vì lý do vô nghĩa thì sớm muộn cũng bị bỏ qua.
- **Test tích hợp dùng CHUNG một database và chạy tuần tự.** Không bao giờ lấy
  "phần tử đầu tiên" rồi giả định nó có tính chất nào đó — file test khác có thể
  vừa tạo dữ liệu mới nhất không thoả tính chất ấy. Luôn CHỌN bản ghi theo đúng
  tính chất cần kiểm.
- **Cấu hình môi trường test phải thắng file `.env`, và `.env` phải thắng biến rác
  của máy.** Thứ tự đó nằm ở `tests/helpers/setup-env.ts`; `src/config/env.ts`
  không bật override khi `NODE_ENV=test`. Sai thứ tự này đã hai lần làm cả bộ
  test chạy sai chế độ.
- **Middleware upload phải đứng TRƯỚC `validate()`.** Với request multipart, các
  trường văn bản chỉ xuất hiện trong `req.body` sau khi multer phân tích xong. Đảo
  thứ tự thì validator luôn nhìn thấy object rỗng và mọi trường optional đều biến mất.
- **Boolean từ multipart là CHUỖI.** `z.coerce.boolean()` biến `'false'` thành
  `true` vì chuỗi khác rỗng là truthy. Dùng `z.enum(['true','false']).transform(...)`.
- **`helmet()` đặt `Cross-Origin-Resource-Policy: same-origin` cho toàn ứng dụng.**
  Frontend ở cổng 5173 khác origin với API ở 8080, nên mọi thẻ `<img>` trỏ vào
  `/uploads` đều bị trình duyệt chặn cho tới khi route tĩnh tự đặt lại header này
  thành `cross-origin`. DevTools chỉ báo một dòng CORP rất dễ bỏ qua.
- **Route tĩnh phục vụ ảnh phải nằm TRƯỚC rate limiter.** Một trang danh sách kéo
  về vài chục ảnh cùng lúc; tính chúng vào hạn mức API sẽ khoá người dùng thật.
- **Route cố định phải khai báo trước route có tham số.** `/images/order` đặt sau
  `/images/:imageId` sẽ bị nuốt và trả 400 vì `order` không phải uuid. Cùng đúng
  một lỗi với `/products/brands` và `/products/:slug`.
- **Test không được chạm dịch vụ ngoài.** `setup-env.ts` xoá rỗng khoá Cloudinary
  và trỏ `UPLOAD_DIR` vào thư mục tạm; `test-environment.test.ts` khẳng định lại
  cả hai. Không có chốt này, một lần `pnpm test` trên máy có cấu hình thật sẽ rải
  ảnh rác lên tài khoản đó.
- **`count` là TỪ KHOÁ của i18next.** Nó lái việc chọn dạng số nhiều nên bắt buộc
  là `number`; truyền chuỗi đã định dạng theo locale (`'1.234'`) là lỗi kiểu. Đặt
  tên biến nội suy khác: `total`, `quantity`, `reviews`.
- **Đừng chú thích kiểu rộng cho mảng chứa khoá dịch.** `Array<{ labelKey: string }>`
  nới khoá về `string` và toàn bộ ràng buộc của `t()` biến mất đúng ở chỗ cần nhất.
  Dùng `as const satisfies ReadonlyArray<...>`.
- **Đồng bộ state từ prop thì CHỈNH TRONG LÚC RENDER, không dùng `useEffect`.**
  Mẫu đúng: giữ thêm một state `seen*` làm mốc, `if (prop !== seen) { setSeen(prop);
setState(prop) }`. Effect chạy sau khi trình duyệt đã vẽ nên giá trị cũ nhấp nháy
  một khung hình, và `react-hooks/set-state-in-effect` chặn thẳng.
- **Ghi vào `ref.current` trong lúc render cũng bị chặn** (`react-hooks/refs`). Nếu
  cần một callback ổn định trong mảng phụ thuộc thì bọc `useCallback` ở PHÍA GỌI,
  đừng lách bằng ref.
- **Bộ lọc lấy URL làm nguồn sự thật duy nhất**, không giữ state song song. Và đổi
  bộ lọc thì luôn `delete('page')` — đang ở trang 5 mà lọc lại còn 2 trang sẽ ra
  danh sách rỗng dù rõ ràng có kết quả.
- **`eslint-plugin-react-hooks` v7: chỉ nhánh `configs.flat.*` là flat config.**
  `configs['recommended-latest']` vẫn ở định dạng eslintrc (`plugins` là mảng
  chuỗi) và ESLint 9 từ chối chạy với thông báo không nói rõ nguyên nhân.
- **`NavLink` tới `/` phải có `end`.** Không có nó, React Router coi `/` là tiền
  tố của mọi đường dẫn nên liên kết Trang chủ sáng ở khắp nơi.
- **Route `*` phải là phần tử CUỐI trong mảng `children`.** Nó khớp mọi đường
  dẫn; đặt sớm hơn thì các route thật phía sau không bao giờ tới lượt.
- **Không tự đặt `Content-Type` khi gửi `FormData`.** Trình duyệt phải tự sinh
  header đó kèm chuỗi boundary; đặt tay là hỏng toàn bộ phần multipart.
- **`import './i18n'` phải đứng trước `App` trong `main.tsx`.** Component đầu
  tiên gọi `useTranslation()` cần instance đã init, nếu không lần render đầu
  hiện khoá dịch thay vì bản dịch.
- **Logger phải tắt transport ở môi trường test.** `enabled: false` của pino không
  chặn được `pino-pretty` vì transport chạy ở worker thread riêng — output test sẽ
  dài hàng nghìn dòng và nhấn chìm tên test hỏng.

## Cảnh báo bảo mật phải không có báo động giả

Log ở mức `error` gắn với sự cố bảo mật (ví dụ "PHÁT HIỆN DÙNG LẠI REFRESH TOKEN")
chỉ được bắn khi thật sự có dấu hiệu tấn công. Một lần đăng xuất bình thường, một
lần đặt lại mật khẩu, hay một tab cũ gọi lại API — đều KHÔNG được kích hoạt chúng.

Cảnh báo kêu sai nhiều lần thì đến lúc kêu đúng cũng không ai còn để ý. Khi thêm
một cảnh báo mới, luôn tự hỏi: đường đi bình thường nào có thể chạm vào nó?

## Quy trình làm việc

Làm từng phase một. Kết thúc mỗi phase thì dừng lại, báo cáo, chờ người dùng kiểm tra trên localhost, chụp ảnh màn hình và commit. Chỉ đi tiếp khi người dùng xác nhận.

Trước khi commit, chạy **một lệnh duy nhất**:

```
pnpm verify        # lint + prettier + typecheck + build + test unit  (không cần database)
pnpm verify:full   # thêm test tích hợp                              (cần Postgres đang chạy)
```

Commit theo Conventional Commits, có `commitlint` kiểm tra qua Git hook.
