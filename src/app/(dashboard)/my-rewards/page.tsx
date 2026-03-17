import { Metadata } from 'next';
import { MyRewardsManager } from '@/components/gamification/MyRewardsManager';

export const metadata: Metadata = {
  title: 'Moje Nagrody | Family Planner',
  description: 'Zarządzaj swoimi kupionymi nagrodami',
};

export default function MyRewardsPage() {
  return (
    <div className="container max-w-7xl py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moje Nagrody</h1>
        <p className="text-muted-foreground mt-2">
          Aktywuj i zarządzaj swoimi kupionymi nagrodami
        </p>
      </div>

      <MyRewardsManager />
    </div>
  );
}

