import { ERROR_CODES, type ProductImageAdminItem } from '@ecom/shared';
import { AppError, BadRequestError, ConflictError, NotFoundError } from '../../common/errors';
import { ALLOWED_IMAGE_MIMES, detectImageType } from '../../common/upload/file-type';
import { getImageStorage, storageFailure } from '../../common/upload/image-storage';
import { recordAudit } from '../../common/services/audit-log.service';
import { env } from '../../config/env';
import { prisma } from '../../config/prisma';
import { productImageRepository } from './product-image.repository';
import {
  nextSortOrder,
  planReorder,
  primaryAfterDelete,
  shouldBecomePrimary,
} from './product-image.rules';

interface StoredRow {
  id: string;
  url: string;
  publicId: string | null;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

/** publicId là chuyện nội bộ của tầng lưu trữ, không đi ra ngoài API. */
function toItem(row: StoredRow): ProductImageAdminItem {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    sortOrder: row.sortOrder,
    isPrimary: row.isPrimary,
  };
}

async function assertProductExists(productId: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${productId} not found`);
  }
}

/**
 * Đọc nội dung tệp và kết luận kiểu ảnh.
 *
 * Đây mới là bước kiểm tra thật. fileFilter của multer chỉ nhìn Content-Type do
 * client khai — đổi được bằng một dòng lệnh — nên nó chỉ có tác dụng chặn sớm.
 */
function requireImage(file: Express.Multer.File | undefined): {
  buffer: Buffer;
  mime: string;
  extension: string;
} {
  if (!file) {
    throw new BadRequestError(
      ERROR_CODES.UPLOAD_FILE_MISSING,
      'Send the image in a multipart field named "file"',
    );
  }

  const detected = detectImageType(file.buffer);
  if (!detected) {
    throw new AppError(
      ERROR_CODES.UPLOAD_FILE_TYPE_UNSUPPORTED,
      `File content is not a supported image (${ALLOWED_IMAGE_MIMES.join(', ')})`,
      415,
    );
  }

  return { buffer: file.buffer, mime: detected.mime, extension: detected.extension };
}

export async function listImages(productId: string): Promise<ProductImageAdminItem[]> {
  await assertProductExists(productId);
  return (await productImageRepository.listByProduct(productId)).map(toItem);
}

export async function addImage(
  productId: string,
  file: Express.Multer.File | undefined,
  options: { alt?: string | null; isPrimary?: boolean },
): Promise<ProductImageAdminItem> {
  await assertProductExists(productId);
  const image = requireImage(file);

  const existing = await productImageRepository.listByProduct(productId);
  if (existing.length >= env.UPLOAD_MAX_IMAGES_PER_PRODUCT) {
    throw new ConflictError(
      ERROR_CODES.PRODUCT_IMAGE_LIMIT_REACHED,
      `A product can hold at most ${env.UPLOAD_MAX_IMAGES_PER_PRODUCT} images`,
    );
  }

  const storage = getImageStorage();
  const stored = await storage
    .save({ buffer: image.buffer, extension: image.extension, mime: image.mime, productId })
    .catch((error: unknown) => {
      throw storageFailure(error);
    });

  let created;
  try {
    created = await productImageRepository.insert({
      productId,
      url: stored.url,
      publicId: stored.publicId,
      alt: options.alt ?? null,
      sortOrder: nextSortOrder(existing),
      isPrimary: shouldBecomePrimary(existing.length, options.isPrimary),
    });
  } catch (error) {
    // Tệp đã nằm trên đĩa hoặc trên Cloudinary rồi mà bản ghi thì không ghi
    // được — dọn lại ngay, nếu không mỗi lần lỗi để lại một tệp mồ côi mà
    // không còn gì trong database trỏ tới để tìm ra nó nữa.
    await storage.remove(stored.publicId);
    throw error;
  }

  await recordAudit({
    action: 'product.image.add',
    entityType: 'product_image',
    entityId: created.id,
    after: { productId, url: created.url, isPrimary: created.isPrimary },
  });

  return toItem(created);
}

/**
 * Thay nội dung một ảnh đã có: giữ nguyên id, thứ tự và cờ đại diện, chỉ đổi tệp.
 */
export async function replaceImage(
  productId: string,
  imageId: string,
  file: Express.Multer.File | undefined,
  options: { alt?: string | null },
): Promise<ProductImageAdminItem> {
  const before = await productImageRepository.findOne(productId, imageId);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_IMAGE_NOT_FOUND, `Image ${imageId} not found`);
  }

  const image = requireImage(file);
  const storage = getImageStorage();

  const stored = await storage
    .save({ buffer: image.buffer, extension: image.extension, mime: image.mime, productId })
    .catch((error: unknown) => {
      throw storageFailure(error);
    });

  let updated;
  try {
    updated = await productImageRepository.patch(imageId, {
      url: stored.url,
      publicId: stored.publicId,
      ...(options.alt !== undefined ? { alt: options.alt } : {}),
    });
  } catch (error) {
    await storage.remove(stored.publicId);
    throw error;
  }

  // Thứ tự quan trọng: xoá tệp cũ chỉ SAU khi bản ghi đã trỏ sang tệp mới. Làm
  // ngược lại thì một lỗi ở giữa để lại bản ghi trỏ vào tệp không còn tồn tại —
  // ảnh vỡ trên giao diện, tệ hơn hẳn một tệp thừa nằm im.
  if (before.publicId) await storage.remove(before.publicId);

  await recordAudit({
    action: 'product.image.replace',
    entityType: 'product_image',
    entityId: imageId,
    before: { url: before.url },
    after: { url: updated.url },
  });

  return toItem(updated);
}

export async function updateImage(
  productId: string,
  imageId: string,
  input: { alt?: string | null; isPrimary?: boolean },
): Promise<ProductImageAdminItem> {
  const before = await productImageRepository.findOne(productId, imageId);
  if (!before) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_IMAGE_NOT_FOUND, `Image ${imageId} not found`);
  }

  let current = before;
  if (input.alt !== undefined) {
    current = await productImageRepository.patch(imageId, { alt: input.alt });
  }
  // Chỉ có đường ĐẶT làm đại diện, không có đường gỡ: gỡ cờ của ảnh duy nhất
  // đang mang nó sẽ để sản phẩm không còn ảnh đại diện nào.
  if (input.isPrimary === true && !before.isPrimary) {
    current = await productImageRepository.setPrimary(productId, imageId);
  }

  await recordAudit({
    action: 'product.image.update',
    entityType: 'product_image',
    entityId: imageId,
    before: { alt: before.alt, isPrimary: before.isPrimary },
    after: { alt: current.alt, isPrimary: current.isPrimary },
  });

  return toItem(current);
}

export async function reorderImages(
  productId: string,
  order: string[],
): Promise<ProductImageAdminItem[]> {
  await assertProductExists(productId);

  const existing = await productImageRepository.listByProduct(productId);
  const plan = planReorder(productImageRepository.toRows(existing), order);

  if (!plan.ok) {
    throw new BadRequestError(
      ERROR_CODES.PRODUCT_IMAGE_ORDER_MISMATCH,
      'The order list must contain every image id of this product exactly once',
    );
  }

  await productImageRepository.applyOrder(plan.updates);

  await recordAudit({
    action: 'product.image.reorder',
    entityType: 'product',
    entityId: productId,
    before: { order: existing.map((image) => image.id) },
    after: { order },
  });

  return (await productImageRepository.listByProduct(productId)).map(toItem);
}

export async function removeImage(productId: string, imageId: string): Promise<void> {
  const target = await productImageRepository.findOne(productId, imageId);
  if (!target) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_IMAGE_NOT_FOUND, `Image ${imageId} not found`);
  }

  await productImageRepository.deleteOne(imageId);

  // Ảnh đại diện bị xoá thì ảnh còn lại đứng đầu kế thừa, nếu không sản phẩm
  // rơi vào trạng thái có ảnh mà trang danh sách vẫn hiện ô trống.
  const remaining = await productImageRepository.listByProduct(productId);
  const heir = primaryAfterDelete(productImageRepository.toRows(remaining), target.isPrimary);
  if (heir) await productImageRepository.setPrimary(productId, heir);

  if (target.publicId) await getImageStorage().remove(target.publicId);

  await recordAudit({
    action: 'product.image.delete',
    entityType: 'product_image',
    entityId: imageId,
    before: { productId, url: target.url, isPrimary: target.isPrimary },
  });
}
