/** Dữ liệu trả về từ GET /api/v1/health. */
export interface HealthCheckData {
  status: 'ok' | 'degraded';
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: {
    connected: boolean;
    /** Độ trễ truy vấn kiểm tra, tính bằng mili giây. */
    latencyMs: number | null;
    /**
     * Lý do không kết nối được, để hiển thị ngay trên giao diện khi dev.
     * Luôn là null ở production: thông báo lỗi của driver có thể chứa host,
     * tên database và tên user — không được đẩy ra ngoài.
     */
    error: string | null;
  };
  /** Số liệu catalog, chứng minh migration và seed đã chạy. Null khi mất kết nối. */
  catalog: {
    categories: number;
    products: number;
  } | null;
}
