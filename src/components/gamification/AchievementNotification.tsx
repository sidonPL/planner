'use client';

import { useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  achievement: {
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  };
}

interface AchievementNotificationProps {
  achievements: Achievement[];
}

export function AchievementNotification({ achievements }: AchievementNotificationProps) {
  useEffect(() => {
    if (achievements && achievements.length > 0) {
      // Pokaż powiadomienie dla każdego osiągnięcia
      achievements.forEach((achievement, index) => {
        setTimeout(() => {
          // Odpal konfetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });

          // Pokaż toast
          toast.success(
            <div className="flex items-start gap-3">
              <div className="text-3xl">{achievement.achievement.icon}</div>
              <div>
                <div className="font-bold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Nowe osiągnięcie!
                </div>
                <div className="font-semibold">{achievement.achievement.name}</div>
                <div className="text-sm text-muted-foreground">
                  {achievement.achievement.description}
                </div>
                <div className="text-xs text-yellow-600 font-medium mt-1">
                  +{achievement.achievement.xpReward} XP
                </div>
              </div>
            </div>,
            {
              duration: 5000,
              position: 'top-center',
            }
          );
        }, index * 1000); // Opóźnienie dla każdego osiągnięcia
      });
    }
  }, [achievements]);

  return null;
}

