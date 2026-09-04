import type { defaultNS, resources } from './index';

/**
 * Khai báo này biến khoá dịch thành KIỂU.
 *
 * Sau khi có nó, `t('home.titlee')` là lỗi biên dịch chứ không phải một chuỗi
 * "home.titlee" lặng lẽ hiện lên giao diện. Đây chính là cách thực thi yêu cầu
 * "không hardcode chuỗi": muốn hiện chữ thì phải qua `t()`, mà `t()` chỉ nhận
 * khoá có thật trong từ điển.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['vi'];
  }
}
