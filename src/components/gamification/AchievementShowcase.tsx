'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pin, PinOff, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface PinnedAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  unlockedAt: Date;
}

export function AchievementShowcase() {
  const [pinnedAchievements, setPinnedAchievements] = useState<PinnedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPinnedAchievements();
  }, []);

  const loadPinnedAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements/pinned');
      if (response.ok) {
        const data = await response.json();
        setPinnedAchievements(
          data.map((a: PinnedAchievement) => ({
            ...a,
            unlockedAt: new Date(a.unlockedAt),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading pinned achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (achievementId: string) => {
    try {
      const response = await fetch(
        `/api/gamification/achievements/${achievementId}/pin`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setPinnedAchievements((prev) => prev.filter((a) => a.id !== achievementId));
        toast.success('Osiągnięcie odpięte');
      }
    } catch (error) {
      console.error('Error unpinning achievement:', error);
      toast.error('Nie udało się odpiąć osiągnięcia');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pinnedAchievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pin className="h-5 w-5" />
            Przypięte Osiągnięcia
          </CardTitle>
          <CardDescription>Pokaż swoje ulubione osiągnięcia (max 3)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Nie masz jeszcze przypiętych osiągnięć
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Kliknij ikonę pinezki przy osiągnięciu aby je przypiąć
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Pin className="h-5 w-5 text-primary" />
          Przypięte Osiągnięcia
        </CardTitle>
        <CardDescription>
          {pinnedAchievements.length}/3 przypiętych
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {pinnedAchievements.map((achievement) => (
            <div
              key={achievement.id}
              className="relative p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-all"
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => handleUnpin(achievement.id)}
              >
                <PinOff className="h-3 w-3" />
              </Button>

              <div className="text-center">
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <h4 className="font-semibold text-sm mb-1">{achievement.name}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {achievement.description}
                </p>
                <Badge variant="outline" className="text-xs">
                  +{achievement.xpReward} XP
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

