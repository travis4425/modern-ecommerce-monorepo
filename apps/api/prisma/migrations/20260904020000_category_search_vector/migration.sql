-- Cho phép tìm sản phẩm theo TÊN DANH MỤC.
--
-- Vấn đề: search_vector của products chỉ lấy từ tên, thương hiệu, SKU và mô tả
-- ngắn của chính sản phẩm. Nhưng tên sản phẩm thật toàn là mã model — "Akko
-- 3068B Plus World Tour Tokyo", "Keychron K8 Pro". Không sản phẩm nào chứa chữ
-- "bàn phím", nên khách gõ "ban phim" nhận về con số không.
--
-- Cột generated không tham chiếu được sang bảng khác, nên không thể nhét tên
-- danh mục vào search_vector của products. Cách làm: danh mục có search_vector
-- riêng, và truy vấn tìm trên CẢ HAI bằng OR.
--
-- Xếp hạng vẫn đúng thứ tự ưu tiên: khớp tên sản phẩm nhân hệ số 1, khớp tên
-- danh mục nhân 0.5 — nên gõ "akko" thì Akko đứng trên, không bị chìm dưới cả
-- một danh mục.
ALTER TABLE "categories" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', immutable_unaccent(coalesce("name", '')))) STORED;

CREATE INDEX "categories_search_vector_idx" ON "categories" USING GIN ("search_vector");
