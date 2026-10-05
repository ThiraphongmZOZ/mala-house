import { redirect } from 'next/navigation';
import { getAdminUser } from '../../admin-auth';
import Admin from '../../admin-client';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getAdminUser();if(!user)redirect('/admin/login');return <Admin email={user.email}/>;}
