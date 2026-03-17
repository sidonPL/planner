import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminInventoryClient } from './AdminInventoryClient';

export default async function AdminInventoryPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminInventoryClient />;
}

