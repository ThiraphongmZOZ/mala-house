import { redirect } from 'next/navigation';
import { adminConfigured, getAdminUser } from '../../admin-auth';
import Login from './login';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (await getAdminUser()) redirect('/admin');
  return <Login configured={adminConfigured()} />;
}
