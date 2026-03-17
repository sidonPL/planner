import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminDatabaseClient } from './AdminDatabaseClient';

export default async function AdminDatabasePage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminDatabaseClient />;
}

