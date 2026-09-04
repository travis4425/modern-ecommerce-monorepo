import { ERROR_CODES } from '@ecom/shared';
import { AppError } from '../errors';
import { imageStorageDriver } from '../../config/env';
import { createLogger } from '../logger';
import { diskImageStorage } from './disk.storage';
import { cloudinaryImageStorage } from './cloudinary.storage';

const log = createLogger('upload');

export interface SaveImageInput {
  buffer: Buffer;
  /** Phần mở rộng đã được xác nhận bằng chữ ký byte, không phải từ tên tệp gửi lên. */
  extension: string;
  mime: string;
  productId: string;
}

export interface StoredImage {
  /** URL tuyệt đối để frontend hiển thị. */
  url: string;
  /**
   * Khoá để xoá tệp sau này. Cloudinary trả public_id; chế độ đĩa dùng đường
   * dẫn tương đối so với thư mục gốc upload. Một cột, hai ý nghĩa — nhưng luôn
   * do đúng driver đã ghi nó đọc lại, nên không lẫn được.
   */
  publicId: string;
}

export interface ImageStorage {
  readonly driver: 'cloudinary' | 'disk';
  save(input: SaveImageInput): Promise<StoredImage>;
  /**
   * Xoá tệp đã lưu. KHÔNG được ném lỗi ra ngoài: xoá bản ghi trong database mới
   * là việc người dùng yêu cầu, còn tệp mồ côi trên đĩa chỉ tốn chỗ.
   */
  remove(publicId: string): Promise<void>;
}

const storage: ImageStorage =
  imageStorageDriver === 'cloudinary' ? cloudinaryImageStorage : diskImageStorage;

export function getImageStorage(): ImageStorage {
  return storage;
}

/** Gói lỗi hạ tầng lại thành 502 để error handler không coi nó là bug của mình. */
export function storageFailure(error: unknown): AppError {
  log.error({ err: error, driver: storage.driver }, 'lưu ảnh thất bại');
  return new AppError(ERROR_CODES.UPLOAD_STORAGE_FAILED, 'Image storage rejected the file', 502);
}
