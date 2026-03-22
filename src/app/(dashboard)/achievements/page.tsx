'use client';

import { useState, useEffect } from 'react';
import { Trophy, Lock, Star, TrendingUp, Zap, Pin, PinOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { getAchievementIcon } from '@/lib/achievement-icons';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';

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
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  currentValue?: number;
  isPinned?: boolean;
}

const categoryLabels: Record<string, string> = {
  TASKS: 'Zadania',
  ROUTINES: 'Rutyny',
  RECIPES: 'Przepisy',
  SHOPPING: 'Zakupy',
  MEALS: 'Posiłki',
  BUDGET: 'Budżet',
  FAMILY: 'Rodzina',
  STREAK: 'Serie',
  SOCIAL: 'Społeczność',
  MASTER: 'Mistrzowskie',
  COOKING: 'Gotowanie',
  INVENTORY: 'Inwentarz',
};

export default function AchievementShowcasePage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [pinLoadingId, setPinLoadingId] = useState<string | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const [achievementsResponse, pinnedResponse] = await Promise.all([
        fetch('/api/gamification/achievements'),
        fetch('/api/gamification/achievements/pinned'),
      ]);

      if (achievementsResponse.ok) {
        const data = await achievementsResponse.json();
        const pinned = pinnedResponse.ok ? await pinnedResponse.json() : [];
        const pinnedIds = new Set((Array.isArray(pinned) ? pinned : []).map((a: { id: string }) => a.id));

        const normalized = (Array.isArray(data) ? data : []).map((item) => {
          const requirementValue = Number(item.requirementValue || 0);
          const rawProgressValue = Number(item.currentValue ?? item.progress ?? 0);
          const percentage = Number(
            item.percentage ??
            (requirementValue > 0 ? (rawProgressValue / requirementValue) * 100 : 0)
          );

          return {
            ...item,
            unlocked: Boolean(item.unlocked ?? item.isUnlocked),
            unlockedAt: item.unlockedAt ? new Date(item.unlockedAt) : undefined,
            currentValue: rawProgressValue,
            progress: Math.max(0, Math.min(100, percentage)),
            isPinned: pinnedIds.has(item.id),
          } as Achievement;
        });

        setAchievements(normalized);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePin = async (achievement: Achievement) => {
    if (!achievement.unlocked) {
      toast.error('Najpierw odblokuj osiągnięcie');
      return;
    }

    const currentlyPinned = Boolean(achievement.isPinned);
    const pinnedCount = achievements.filter((a) => a.isPinned).length;

    if (!currentlyPinned && pinnedCount >= 3) {
      toast.error('Możesz przypiąć maksymalnie 3 osiągnięcia');
      return;
    }

    setPinLoadingId(achievement.id);
    try {
      const response = await fetch(`/api/gamification/achievements/${achievement.id}/pin`, {
        method: currentlyPinned ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Nie udało się zaktualizować przypięcia');
      }

      setAchievements((prev) => prev.map((item) =>
        item.id === achievement.id
          ? { ...item, isPinned: !currentlyPinned }
          : item
      ));

      toast.success(currentlyPinned ? 'Osiągnięcie odpięte' : 'Osiągnięcie przypięte');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Błąd przypinania osiągnięcia');
    } finally {
      setPinLoadingId(null);
    }
  };

  const categories = ['ALL', ...Object.keys(categoryLabels)];

  const filteredAchievements = achievements.filter(
    (a) => selectedCategory === 'ALL' || a.category === selectedCategory
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const completionPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const totalXpEarned = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  const recentUnlocks = achievements
    .filter((a) => a.unlocked && a.unlockedAt)
    .sort((a, b) => {
      if (!a.unlockedAt || !b.unlockedAt) return 0;
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Ładowanie osiągnięć...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Moje Osiągnięcia
          </h1>
          <p className="text-muted-foreground">
            Twoja kolekcja odznak i nagród
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/achievements/tiered">
            <Button variant="default">
              <Trophy className="mr-2 h-4 w-4" />
              Serie Osiągnięć
            </Button>
          </Link>
          <Link href="/gamification">
            <Button variant="outline">Powrót do Gamifikacji</Button>
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Trophy className="h-8 w-8 mx-auto text-yellow-500" />
              <div className="text-3xl font-bold">{unlockedCount}</div>
              <div className="text-sm text-muted-foreground">
                Odblokowane
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Lock className="h-8 w-8 mx-auto text-gray-400" />
              <div className="text-3xl font-bold">{totalCount - unlockedCount}</div>
              <div className="text-sm text-muted-foreground">
                Do zdobycia
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Star className="h-8 w-8 mx-auto text-purple-500" />
              <div className="text-3xl font-bold">{totalXpEarned}</div>
              <div className="text-sm text-muted-foreground">
                XP z osiągnięć
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <TrendingUp className="h-8 w-8 mx-auto text-green-500" />
              <div className="text-3xl font-bold">
                {completionPercentage.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Ukończone
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Postęp ogólny</span>
              <span className="text-muted-foreground">
                {unlockedCount} / {totalCount}
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Unlocks */}
      {recentUnlocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Ostatnio odblokowane
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUnlocks.map((achievement) => {
                const IconComponent = getAchievementIcon(achievement.icon);
                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-yellow-500" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{achievement.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {achievement.unlockedAt &&
                          format(new Date(achievement.unlockedAt), 'PPp', {
                            locale: pl,
                          })}
                      </div>
                    </div>
                    <Badge variant="secondary">+{achievement.xpReward} XP</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category === 'ALL' ? 'Wszystkie' : categoryLabels[category]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => {
              const IconComponent = getAchievementIcon(achievement.icon);
              const isLocked = !achievement.unlocked;

              return (
                <Card
                  key={achievement.id}
                  className={`${
                    isLocked ? 'opacity-60' : 'border-yellow-500/50'
                  } transition-all hover:shadow-lg`}
                >
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isLocked || pinLoadingId === achievement.id}
                          onClick={() => handleTogglePin(achievement)}
                          title={achievement.isPinned ? 'Odepnij osiągnięcie' : 'Przypnij osiągnięcie'}
                        >
                          {achievement.isPinned ? (
                            <PinOff className="h-4 w-4 text-primary" />
                          ) : (
                            <Pin className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>

                      {/* Icon */}
                      <div className="flex justify-center">
                        <div
                          className={`h-16 w-16 rounded-full flex items-center justify-center ${
                            isLocked
                              ? 'bg-gray-500/20'
                              : 'bg-yellow-500/20'
                          }`}
                        >
                          {isLocked ? (
                            <Lock className="h-8 w-8 text-gray-400" />
                          ) : (
                            <IconComponent className="h-8 w-8 text-yellow-500" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="text-center space-y-1">
                        <h3 className="font-bold">{achievement.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>

                      {/* Progress */}
                      {isLocked && typeof achievement.progress === 'number' && (
                        <div className="space-y-1">
                          <Progress
                            value={achievement.progress}
                            className="h-2"
                          />
                          <div className="text-xs text-center text-muted-foreground">
                            {achievement.currentValue} / {achievement.requirementValue}
                          </div>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Badge variant="outline">
                          {categoryLabels[achievement.category]}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {achievement.isPinned && (
                            <Badge variant="secondary">
                              <Pin className="h-3 w-3 mr-1" />
                              Przypięte
                            </Badge>
                          )}
                          <Badge variant={isLocked ? 'secondary' : 'default'}>
                            +{achievement.xpReward} XP
                          </Badge>
                        </div>
                      </div>

                      {achievement.unlocked && achievement.unlockedAt && (
                        <div className="text-xs text-center text-muted-foreground">
                          Odblokowano{' '}
                          {format(new Date(achievement.unlockedAt), 'PPp', {
                            locale: pl,
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Brak osiągnięć w tej kategorii
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

