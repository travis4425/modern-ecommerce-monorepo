import { env } from '../../config/env';

/**
 * Ngôn ngữ của email.
 *
 * Backend cũng phải song ngữ, không chỉ giao diện: email đặt lại mật khẩu là
 * thứ người dùng đọc trực tiếp, và nó được gửi từ server chứ không đi qua bảng
 * i18n của frontend.
 */
export type Locale = 'vi' | 'en';

/** Chọn ngôn ngữ từ header Accept-Language. Mặc định tiếng Việt. */
export function resolveLocale(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) return 'vi';
  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'vi';
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/** Bọc nội dung trong khung HTML tối giản, dùng inline style vì email client bỏ qua <style>. */
function layout(heading: string, bodyHtml: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#14181a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e2e6e2;border-radius:10px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:20px;letter-spacing:-.01em">${heading}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e2e6e2;font-size:12.5px;color:#8a938f">${footer}</p>
  </div>
</body></html>`;
}

export function passwordResetEmail(params: {
  fullName: string;
  token: string;
  locale: Locale;
  ttlMinutes: number;
}): EmailContent {
  // Token đi trong query string của link. Frontend đọc nó ra rồi gửi kèm mật
  // khẩu mới lên /auth/reset-password.
  const link = `${env.WEB_APP_URL}/reset-password?token=${encodeURIComponent(params.token)}`;

  if (params.locale === 'en') {
    return {
      subject: 'Reset your password',
      text: [
        `Hi ${params.fullName},`,
        '',
        'We received a request to reset your password. Open the link below to choose a new one:',
        link,
        '',
        `This link expires in ${params.ttlMinutes} minutes and can only be used once.`,
        'If you did not request this, you can safely ignore this email — your password stays unchanged.',
      ].join('\n'),
      html: layout(
        'Reset your password',
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Hi ${params.fullName}, we received a request to reset your password.</p>
         <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#1f6f5c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;font-size:14.5px">Choose a new password</a></p>
         <p style="margin:0;font-size:13.5px;color:#48524f">This link expires in ${params.ttlMinutes} minutes and can only be used once.</p>`,
        'If you did not request this, ignore this email — your password stays unchanged.',
      ),
    };
  }

  return {
    subject: 'Đặt lại mật khẩu',
    text: [
      `Chào ${params.fullName},`,
      '',
      'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết dưới đây để chọn mật khẩu mới:',
      link,
      '',
      `Liên kết hết hạn sau ${params.ttlMinutes} phút và chỉ dùng được một lần.`,
      'Nếu bạn không yêu cầu việc này, bỏ qua email này — mật khẩu của bạn không thay đổi.',
    ].join('\n'),
    html: layout(
      'Đặt lại mật khẩu',
      `<p style="margin:0 0 16px;font-size:15px;line-height:1.6">Chào ${params.fullName}, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
       <p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#1f6f5c;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;font-size:14.5px">Chọn mật khẩu mới</a></p>
       <p style="margin:0;font-size:13.5px;color:#48524f">Liên kết hết hạn sau ${params.ttlMinutes} phút và chỉ dùng được một lần.</p>`,
      'Nếu bạn không yêu cầu việc này, hãy bỏ qua email — mật khẩu của bạn không thay đổi.',
    ),
  };
}

export function passwordChangedEmail(params: { fullName: string; locale: Locale }): EmailContent {
  if (params.locale === 'en') {
    return {
      subject: 'Your password was changed',
      text: `Hi ${params.fullName},\n\nYour password was just changed and all your sessions were signed out.\n\nIf this wasn't you, reset your password immediately and contact support.`,
      html: layout(
        'Your password was changed',
        `<p style="margin:0;font-size:15px;line-height:1.6">Hi ${params.fullName}, your password was just changed and every device was signed out.</p>`,
        "If this wasn't you, reset your password immediately and contact support.",
      ),
    };
  }
  return {
    subject: 'Mật khẩu của bạn vừa được thay đổi',
    text: `Chào ${params.fullName},\n\nMật khẩu tài khoản của bạn vừa được thay đổi và mọi phiên đăng nhập đã bị đăng xuất.\n\nNếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay và liên hệ bộ phận hỗ trợ.`,
    html: layout(
      'Mật khẩu vừa được thay đổi',
      `<p style="margin:0;font-size:15px;line-height:1.6">Chào ${params.fullName}, mật khẩu tài khoản của bạn vừa được thay đổi và mọi thiết bị đã bị đăng xuất.</p>`,
      'Nếu không phải bạn thực hiện, hãy đặt lại mật khẩu ngay và liên hệ bộ phận hỗ trợ.',
    ),
  };
}
