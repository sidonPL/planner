import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AdminGamificationClient } from './AdminGamificationClient';

export default async function AdminGamificationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Check if user is admin
  if (session.user.role !== 'ADMIN') {
    redirect('/gamification');
  }

  return <AdminGamificationClient />;
}

