import type { vi } from './vi';

/**
 * Hình dạng của một bộ từ điển, suy ra từ bản tiếng Việt.
 *
 * `Record<keyof Section, string>` cố ý NỚI kiểu giá trị về `string`: nếu để
 * nguyên `typeof vi` thì mỗi chuỗi mang kiểu literal của chính nó, và bản tiếng
 * Anh sẽ bị bắt phải viết y hệt tiếng Việt.
 *
 * Đổi lại, khoá vẫn bị ràng buộc chặt: thiếu khoá hay thừa khoá ở bản dịch nào
 * cũng là lỗi biên dịch. Hai bộ từ điển không thể trôi khỏi nhau.
 */
export type Dictionary = {
  [Section in keyof typeof vi]: Record<keyof (typeof vi)[Section], string>;
};
