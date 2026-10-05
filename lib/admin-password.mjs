import { timingSafeEqual } from 'node:crypto';
const encoder = new TextEncoder();
const iterations = 100000;
export const passwordHashPattern = /^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/;
export const digest = async (value) => Buffer.from(await crypto.subtle.digest('SHA-256', encoder.encode(value))).toString('hex');
export const randomToken = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return Buffer.from(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations, salt }, key, 256));
}
export async function createPasswordHash(password) {
  if (typeof password !== 'string' || password.length < 20 || password.length > 200) throw new Error('Use a password or passphrase of 20–200 characters.');
  // ponytail: Workers caps PBKDF2 at 100k iterations; require a long password.
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256:${iterations}:${Buffer.from(salt).toString('hex')}:${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || password.length < 20 || password.length > 200 || !passwordHashPattern.test(stored ?? '')) return false;
  const [, , salt, hash] = stored.split(':');
  return timingSafeEqual(await derive(password, Buffer.from(salt, 'hex')), Buffer.from(hash, 'hex'));
}
