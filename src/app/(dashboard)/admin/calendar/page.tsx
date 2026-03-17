import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminCalendarClient } from './AdminCalendarClient';

export default async function AdminCalendarPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminCalendarClient />;
}

