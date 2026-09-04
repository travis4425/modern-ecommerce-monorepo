import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env';
import { createLogger } from '../logger';
import type { ImageStorage, SaveImageInput, StoredImage } from './image-storage';

const log = createLogger('upload:disk');

/**
 * Thư mục gốc chứa ảnh. Chấp nhận cả đường dẫn tương đối (tính từ thư mục làm
 * việc của tiến trình, tức apps/api khi chạy `pnpm dev`) lẫn tuyệt đối — bộ
 * test trỏ vào thư mục tạm của hệ điều hành để không rải tệp vào cây mã nguồn.
 */
export const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

/** Đường dẫn URL mà API phục vụ thư mục trên. Dùng chung với app.ts. */
export const uploadUrlPath = '/uploads';

/**
 * Lưu ảnh vào đĩa cục bộ. Đây là chế độ mặc định để dự án chạy được ngay sau khi
 * clone, KHÔNG phải chế độ dành cho production: máy chủ ở production thường có
 * đĩa tạm (Render, Heroku, container) nên tệp biến mất sau mỗi lần deploy.
 */
export const diskImageStorage: ImageStorage = {
  driver: 'disk',

  async save({ buffer, extension, productId }: SaveImageInput): Promise<StoredImage> {
    // Tên tệp do SERVER sinh, không lấy từ tên client gửi lên: tên gốc có thể
    // chứa '../', ký tự điều khiển, hoặc trùng với tệp đã có.
    const relative = path.posix.join('products', productId, `${randomUUID()}.${extension}`);
    const absolute = path.join(uploadRoot, relative);

    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);

    return {
      url: `${env.API_PUBLIC_URL}${uploadUrlPath}/${relative}`,
      publicId: relative,
    };
  },

  async remove(publicId: string): Promise<void> {
    const absolute = path.resolve(uploadRoot, publicId);

    // publicId đến từ database của chính chúng ta, nhưng vẫn chặn: một ngày nào
    // đó có người viết script sửa tay bảng product_images, và fs.unlink không
    // hỏi lại lần thứ hai.
    if (absolute !== uploadRoot && !absolute.startsWith(uploadRoot + path.sep)) {
      log.error({ publicId }, 'từ chối xoá tệp nằm ngoài thư mục upload');
      return;
    }

    try {
      await fs.unlink(absolute);
    } catch (error) {
      // Tệp đã biến mất là kết quả mong muốn, không phải sự cố.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warn({ err: error, publicId }, 'không xoá được tệp ảnh');
      }
    }
  },
};
