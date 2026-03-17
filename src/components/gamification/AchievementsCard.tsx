'use client';

import { useState, useEffect } from 'react';
import { Trophy, Lock, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { AchievementDetailModal } from './AchievementDetailModal';
import { TierBadgeMini } from './TierBadge';
import { AchievementIcon } from '@/lib/achievement-icons';

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
  // Tiered achievements
  tier?: number | null;
  tierName?: string | null;
  seriesName?: string | null;
  nextTierId?: string | null;
  previousTierId?: string | null;
}

interface AchievementsCardProps {
  isAdmin?: boolean;
  className?: string;
}

const categoryLabels: Record<string, string> = {
  TASKS: 'Zadania',
  RECIPES: 'Przepisy',
  MEALS: 'Posiłki',
  SHOPPING: 'Zakupy',
  INVENTORY: 'Inwentarz',
  STREAK: 'Serie',
  SOCIAL: 'Współpraca',
  MASTER: 'Mistrzostwa',
};

const categoryIcons: Record<string, string> = {
  TASKS: '✅',
  RECIPES: '👨‍🍳',
  MEALS: '🍽️',
  SHOPPING: '🛒',
  INVENTORY: '📦',
  STREAK: '🔥',
  SOCIAL: '👥',
  MASTER: '👑',
};

export function AchievementsCard({ isAdmin = false, className }: AchievementsCardProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const response = await fetch('/api/gamification/achievements');
      if (response.ok) {
        const data: Achievement[] = await response.json();
        setAchievements(data.map(a => ({
          ...a,
          unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : null,
        })));
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const response = await fetch('/api/gamification/achievements', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Osiągnięcia zainicjalizowane!');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        loadAchievements();
      } else {
        toast.error('Nie udało się zainicjalizować osiągnięć');
      }
    } catch (error) {
      console.error('Error initializing achievements:', error);
      toast.error('Błąd podczas inicjalizacji');
    } finally {
      setInitializing(false);
    }
  };

  const filteredAchievements =
    filter === 'all'
      ? achievements
      : filter === 'unlocked'
      ? achievements.filter((a) => a.isUnlocked)
      : filter === 'locked'
      ? achievements.filter((a) => !a.isUnlocked)
      : achievements.filter((a) => a.category === filter);

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const totalXP = achievements
    .filter((a) => a.isUnlocked)
    .reduce((sum, a) => sum + a.xpReward, 0);

  // Group by category
  const categorizedAchievements = filteredAchievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Osiągnięcia
            </CardTitle>
            <CardDescription>
              {unlockedCount}/{achievements.length} odblokowanych • {totalXP} XP zdobyte
            </CardDescription>
          </div>
          {isAdmin && achievements.length === 0 && (
            <Button onClick={handleInitialize} disabled={initializing} size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              {initializing ? 'Inicjalizacja...' : 'Inicjalizuj'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
        ) : achievements.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {isAdmin ? 'Kliknij "Inicjalizuj" aby stworzyć osiągnięcia' : 'Brak osiągnięć'}
            </p>
          </div>
        ) : (
          <>
            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={setFilter} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-4">
                <TabsTrigger value="all">Wszystkie</TabsTrigger>
                <TabsTrigger value="unlocked">✓ Odblokowane</TabsTrigger>
                <TabsTrigger value="locked">🔒 Zablokowane</TabsTrigger>
                <TabsTrigger value="TASKS">✅ Zadania</TabsTrigger>
                <TabsTrigger value="RECIPES">👨‍🍳 Przepisy</TabsTrigger>
              </TabsList>

              {/* Dodatkowe kategorie */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(categoryLabels)
                  .filter(([key]) => !['TASKS', 'RECIPES'].includes(key))
                  .map(([key, label]) => (
                    <Button
                      key={key}
                      variant={filter === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilter(key)}
                      className="text-xs"
                    >
                      {categoryIcons[key]} {label}
                    </Button>
                  ))}
              </div>

              <TabsContent value={filter} className="mt-4 space-y-6">
                {Object.entries(categorizedAchievements).map(([category, categoryAchievements]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                      <span className="text-lg">{categoryIcons[category]}</span>
                      {categoryLabels[category] || category}
                      <span className="text-xs font-normal">
                        ({categoryAchievements.filter((a) => a.isUnlocked).length}/
                        {categoryAchievements.length})
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {categoryAchievements.map((achievement) => (
                        <div
                          key={achievement.id}
                          onClick={() => {
                            setSelectedAchievement(achievement);
                            setModalOpen(true);
                          }}
                          className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-md cursor-pointer ${
                            achievement.isUnlocked
                              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800 hover:scale-[1.02]'
                              : 'bg-muted/50 hover:bg-muted hover:border-primary/20'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <AchievementIcon
                                icon={achievement.icon}
                                className="h-8 w-8"
                                unlocked={achievement.isUnlocked}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">{achievement.name}</h4>
                                  {achievement.tier && <TierBadgeMini tier={achievement.tier} />}
                                  {achievement.isUnlocked && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                  {!achievement.isUnlocked && achievement.isSecret && (
                                    <Lock className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {achievement.description}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              +{achievement.xpReward} XP
                            </Badge>
                          </div>

                          {achievement.isUnlocked ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Check className="h-4 w-4 text-green-600" />
                              <span>
                                Odblokowane{' '}
                                {achievement.unlockedAt &&
                                  formatDistanceToNow(achievement.unlockedAt, {
                                    addSuffix: true,
                                    locale: pl,
                                  })}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1 mt-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Postęp</span>
                                <span className="font-medium">
                                  {achievement.progress} / {achievement.requirementValue}
                                </span>
                              </div>
                              <Progress value={achievement.percentage} className="h-2" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>

      <AchievementDetailModal
        achievement={selectedAchievement}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </Card>
  );
}

