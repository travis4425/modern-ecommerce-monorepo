import request from 'supertest';
import { API_PREFIX } from '@ecom/shared';
import { createApp } from '../../src/app';

export const app = createApp();
export const api = () => request(app);
export const url = (path: string) => `${API_PREFIX}${path}`;

/** Email không bao giờ trùng giữa các lần chạy, để test không giẫm lên nhau. */
export function uniqueEmail(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export const SEED_PASSWORD = 'Password@123';

/** Đăng nhập một tài khoản seed, trả về access token và cookie refresh. */
export async function loginAs(email: string): Promise<{ accessToken: string; cookie: string[] }> {
  const response = await api()
    .post(url('/auth/login'))
    .send({ email, password: SEED_PASSWORD })
    .expect(200);

  const rawCookies = response.headers['set-cookie'];
  const cookie = Array.isArray(rawCookies) ? rawCookies : rawCookies ? [rawCookies] : [];

  return { accessToken: response.body.data.accessToken as string, cookie };
}

export function bearer(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}
