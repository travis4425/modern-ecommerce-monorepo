-- ═══════════════════════════════════════════════════════════════════════════
--  Phase 4a — Tìm kiếm toàn văn tiếng Việt, và email không phân biệt hoa thường
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Email: chuyển sang citext ──────────────────────────────────────────
--
-- Thay cho unique index trên lower(email) ở migration trước. Lý do đổi:
-- Prisma không diễn đạt được index trên biểu thức trong schema.prisma, nên
-- `migrate dev` sau này sẽ coi nó là drift và muốn xoá đi. Kiểu citext thì
-- khai báo được bằng @db.Citext, nên schema và database luôn khớp nhau.
--
-- Sau khi đổi kiểu, chính unique index `users_email_key` do Prisma sinh ra đã
-- chặn được 'Travis@Example.com' trùng với 'travis@example.com', và truy vấn
-- đăng nhập vẫn dùng đúng index đó (đã kiểm bằng EXPLAIN).
CREATE EXTENSION IF NOT EXISTS citext;

DROP INDEX IF EXISTS "users_email_lower_key";
ALTER TABLE "users" ALTER COLUMN "email" TYPE citext;

-- ── 2. Tìm kiếm không dấu ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() không phải hàm IMMUTABLE vì nó phụ thuộc từ điển có thể thay đổi,
-- nên Postgres từ chối dùng nó trong cột generated. Bọc lại và chỉ định rõ từ
-- điển để hành vi cố định, khi đó khai báo IMMUTABLE là hợp lệ.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

-- Cột generated: Postgres tự cập nhật mỗi khi name/brand/sku/mô tả đổi. Không
-- cần trigger, không cần nhớ gọi hàm cập nhật ở tầng ứng dụng — nghĩa là không
-- bao giờ có chuyện chỉ mục lệch với dữ liệu.
--
-- Dùng cấu hình 'simple' chứ không phải 'english': tiếng Việt không có bộ
-- stemmer trong Postgres, và stemmer tiếng Anh sẽ cắt sai từ tiếng Việt.
--
-- setweight xếp hạng độ quan trọng: khớp ở TÊN (A) phải xếp trên khớp ở MÔ TẢ (C).
ALTER TABLE "products" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', immutable_unaccent(coalesce("name", ''))), 'A') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce("brand", ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce("sku", ''))), 'B') ||
    setweight(to_tsvector('simple', immutable_unaccent(coalesce("short_description", ''))), 'C')
  ) STORED;

CREATE INDEX "products_search_vector_idx" ON "products" USING GIN ("search_vector");
