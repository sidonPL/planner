import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminCronClient } from './AdminCronClient';

export default async function AdminCronPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminCronClient />;
}

