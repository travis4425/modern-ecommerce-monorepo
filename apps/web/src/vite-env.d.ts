/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Gốc URL của API. Để TRỐNG ở dev — khi đó frontend gọi '/api/...' cùng
   * origin và đi qua proxy của Vite, nên không vướng CORS và cookie HTTPOnly
   * của refresh token hoạt động bình thường.
   *
   * Chỉ điền ở môi trường mà web và api nằm trên hai tên miền khác nhau.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
