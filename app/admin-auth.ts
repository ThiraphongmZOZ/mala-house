import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { digest, passwordHashPattern } from '../lib/admin-password.mjs';
export const ADMIN_COOKIE = 'mint-admin';
export const SESSION_SECONDS = 8 * 60 * 60;
export function adminConfigured() {
  return !!env.ADMIN_EMAIL?.trim() && passwordHashPattern.test(env.ADMIN_PASSWORD_HASH ?? '');
}
export async function getAdminUser(): Promise<{ email: string } | null> {
  if (!adminConfigured() || !env.DB) return null;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await env.DB.prepare('SELECT owner_email FROM admin_sessions WHERE id=? AND expires>? AND password_version=? AND owner_email=?')
    .bind(await digest(token), Date.now(), await digest(env.ADMIN_PASSWORD_HASH!), env.ADMIN_EMAIL!.trim().toLowerCase()).first<{ owner_email: string }>();
  return row ? { email: row.owner_email } : null;
}
