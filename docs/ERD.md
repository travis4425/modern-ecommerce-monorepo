# Sơ đồ quan hệ thực thể (ERD)

23 bảng, chia thành sáu nhóm. Ký hiệu: `PK` khoá chính, `FK` khoá ngoại, `U` unique, `IX` index, `SD` có soft delete.

## 1. Phân quyền

```
roles                       permissions
├─ id            PK U       ├─ id             PK
├─ name          U          ├─ code           U   'order:update_status'
└─ description              └─ description
        │                            │
        └────────┐          ┌────────┘
                 ▼          ▼
          role_permissions
          ├─ role_id        FK → roles(id)        ON DELETE CASCADE
          ├─ permission_id  FK → permissions(id)  ON DELETE CASCADE
          └─ PRIMARY KEY (role_id, permission_id)
```

Middleware `checkPermission('order:update_status')` đọc qua chuỗi này, không chỉ so tên role.

## 2. Người dùng & phiên đăng nhập

```
users                                   SD
├─ id                PK
├─ email             U   IX
├─ password_hash         bcrypt cost 12
├─ role_id           FK → roles(id)  ON DELETE RESTRICT
├─ is_active             khoá tài khoản
└─ deleted_at        IX
     │
     ├──< refresh_tokens      token_hash U, family_id IX, expires_at IX
     ├──< password_reset_tokens
     └──< addresses           IX(user_id)
```

`refresh_tokens.family_id` nối mọi token sinh ra từ cùng một lần đăng nhập. Dùng lại token đã thu hồi ⇒ revoke cả family. Đó là cơ chế phát hiện token bị đánh cắp.

## 3. Catalog

```
categories                  SD          products                              SD
├─ id            PK                     ├─ id                PK
├─ parent_id     FK → categories(id)    ├─ category_id       FK → categories(id) RESTRICT
│                   RESTRICT (cây 2 cấp)├─ sku               U
├─ slug          U                      ├─ slug              U
└─ sort_order    IX                     ├─ price             numeric(12,2)
                                        ├─ compare_at_price  numeric(12,2) NULL
                                        ├─ rating_average    numeric(3,2)   ← cache
                                        ├─ review_count      int            ← cache
                                        └─ IX(category_id), IX(is_active, created_at DESC),
                                           IX(is_featured), IX(price), IX(deleted_at)
     │
     ├──< product_images      IX(product_id, sort_order), public_id ← Cloudinary
     ├──< product_attributes  U(product_id, name)   thông số kỹ thuật key-value
     └──1 inventory           U(product_id)
```

`rating_average` và `review_count` là denormalize có chủ đích: nếu không cache, mọi trang danh sách sản phẩm đều phải chạy aggregate trên bảng reviews. Được cập nhật trong cùng transaction với thao tác review ở Phase 9.

## 4. Tồn kho

```
inventory                          inventory_movements
├─ product_id  U FK CASCADE        ├─ product_id  FK CASCADE
├─ quantity                        ├─ type        PURCHASE_IN | SALE_OUT
├─ reserved_quantity               │              ORDER_CANCELLED | MANUAL_ADJUST
└─ low_stock_threshold             ├─ quantity_change   âm khi xuất, dương khi nhập
                                   ├─ quantity_after    tồn sau thao tác
                                   ├─ order_id    FK → orders(id) SET NULL
                                   ├─ actor_id    FK → users(id)  SET NULL
                                   └─ IX(product_id, created_at DESC), IX(order_id), IX(actor_id)
```

Sổ cái này khiến câu hỏi "vì sao kho còn từng này" luôn có câu trả lời, không phải đoán.

## 5. Giỏ hàng & đơn hàng

