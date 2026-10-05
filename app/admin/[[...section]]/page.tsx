import { env } from 'cloudflare:workers';
import { requireChatGPTUser } from '../../chatgpt-auth';
import Admin from '../../admin-client';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireChatGPTUser('/admin');if(user.email.toLowerCase()!==(env.ADMIN_EMAIL??process.env.ADMIN_EMAIL??'').toLowerCase())return <main className="access"><h1>เฉพาะเจ้าของร้าน</h1><p>บัญชีนี้ยังไม่มีสิทธิ์จัดการร้าน Mint</p><a href="/signout-with-chatgpt?return_to=/admin">เปลี่ยนบัญชี</a></main>;return <Admin email={user.email}/>;}
