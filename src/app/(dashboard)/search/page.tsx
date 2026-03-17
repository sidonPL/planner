import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { SearchClient } from './SearchClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wyszukiwanie - Family Planner',
  description: 'Wyszukaj przepisy, zadania, wydatki i więcej',
};

export default async function SearchPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <SearchClient userId={session.user.id} />;
}

