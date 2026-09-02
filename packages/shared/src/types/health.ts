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
     * Lý do không kết nối được, chỉ lộ ra ở môi trường ngoài production.
     * Ở production luôn là null để không rò rỉ chi tiết hạ tầng.
     */
    error: string | null;
  };
}
