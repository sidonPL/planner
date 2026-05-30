'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AVAILABLE_TITLES, TitleId } from '@/lib/titles';
import { Check, Lock, Crown, Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function TitleSelector() {
  const [activeTitle, setActiveTitle] = useState<TitleId | null>(null);
  const [unlockedTitles, setUnlockedTitles] = useState<Set<TitleId>>(new Set(['none']));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveTitle();
    loadUnlockedTitles();
  }, []);

  const loadActiveTitle = async () => {
    try {
      const response = await fetch('/api/gamification/title');
      if (response.ok) {
        const data = await response.json();
        setActiveTitle(data.titleId || null);
      }
    } catch (error) {
      console.error('Error loading active title:', error);
    }
  };

  const loadUnlockedTitles = async () => {
    try {
      const response = await fetch('/api/gamification/claimed-rewards');
      if (response.ok) {
        const rewards = await response.json() as Array<{reward: {category: string; effectData?: {titleId?: string}}}>;
        const titleRewards = rewards.filter(
          (r) => r.reward.category === 'TITLE' && r.reward.effectData?.titleId
        );

        const unlocked = new Set<TitleId>(['none']);
        titleRewards.forEach((r) => {
          const titleId = r.reward.effectData?.titleId;
          if (titleId && AVAILABLE_TITLES[titleId as TitleId]) {
            unlocked.add(titleId as TitleId);
          }
        });

        setUnlockedTitles(unlocked);
      }
    } catch (error) {
      console.error('Error loading unlocked titles:', error);
      // Fallback: domyślnie tylko 'none' jest dostępny
      setUnlockedTitles(new Set(['none']));
    }
  };

  const handleSelectTitle = async (titleId: TitleId) => {
    if (!unlockedTitles.has(titleId) && titleId !== 'none') {
      toast.error('Tytuł zablokowany', {
        description: 'Musisz odblokować ten tytuł w sklepie nagród',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/gamification/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleId: titleId === 'none' ? null : titleId }),
      });

      if (response.ok) {
        setActiveTitle(titleId === 'none' ? null : titleId);
        toast.success('Tytuł zmieniony!', {
          description: `Aktywowano: ${AVAILABLE_TITLES[titleId].name}`,
        });
        window.dispatchEvent(new CustomEvent('cosmetics-updated'));
      } else {
        throw new Error('Failed to save title');
      }
    } catch (error) {
      console.error('Error changing title:', error);
      toast.error('Nie udało się zmienić tytułu');
    } finally {
      setLoading(false);
    }
  };

  // Grupuj tytuły po kategoriach
  const titlesByCategory = {
    basic: [AVAILABLE_TITLES.none],
    tasks: [
      AVAILABLE_TITLES.task_novice,
      AVAILABLE_TITLES.task_master,
      AVAILABLE_TITLES.task_legend,
    ],
    recipes: [
      AVAILABLE_TITLES.chef_rookie,
      AVAILABLE_TITLES.master_chef,
      AVAILABLE_TITLES.culinary_genius,
    ],
    streak: [
      AVAILABLE_TITLES.early_bird,
      AVAILABLE_TITLES.consistency_king,
      AVAILABLE_TITLES.eternal_warrior,
    ],
    leveling: [
      AVAILABLE_TITLES.rookie,
      AVAILABLE_TITLES.veteran,
      AVAILABLE_TITLES.grandmaster,
    ],
    special: [
      AVAILABLE_TITLES.vip,
      AVAILABLE_TITLES.golden_member,
      AVAILABLE_TITLES.founder,
    ],
  };

  const categoryLabels = {
    basic: 'Podstawowe',
    tasks: 'Zadania',
    recipes: 'Przepisy',
    streak: 'Streaki',
    leveling: 'Poziomy',
    special: 'Specjalne',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Tytuły Prestiżowe</h2>
        <p className="text-muted-foreground">
          Wyróżnij się specjalnym tytułem wyświetlanym pod Twoją nazwą
        </p>
      </div>

      {Object.entries(titlesByCategory).map(([category, titles]) => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {category === 'special' && <Star className="h-5 w-5 text-yellow-500" />}
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {titles.map((title) => {
              const titleId = title.id as TitleId;
              const isActive = activeTitle === titleId || (activeTitle === null && titleId === 'none');
              const isUnlocked = unlockedTitles.has(titleId) || title.free;
              const isPremium = title.premium;

              return (
                <Card
                  key={titleId}
                  className={cn(
                    'relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg',
                    isActive && 'ring-2 ring-primary',
                    !isUnlocked && 'opacity-60'
                  )}
                  onClick={() => handleSelectTitle(titleId)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{title.icon}</span>
                        <div>
                          <CardTitle className={cn('text-base', title.color)}>
                            {title.name}
                          </CardTitle>
                          {title.requirement && (
                            <p className="text-xs text-muted-foreground">
                              {title.requirement}
                            </p>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}

                      {!isUnlocked && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}

                      {isPremium && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {title.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {!isUnlocked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Zablokowany
                      </Button>
                    ) : isActive ? (
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        disabled
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Aktywny
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleSelectTitle(titleId)}
                        disabled={loading}
                      >
                        Aktywuj
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">💡 Wskazówka</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Nowe tytuły możesz odblokować zdobywając osiągnięcia i wymieniając je w{' '}
            <a href="/rewards" className="text-primary hover:underline">
              sklepie nagród
            </a>
            . Tytuły wyświetlają się pod Twoją nazwą na leaderboardzie i w komentarzach!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

