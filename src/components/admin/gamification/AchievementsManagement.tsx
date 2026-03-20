'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AchievementsCard } from '@/components/gamification/AchievementsCard';

export function AchievementsManagement() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie Osiągnięciami</CardTitle>
          <CardDescription>
            Przeglądaj i zarządzaj osiągnięciami w systemie
          </CardDescription>
        </CardHeader>
      </Card>

      <AchievementsCard isAdmin={true} />
    </div>
  );
}

