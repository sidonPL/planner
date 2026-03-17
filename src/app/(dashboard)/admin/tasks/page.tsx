import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminTasksClient } from './AdminTasksClient';

export default async function AdminTasksPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminTasksClient />;
}

