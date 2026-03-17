import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { RewardsStatsDashboard } from '@/components/gamification/RewardsStatsDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Statystyki Nagród | Family Planner',
  description: 'Przegląd wykorzystania nagród gamifikacyjnych',
};

export default async function RewardsStatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/gamification">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do Gamifikacji
          </Link>
        </Button>
      </div>

      <RewardsStatsDashboard />
    </div>
  );
}

