import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminRecipesClient } from './AdminRecipesClient';

export default async function AdminRecipesPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return <AdminRecipesClient />;
}

