import { buildPaginationMeta, resolvePagination } from '../http/pagination';
import type { PaginationMeta } from '@ecom/shared';

export type QueryArgs = Record<string, unknown>;
export type WhereInput = Record<string, unknown>;
export type OrderByInput = Record<string, 'asc' | 'desc'>;

/**
 * Hình dạng tối thiểu của một Prisma model delegate mà BaseRepository cần.
 *
 * Ta mô tả bằng cấu trúc thay vì dùng kiểu sinh tự động của Prisma. Kiểu thật
 * của delegate là một khối overload rất phức tạp, và nó nằm ở thư mục sinh tự
 * động vốn có thể chưa tồn tại lúc kiểm kiểu lần đầu. Đổi lại một lần ép kiểu
 * duy nhất ở constructor của lớp con, ta có một lớp cơ sở gọn và ổn định.
 */
export interface PrismaDelegateLike<TRow> {
  findFirst(args?: QueryArgs): Promise<TRow | null>;
  findMany(args?: QueryArgs): Promise<TRow[]>;
  count(args?: QueryArgs): Promise<number>;
  create(args: QueryArgs): Promise<TRow>;
  update(args: QueryArgs): Promise<TRow>;
  delete(args: QueryArgs): Promise<TRow>;
}

export interface PaginateParams {
  page?: number;
  limit?: number;
  where?: WhereInput;
  orderBy?: OrderByInput;
  select?: QueryArgs;
  include?: QueryArgs;
}

export interface PaginatedResult<TRow> {
  items: TRow[];
  meta: PaginationMeta;
}

export interface BaseRepositoryConfig {
  /**
   * Bảng có cột `deleted_at` hay không. Khi bật, MỌI truy vấn đọc của lớp cơ sở
   * tự động thêm điều kiện `deletedAt: null`, và `remove()` chuyển thành cập
   * nhật thay vì xoá cứng.
   */
  softDelete: boolean;
}

/**
 * Lớp cơ sở cho mọi repository.
 *
 * Chỉ chứa những thao tác thật sự lặp lại ở mọi bảng. Truy vấn đặc thù của một
 * nghiệp vụ thì viết thẳng trong repository con — cố nhồi mọi thứ vào đây sẽ
 * đẻ ra một lớp vạn năng mà không ai đọc nổi.
 */
export abstract class BaseRepository<TRow> {
  protected constructor(
    protected readonly delegate: PrismaDelegateLike<TRow>,
    protected readonly config: BaseRepositoryConfig,
  ) {}

  /** Thêm điều kiện loại bỏ bản ghi đã xoá mềm. */
  protected activeOnly(where: WhereInput = {}): WhereInput {
    return this.config.softDelete ? { ...where, deletedAt: null } : where;
  }

  async findById(id: string, args: QueryArgs = {}): Promise<TRow | null> {
    return this.delegate.findFirst({ ...args, where: this.activeOnly({ id }) });
  }

  async findOne(where: WhereInput, args: QueryArgs = {}): Promise<TRow | null> {
    return this.delegate.findFirst({ ...args, where: this.activeOnly(where) });
  }

  async findMany(where: WhereInput = {}, args: QueryArgs = {}): Promise<TRow[]> {
    return this.delegate.findMany({ ...args, where: this.activeOnly(where) });
  }

  async count(where: WhereInput = {}): Promise<number> {
    return this.delegate.count({ where: this.activeOnly(where) });
  }

  async exists(where: WhereInput): Promise<boolean> {
    return (await this.count(where)) > 0;
  }

  /**
   * Phân trang offset-based.
   *
   * Đếm và lấy dữ liệu chạy song song — chúng độc lập nhau, nên chờ tuần tự chỉ
   * làm mỗi request chậm gấp đôi mà không được gì.
   */
  async paginate(params: PaginateParams = {}): Promise<PaginatedResult<TRow>> {
    const { page, limit, skip, take } = resolvePagination(params);
    const where = this.activeOnly(params.where ?? {});

    const query: QueryArgs = { where, skip, take };
    if (params.orderBy) query.orderBy = params.orderBy;
    if (params.select) query.select = params.select;
    if (params.include) query.include = params.include;

    const [items, total] = await Promise.all([
      this.delegate.findMany(query),
      this.delegate.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(data: QueryArgs, args: QueryArgs = {}): Promise<TRow> {
    return this.delegate.create({ ...args, data });
  }

  async updateById(id: string, data: QueryArgs, args: QueryArgs = {}): Promise<TRow> {
    return this.delegate.update({ ...args, where: { id }, data });
  }

  /**
   * Xoá theo cấu hình của bảng: xoá mềm nếu bảng có `deleted_at`, xoá cứng nếu
   * không. Gọi một chỗ duy nhất nghĩa là không ai lỡ tay xoá cứng bảng lẽ ra
   * chỉ được xoá mềm.
   */
  async remove(id: string): Promise<TRow> {
    if (this.config.softDelete) {
      return this.delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    return this.delegate.delete({ where: { id } });
  }
}
