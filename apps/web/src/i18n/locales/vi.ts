import { ERROR_CODES, type ErrorCode } from '@ecom/shared';

/**
 * Bảng dịch mã lỗi của backend.
 *
 * Kiểu `Record<ErrorCode, string>` là một HỢP ĐỒNG có hiệu lực lúc biên dịch:
 * thêm một mã lỗi mới vào packages/shared mà quên dịch thì `pnpm typecheck` đỏ
 * ngay, không phải đợi người dùng nhìn thấy chuỗi "PRODUCT_NOT_FOUND" giữa giao
 * diện tiếng Việt.
 *
 * Backend cố ý KHÔNG trả câu chữ đã dịch — nó trả mã ổn định, frontend tra bảng
 * này. Nhờ vậy đổi cách diễn đạt không cần đụng tới backend, và cùng một mã lỗi
 * hiển thị đúng ngôn ngữ mà người dùng đang chọn.
 */
const errors: Record<ErrorCode, string> = {
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Máy chủ gặp sự cố. Vui lòng thử lại sau.',
  [ERROR_CODES.VALIDATION_FAILED]: 'Dữ liệu gửi lên không hợp lệ.',
  [ERROR_CODES.MALFORMED_JSON]: 'Nội dung gửi lên không đúng định dạng.',
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 'Nội dung gửi lên quá lớn.',
  [ERROR_CODES.ROUTE_NOT_FOUND]: 'Không tìm thấy đường dẫn này trên máy chủ.',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'Không tìm thấy dữ liệu bạn yêu cầu.',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại nhé.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Dịch vụ đang tạm gián đoạn. Vui lòng thử lại sau.',
  [ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION]: 'Giá trị này đã tồn tại trong hệ thống.',
  [ERROR_CODES.FOREIGN_KEY_CONSTRAINT_VIOLATION]:
    'Dữ liệu đang được nơi khác tham chiếu, không thể thực hiện thao tác này.',

  [ERROR_CODES.AUTH_EMAIL_ALREADY_EXISTS]: 'Email này đã được đăng ký.',
  [ERROR_CODES.AUTH_INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không đúng.',
  [ERROR_CODES.AUTH_ACCOUNT_DISABLED]: 'Tài khoản đã bị khoá.',
  [ERROR_CODES.AUTH_TOKEN_MISSING]: 'Bạn cần đăng nhập để tiếp tục.',
  [ERROR_CODES.AUTH_TOKEN_INVALID]: 'Phiên đăng nhập không hợp lệ.',
  [ERROR_CODES.AUTH_TOKEN_EXPIRED]: 'Phiên đăng nhập đã hết hạn.',
  [ERROR_CODES.AUTH_REFRESH_TOKEN_MISSING]: 'Không tìm thấy phiên đăng nhập.',
  [ERROR_CODES.AUTH_REFRESH_TOKEN_INVALID]: 'Phiên đăng nhập không còn hiệu lực.',
  [ERROR_CODES.AUTH_REFRESH_TOKEN_EXPIRED]: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
  [ERROR_CODES.AUTH_REFRESH_TOKEN_REUSED]:
    'Vì lý do an toàn, mọi phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.',
  [ERROR_CODES.AUTH_RESET_TOKEN_INVALID]: 'Liên kết đặt lại mật khẩu không hợp lệ.',
  [ERROR_CODES.AUTH_RESET_TOKEN_EXPIRED]: 'Liên kết đặt lại mật khẩu đã hết hạn.',
  [ERROR_CODES.AUTH_INSUFFICIENT_PERMISSION]: 'Bạn không có quyền thực hiện thao tác này.',

  [ERROR_CODES.CATEGORY_NOT_FOUND]: 'Không tìm thấy danh mục.',
  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Không tìm thấy sản phẩm.',
  [ERROR_CODES.CATEGORY_DEPTH_EXCEEDED]: 'Cây danh mục chỉ có hai cấp.',
  [ERROR_CODES.CATEGORY_HAS_CHILDREN]: 'Danh mục còn danh mục con, không xoá được.',
  [ERROR_CODES.CATEGORY_HAS_PRODUCTS]: 'Danh mục còn sản phẩm, không xoá được.',
  [ERROR_CODES.CATEGORY_NOT_LEAF]: 'Chỉ được gán sản phẩm vào danh mục cuối.',
  [ERROR_CODES.PRODUCT_SKU_EXISTS]: 'Mã SKU này đã được dùng.',

  [ERROR_CODES.UPLOAD_FILE_MISSING]: 'Chưa chọn tệp nào.',
  [ERROR_CODES.UPLOAD_FILE_TOO_LARGE]: 'Tệp vượt quá dung lượng cho phép.',
  [ERROR_CODES.UPLOAD_FILE_TYPE_UNSUPPORTED]: 'Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF.',
  [ERROR_CODES.UPLOAD_TOO_MANY_FILES]: 'Mỗi lần chỉ gửi được một tệp.',
  [ERROR_CODES.UPLOAD_STORAGE_FAILED]: 'Lưu ảnh thất bại. Vui lòng thử lại.',
  [ERROR_CODES.PRODUCT_IMAGE_NOT_FOUND]: 'Không tìm thấy ảnh.',
  [ERROR_CODES.PRODUCT_IMAGE_LIMIT_REACHED]: 'Sản phẩm đã đạt số ảnh tối đa.',
  [ERROR_CODES.PRODUCT_IMAGE_ORDER_MISMATCH]: 'Danh sách sắp xếp không khớp với ảnh hiện có.',
};

export const vi = {
  common: {
    appName: 'E-Commerce',
    tagline: 'Bàn phím, chuột và phụ kiện cho góc làm việc của bạn',
    loading: 'Đang tải…',
    retry: 'Thử lại',
    language: 'Ngôn ngữ',
    skipToContent: 'Bỏ qua, tới nội dung chính',
    unreachable: 'Không kết nối được máy chủ.',
  },
  nav: {
    home: 'Trang chủ',
    system: 'Tình trạng hệ thống',
  },
  home: {
    eyebrow: 'Phase 5 · Bộ khung giao diện',
    title: 'Nền tảng thương mại điện tử',
    subtitle:
      'Bộ khung đã dựng xong: định tuyến, design token, song ngữ và lớp gọi API. Danh sách sản phẩm thật sẽ lên ở phase kế tiếp.',
    ctaPrimary: 'Xem tình trạng hệ thống',
    ctaSecondary: 'Tài liệu API',
    featuresTitle: 'Đã có trong bộ khung',
    featureRouterTitle: 'Định tuyến',
    featureRouterBody: 'React Router với bố cục chung, trang 404 và ranh giới lỗi riêng.',
    featureTokensTitle: 'Design token',
    featureTokensBody: 'Màu, bo góc và bóng đổ khai báo một lần trong @theme của Tailwind v4.',
    featureI18nTitle: 'Song ngữ',
    featureI18nBody: 'Tiếng Việt và tiếng Anh, đổi ngay trên header, ghi nhớ lựa chọn.',
    featureQueryTitle: 'Tầng dữ liệu',
    featureQueryBody: 'TanStack Query kèm lớp gọi API dịch mã lỗi của backend sang tiếng người.',
  },
  system: {
    eyebrow: 'Chẩn đoán',
    title: 'Tình trạng hệ thống',
    subtitle: 'Trang này kiểm tra từng mắt xích, từ trình duyệt xuống tới cơ sở dữ liệu.',
    frontend: 'Frontend',
    backend: 'Backend API',
    database: 'PostgreSQL',
    seed: 'Dữ liệu mẫu',
    sharedTypes: 'Kiểu dùng chung',
    checking: 'đang kiểm tra…',
    notConnected: 'chưa kết nối',
    notSeeded: 'chưa seed',
    catalogSummary: '{{categories}} danh mục · {{products}} sản phẩm',
    latency: '{{ms}} ms',
    hint: 'Chưa gọi được API. Kiểm tra xem `pnpm dev` đã chạy chưa.',
    diagnosticTitle: 'Lý do PostgreSQL báo đỏ',
    diagnosticHint: 'Chạy `docker compose ps` để xem container, và `pnpm db:up` nếu nó chưa chạy.',
  },
  notFound: {
    code: '404',
    title: 'Không có trang này',
    body: 'Đường dẫn bạn mở không tồn tại, hoặc nội dung đã được chuyển đi.',
    back: 'Về trang chủ',
  },
  errorBoundary: {
    title: 'Có gì đó hỏng rồi',
    body: 'Giao diện gặp lỗi ngoài dự tính. Tải lại trang thường là đủ.',
    reload: 'Tải lại trang',
  },
  errors,
} as const;
