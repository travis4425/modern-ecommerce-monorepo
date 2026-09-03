import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '../../src/common/security/permissions';

const staff = ['order:read_all', 'order:update_status', 'inventory:adjust'];

describe('kiểm tra quyền', () => {
  it('có đúng quyền được yêu cầu', () => {
    expect(hasPermission(staff, 'order:read_all')).toBe(true);
  });

  it('không có quyền thì trả false', () => {
    expect(hasPermission(staff, 'user:delete')).toBe(false);
  });

  it('mảng quyền rỗng không lọt bất cứ thứ gì', () => {
    expect(hasPermission([], 'product:read')).toBe(false);
    expect(hasAnyPermission([], ['product:read', 'user:read'])).toBe(false);
    expect(hasAllPermissions([], ['product:read'])).toBe(false);
  });

  it('hasAllPermissions đòi đủ mọi quyền', () => {
    expect(hasAllPermissions(staff, ['order:read_all', 'order:update_status'])).toBe(true);
    expect(hasAllPermissions(staff, ['order:read_all', 'user:delete'])).toBe(false);
  });

  it('hasAnyPermission chỉ cần một quyền khớp', () => {
    expect(hasAnyPermission(staff, ['user:delete', 'order:read_all'])).toBe(true);
    expect(hasAnyPermission(staff, ['user:delete', 'user:create'])).toBe(false);
  });

  it('danh sách yêu cầu rỗng: hasAll đúng, hasAny sai', () => {
    // Quy ước của toán học tập hợp, ghi rõ ở đây để không ai sửa nhầm sau này.
    expect(hasAllPermissions(staff, [])).toBe(true);
    expect(hasAnyPermission(staff, [])).toBe(false);
  });

  it('không khớp một phần chuỗi', () => {
    // 'order:read' KHÔNG được coi là khớp với 'order:read_all'.
    expect(hasPermission(staff, 'order:read')).toBe(false);
  });
});
