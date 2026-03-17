import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminSettingsClient } from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminSettingsClient />;
}

