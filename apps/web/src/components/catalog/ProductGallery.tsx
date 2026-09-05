import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductImageItem } from '@ecom/shared';
import { ProductImage } from './ProductImage';

export function ProductGallery({ images, name }: { images: ProductImageItem[]; name: string }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Chỉ số có thể vượt biên khi sản phẩm bị đổi ảnh giữa chừng — kẹp lại thay
  // vì để undefined lọt xuống dưới.
  const active = images[Math.min(index, images.length - 1)];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <ProductImage
          src={active?.url ?? null}
          alt={active?.alt ?? name}
          className="aspect-square w-full"
        />
      </div>

      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((image, position) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setIndex(position)}
                aria-label={t('catalog.imageNumber', { number: position + 1 })}
                aria-current={position === index ? 'true' : undefined}
                className={`block w-full overflow-hidden rounded-control border-2 transition-colors ${
                  position === index ? 'border-brand-500' : 'border-line hover:border-brand-300'
                }`}
              >
                <ProductImage
                  src={image.url}
                  alt={image.alt ?? name}
                  className="aspect-square w-full"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
