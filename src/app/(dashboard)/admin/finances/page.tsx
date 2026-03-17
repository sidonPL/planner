import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminFinancesClient } from './AdminFinancesClient';

export default async function AdminFinancesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminFinancesClient />;
}

