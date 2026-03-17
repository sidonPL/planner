import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminNotificationsClient } from './AdminNotificationsClient';

export default async function AdminNotificationsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminNotificationsClient userId={session.user.id} />;
}

