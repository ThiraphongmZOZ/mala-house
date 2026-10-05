import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, SESSION_SECONDS, adminConfigured } from '../../admin-auth';
import { digest, randomToken, verifyPassword } from '../../../lib/admin-password.mjs';
export const dynamic = 'force-dynamic';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const sameOrigin = (req: Request) => req.headers.get('origin') === new URL(req.url).origin && req.headers.get('x-mint-action') === '1';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'คำขอไม่ถูกต้อง' }, 403);
  if (!adminConfigured() || !env.DB) return json({ error: 'ร้านยังไม่ได้ตั้งค่าบัญชีเจ้าของร้าน' }, 503);
  if (Number(req.headers.get('content-length') ?? 0) > 2048) return json({ error: 'ข้อมูลมีขนาดใหญ่เกินไป' }, 413);
  let body: { email?: unknown; password?: unknown };
  try { const raw = await req.text(); if (raw.length > 2048) return json({ error: 'ข้อมูลมีขนาดใหญ่เกินไป' }, 413); body = JSON.parse(raw); }
  catch { return json({ error: 'ข้อมูลไม่ถูกต้อง' }, 400); }
  if (!body || typeof body.email !== 'string' || body.email.length > 254 || typeof body.password !== 'string' || body.password.length > 200) return json({ error: 'ข้อมูลไม่ถูกต้อง' }, 400);
  try {
    const now = Date.now(), key = await digest(req.headers.get('cf-connecting-ip') ?? 'local');
    const limit = await env.DB.prepare('INSERT INTO login_limits(id,attempts,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=CASE WHEN login_limits.expires<=? THEN 1 ELSE login_limits.attempts+1 END, expires=CASE WHEN login_limits.expires<=? THEN excluded.expires ELSE login_limits.expires END RETURNING attempts')
      .bind(key, now + 15 * 60 * 1000, now, now).first<{ attempts: number }>();
    if (!limit || limit.attempts > 10) return json({ error: 'ลองเข้าสู่ระบบหลายครั้งแล้ว กรุณารอ 15 นาที' }, 429);
    const valid = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH);
    if (!valid || body.email.trim().toLowerCase() !== env.ADMIN_EMAIL!.trim().toLowerCase()) return json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401);
    const token = randomToken();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM admin_sessions WHERE expires<=?').bind(now),
      env.DB.prepare('DELETE FROM login_limits WHERE expires<=?').bind(now),
      env.DB.prepare('INSERT INTO admin_sessions(id,owner_email,password_version,expires) VALUES(?,?,?,?)')
        .bind(await digest(token), env.ADMIN_EMAIL!.trim().toLowerCase(), await digest(env.ADMIN_PASSWORD_HASH!), now + SESSION_SECONDS * 1000),
    ]);
    (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:', path: '/', maxAge: SESSION_SECONDS });
    return json({ ok: true });
  } catch (error) { console.error('Mint admin sign-in failed', error); return json({ error: 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง' }, 503); }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return json({ error: 'คำขอไม่ถูกต้อง' }, 403);
  const jar = await cookies(), token = jar.get(ADMIN_COOKIE)?.value;
  if (token && env.DB) await env.DB.prepare('DELETE FROM admin_sessions WHERE id=?').bind(await digest(token)).run();
  jar.set(ADMIN_COOKIE, '', { httpOnly: true, sameSite: 'strict', secure: new URL(req.url).protocol === 'https:', path: '/', maxAge: 0 });
  return json({ ok: true });
}
