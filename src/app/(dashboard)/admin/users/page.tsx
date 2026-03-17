import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminUsersClient } from './AdminUsersClient';

export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminUsersClient />;
}

