import { env } from 'cloudflare:workers';
export const MAX_IMAGE_BYTES = 500000;
export class UploadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function readImage(req: Request) {
  const limit = MAX_IMAGE_BYTES + 20000;
  if (!req.body || Number(req.headers.get('content-length') ?? 0) > limit) throw new UploadError(413, 'รูปภาพต้องไม่เกิน 500 KB');
  const reader = req.body.getReader(), chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw new UploadError(413, 'รูปภาพต้องไม่เกิน 500 KB'); }
    chunks.push(value);
  }
  const data = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  let form: FormData;
  try { form = await new Response(data, { headers: { 'Content-Type': req.headers.get('content-type') ?? '' } }).formData(); }
  catch { throw new UploadError(400, 'เลือกไฟล์ JPG หรือ PNG'); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES || file.size < 8) throw new UploadError(400, 'เลือกภาพ JPG หรือ PNG ไม่เกิน 500 KB');
  const buffer = await file.arrayBuffer(), h = new Uint8Array(buffer);
  const type = h[0]===255 && h[1]===216 && h[2]===255 ? 'image/jpeg' : h[0]===137 && h[1]===80 && h[2]===78 && h[3]===71 && h[4]===13 && h[5]===10 && h[6]===26 && h[7]===10 ? 'image/png' : '';
  if (!type) throw new UploadError(400, 'รองรับภาพ JPG และ PNG เท่านั้น');
  return { buffer, type };
}
export async function imageResponse(key: string, privateImage: boolean) {
  if (!env.DB) throw new UploadError(503, 'ฐานข้อมูลยังไม่พร้อม');
  const file = await env.DB.prepare('SELECT data,type FROM uploads WHERE id=?').bind(key).first<{ data: number[]; type: string }>();
  if (!file) throw new UploadError(404, 'ไม่พบรูปภาพ');
  return new Response(new Uint8Array(file.data), { headers: { 'Content-Type': file.type, 'Cache-Control': privateImage ? 'private,no-store' : 'public,max-age=86400', 'X-Content-Type-Options': 'nosniff' } });
}
