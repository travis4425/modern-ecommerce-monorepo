import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '../../config/env';
import { createLogger } from '../logger';
import type { ImageStorage, SaveImageInput, StoredImage } from './image-storage';

const log = createLogger('upload:cloudinary');

let configured = false;

/**
 * Cấu hình SDK LƯỜI, đúng lần đầu dùng tới.
 *
 * Module này vẫn được import ở chế độ đĩa (bộ chọn driver nằm trong
 * image-storage.ts, và import là tĩnh). Nếu gọi cloudinary.config() ngay ở thân
 * module thì mọi người chạy dự án mà không có tài khoản Cloudinary sẽ nhận một
 * SDK được cấu hình bằng undefined — im lặng cho tới lúc phát nổ ở chỗ khác.
 */
function ensureConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export const cloudinaryImageStorage: ImageStorage = {
  driver: 'cloudinary',

  async save({ buffer, productId }: SaveImageInput): Promise<StoredImage> {
    ensureConfigured();

    const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.CLOUDINARY_FOLDER}/${productId}`,
          resource_type: 'image',
          // Chặn ở phía Cloudinary một lần nữa. Kiểm tra chữ ký byte của chúng
          // ta đã chạy trước đó rồi, nhưng hai lớp thì rẻ.
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
        },
        (error, result) => {
          if (error || !result) {
            reject(error instanceof Error ? error : new Error('Cloudinary upload failed'));
            return;
          }
          resolve(result);
        },
      );
      stream.end(buffer);
    });

    return { url: uploaded.secure_url, publicId: uploaded.public_id };
  },

  async remove(publicId: string): Promise<void> {
    ensureConfigured();
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      log.warn({ err: error, publicId }, 'không xoá được ảnh trên Cloudinary');
    }
  },
};
