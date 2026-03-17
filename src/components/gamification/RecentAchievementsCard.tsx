'use client';

import { useState, useEffect } from 'react';
import { Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  xpReward: number;
  isSecret: boolean;
  isUnlocked: boolean;
  progress: number;
  percentage: number;
  unlockedAt: Date | null;
}

export function RecentAchievementsCard() {
  const [recentUnlocked, setRecentUnlocked] = useState<Achievement[]>([]);
  const [nearlyComplete, setNearlyComplete] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements');
      if (response.ok) {
        const data: Achievement[] = await response.json();

        // Ostatnio odblokowane (ostatnie 5)
        const unlocked = data
          .filter((a) => a.isUnlocked && a.unlockedAt)
          .map((a) => ({
            ...a,
            unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : null,
          }))
          .sort((a, b) => {
            if (!a.unlockedAt || !b.unlockedAt) return 0;
            return b.unlockedAt.getTime() - a.unlockedAt.getTime();
          })
          .slice(0, 5);

        // Najbliższe do zdobycia (75%+, nie odblokowane)
        const nearly = data
          .filter((a) => !a.isUnlocked && a.percentage >= 75)
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5);

        setRecentUnlocked(unlocked);
        setNearlyComplete(nearly);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Ostatnio odblokowane */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Ostatnio odblokowane
          </CardTitle>
          <CardDescription>Twoje najnowsze osiągnięcia</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Ładowanie...</div>
          ) : recentUnlocked.length === 0 ? (
            <div className="text-center py-4">
              <Trophy className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Brak ostatnio odblokownych osiągnięć</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUnlocked.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border border-yellow-200 dark:border-yellow-800"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{achievement.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(achievement.unlockedAt, {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      +{achievement.xpReward} XP
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Najbliższe do zdobycia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Prawie tam!
          </CardTitle>
          <CardDescription>Najbliższe do zdobycia (75%+)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">Ładowanie...</div>
          ) : nearlyComplete.length === 0 ? (
            <div className="text-center py-4">
              <TrendingUp className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Brak osiągnięć w toku</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nearlyComplete.map((achievement) => (
                <div key={achievement.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{achievement.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {achievement.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      +{achievement.xpReward} XP
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Postęp</span>
                      <span className="font-medium">
                        {achievement.progress} / {achievement.requirementValue}
                      </span>
                    </div>
                    <Progress value={achievement.percentage} className="h-2" />
                    <p className="text-xs text-right text-muted-foreground">{achievement.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

