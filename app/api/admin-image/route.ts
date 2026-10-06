import { env } from 'cloudflare:workers';
import { getAdminUser } from '../../admin-auth';
import { readImage, UploadError } from '../../../lib/upload';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({error:'กรุณาเข้าสู่ระบบ'},{status:403});
  if (req.headers.get('x-mint-action') !== '1' || req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin) return Response.json({error:'คำขอไม่ถูกต้อง'},{status:403});
  try {
    const file = await readImage(req), key = crypto.randomUUID();
    if (!env.DB) throw new UploadError(503,'ฐานข้อมูลยังไม่พร้อม');
    await env.DB.prepare('INSERT INTO uploads(id,type,data) VALUES(?,?,?)').bind('products/'+key,file.type,file.buffer).run();
    return Response.json({image:'/api/image/'+key});
  } catch (error) {
    if (error instanceof UploadError) return Response.json({error:error.message},{status:error.status});
    console.error('Mint image upload failed',error);
    return Response.json({error:'อัปโหลดไม่สำเร็จ กรุณาลองใหม่'},{status:503});
  }
}
