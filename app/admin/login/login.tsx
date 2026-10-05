'use client';
import { useState, type FormEvent } from 'react';
export default function Login({ configured }: { configured: boolean }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-mint-action': '1' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'เข้าสู่ระบบไม่สำเร็จ');
      window.location.assign('/admin');
    } catch (error) { setError((error as Error).message || 'เข้าสู่ระบบไม่สำเร็จ'); setBusy(false); }
  }
  return <main className="admin-login"><a className="brand" href="/"><span className="brand-symbol">m</span>Mint</a><section className="panel"><span className="eyebrow">SHOP WORKSPACE</span><h1>เข้าสู่หลังบ้าน</h1><p className="muted">จัดการออเดอร์ เมนู และสต็อกของร้านคุณ</p>{!configured && <div className="notice" role="status">ยังไม่ได้ตั้งค่าบัญชีเจ้าของร้าน</div>}<form onSubmit={submit}><label htmlFor="admin-email">อีเมลเจ้าของร้าน</label><input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required disabled={!configured || busy} /><label htmlFor="admin-password">รหัสผ่าน</label><input id="admin-password" name="password" type="password" autoComplete="current-password" minLength={20} maxLength={200} required disabled={!configured || busy} />{error && <div className="error-banner" role="alert">{error}</div>}<button className="primary full" type="submit" disabled={!configured || busy}>{busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button></form></section><a href="/" className="muted">กลับไปหน้าร้าน</a></main>;
}