```
carts                     orders                                        SD
├─ user_id  U FK CASCADE  ├─ id                PK
     │                    ├─ order_number      U   ORD-20260902-0001
     └──< cart_items      ├─ user_id           FK → users(id)   RESTRICT
        U(cart_id,        ├─ status            PENDING → PROCESSING → SHIPPED
          product_id)     │                    → DELIVERED | CANCELLED | RETURNED
                          ├─ coupon_id         FK → coupons(id) RESTRICT   IX
                          ├─ subtotal / discount_amount / shipping_fee / total_amount
                          │                    tất cả numeric(12,2)
                          ├─ recipient_name, phone, province, district, ward, street_address
                          │                    ← CHỤP LẠI, không phải FK tới addresses
                          ├─ placed_at / processed_at / shipped_at / delivered_at / cancelled_at
                          └─ IX(user_id, created_at DESC), IX(status, created_at DESC)
     │
     ├──< order_items   U(order_id, product_id)   product_id FK RESTRICT
     │       product_name, product_sku, product_image_url, unit_price ← ĐỀU CHỤP LẠI
     ├──1 payments      U(order_id), transaction_ref U, gateway_payload jsonb
     └──1 coupon_redemptions  U(order_id)
```

Hai chỗ chụp lại dữ liệu (địa chỉ giao hàng và thông tin sản phẩm) là cố ý: đơn hàng là chứng từ. Khách sửa địa chỉ hay shop đổi giá về sau đều không được làm thay đổi đơn cũ.

`order_items.product_id` dùng `RESTRICT` chứ không `CASCADE`: sản phẩm chỉ được xoá mềm, và không bao giờ được phép làm bốc hơi lịch sử mua hàng.

## 6. Khuyến mãi, đánh giá, vận hành

```
coupons                              coupon_redemptions
├─ code           U                  ├─ coupon_id  FK RESTRICT
├─ type           PERCENT | FIXED    ├─ user_id    FK RESTRICT
├─ value          numeric(12,2)      ├─ order_id   U FK CASCADE
├─ min_order_amount                  ├─ discount_amount
├─ max_discount_amount   trần cho %  └─ IX(coupon_id, user_id)  ← kiểm per_user_limit
├─ usage_limit / used_count / per_user_limit
└─ IX(is_active, starts_at, expires_at)

reviews                                     SD
├─ U(user_id, product_id, order_id)   ← mỗi đơn được đánh giá một lần cho mỗi sản phẩm
├─ rating  1..5                          (mua lại lần sau thì được đánh giá tiếp)
└─ IX(product_id, created_at DESC)

audit_logs                           idempotency_keys
├─ actor_id   FK SET NULL            ├─ key      U
├─ actor_email   ← chụp lại          ├─ user_id  FK CASCADE
├─ action, entity_type, entity_id    ├─ request_hash
├─ before / after   jsonb            ├─ response_status / response_body
└─ IX(entity_type, entity_id)        └─ IX(expires_at)   ← dọn định kỳ
```

Điều kiện "chỉ đánh giá khi đơn đã DELIVERED" không thể diễn đạt bằng ràng buộc SQL nên do tầng service kiểm (Phase 9). Ràng buộc unique ở đây chặn phần còn lại.

## Quy ước chung

| Chủ đề      | Quy tắc                                                                   |
| ----------- | ------------------------------------------------------------------------- |
| Khoá chính  | UUID, không dùng số tự tăng — không lộ quy mô kinh doanh qua URL          |
| Tiền        | `numeric(12,2)`, chứa tối đa 9.999.999.999,99đ. Tuyệt đối không `float`   |
| Thời gian   | `timestamptz(6)`, lưu UTC, đổi múi giờ ở tầng hiển thị                    |
| Soft delete | `deleted_at` trên users, categories, products, orders, reviews, addresses |
| Khoá ngoại  | Luôn khai báo `ON DELETE` tường minh, luôn có index                       |
| Đặt tên     | Bảng số nhiều snake_case, khoá ngoại `<bảng số ít>_id`                    |

## Chỉ mục full-text search

Cột `tsvector` và index GIN cho tìm kiếm tiếng Việt **chưa được thêm ở Phase 1**. Chúng sẽ đi cùng migration riêng ở Phase 4, khi đã có câu truy vấn thật để chứng minh index phục vụ cái gì — thêm index trước khi biết nó phục vụ query nào là thêm chi phí ghi mà không có lợi ích đọc.
