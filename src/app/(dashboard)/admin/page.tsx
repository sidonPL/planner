import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminDashboardClient } from './AdminDashboardClient';

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminDashboardClient userId={session.user.id} />;
}

