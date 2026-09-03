import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from '../../config/env';
import { createLogger } from '../logger';
import type { EmailContent } from './email-templates';

const log = createLogger('mailer');

/**
 * Ba chế độ, chọn theo cấu hình chứ không cần đổi code:
 *
 *  • Không khai báo SMTP_HOST → in nội dung email ra terminal. Đây là mặc định
 *    ở dev: chạy được luồng quên mật khẩu ngay mà không cần đăng ký dịch vụ nào.
 *  • Có SMTP_HOST → gửi thật (Mailtrap ở dev, nhà cung cấp thật ở production).
 *  • Môi trường test → nuốt hoàn toàn, không in, không gửi.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // Cổng 465 dùng TLS ngay từ đầu; các cổng khác nâng cấp qua STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export interface SendMailParams {
  to: string;
  content: EmailContent;
}

/**
 * Gửi email. KHÔNG BAO GIỜ ném lỗi ra ngoài.
 *
 * Lý do: nếu nhà cung cấp SMTP chết, người dùng bấm "quên mật khẩu" sẽ nhận lỗi
 * 500 — vừa lộ thông tin hạ tầng, vừa cho phép dò xem email nào có thật (email
 * không tồn tại thì không gửi gì nên không bao giờ lỗi). Ta ghi log rồi trả về
 * bình thường; đội vận hành nhìn log mà xử lý.
 */
export async function sendMail({ to, content }: SendMailParams): Promise<void> {
  if (isTest) return;

  const mail = getTransporter();

  if (!mail) {
    log.info(
      { to, subject: content.subject },
      `email (chế độ terminal, chưa cấu hình SMTP)\n\n${content.text}\n`,
    );
    return;
  }

  try {
    const info = await mail.sendMail({
      from: env.MAIL_FROM,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    log.info({ to, subject: content.subject, messageId: info.messageId }, 'đã gửi email');
  } catch (error) {
    log.error({ err: error, to, subject: content.subject }, 'gửi email thất bại');
  }
}
