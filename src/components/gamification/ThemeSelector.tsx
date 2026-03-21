'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AVAILABLE_THEMES, ThemeId, applyTheme } from '@/lib/themes';
import { resolveThemeIdFromRewardData } from '@/lib/theme-reward-utils';
import { Check, Lock, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const [activeTheme, setActiveTheme] = useState<ThemeId>('default');
  const [unlockedThemes, setUnlockedThemes] = useState<Set<ThemeId>>(new Set(['default']));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadActiveTheme();
    loadUnlockedThemes();
  }, []);

  const loadActiveTheme = async () => {
    try {
      const response = await fetch('/api/gamification/theme');
      if (response.ok) {
        const data = await response.json();
        const theme = data.themeId || 'default';
        setActiveTheme(theme as ThemeId);
        applyTheme(theme);
      }
    } catch (error) {
      console.error('Error loading active theme:', error);
    }
  };

  const loadUnlockedThemes = async () => {
    try {
      const [rewardsResponse, themeResponse] = await Promise.all([
        fetch('/api/gamification/claimed-rewards'),
        fetch('/api/gamification/theme'),
      ]);

      const unlocked = new Set<ThemeId>(['default']);

      if (rewardsResponse.ok) {
        const rewards = await rewardsResponse.json() as Array<{reward: {category: string; effectData?: unknown; name?: string}}>;
        rewards
          .filter((r) => r.reward.category === 'THEME')
          .forEach((r) => {
            const themeId = resolveThemeIdFromRewardData({
              effectData: r.reward.effectData,
              name: r.reward.name,
            });
            if (themeId && AVAILABLE_THEMES[themeId]) {
              unlocked.add(themeId);
            }
          });
      }

      // Fallback: aktualnie aktywny motyw zawsze traktuj jako odblokowany.
      if (themeResponse.ok) {
        const activeData = await themeResponse.json() as { themeId?: string };
        const activeThemeId = activeData.themeId;
        if (activeThemeId && AVAILABLE_THEMES[activeThemeId as ThemeId]) {
          unlocked.add(activeThemeId as ThemeId);
        }
      }

      setUnlockedThemes(unlocked);
    } catch (error) {
      console.error('Error loading unlocked themes:', error);
      // Fallback: domyślnie tylko 'default' jest dostępny
      setUnlockedThemes(new Set(['default']));
    }
  };

  const handleSelectTheme = async (themeId: ThemeId) => {
    if (!unlockedThemes.has(themeId) && themeId !== 'default') {
      toast.error('Motyw zablokowany', {
        description: 'Musisz odblokować ten motyw w sklepie nagród',
      });
      return;
    }

    setLoading(true);

    try {
      // Apply theme immediately for instant feedback
      applyTheme(themeId);
      setActiveTheme(themeId);

      // Save to backend
      const response = await fetch('/api/gamification/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (response.ok) {
        toast.success('Motyw zmieniony!', {
          description: `Aktywowano motyw: ${AVAILABLE_THEMES[themeId].name}`,
        });

        // Save to localStorage as backup
        localStorage.setItem('activeTheme', themeId);
      } else {
        throw new Error('Failed to save theme');
      }
    } catch (error) {
      console.error('Error changing theme:', error);
      toast.error('Nie udało się zmienić motywu');

      // Revert on error
      applyTheme(activeTheme);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Motywy Kolorystyczne</h2>
        <p className="text-muted-foreground">
          Personalizuj wygląd aplikacji. Odblokowuj nowe motywy w sklepie nagród!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(AVAILABLE_THEMES).map(([key, theme]) => {
          const themeId = key as ThemeId;
          const isActive = activeTheme === themeId;
          const isUnlocked = unlockedThemes.has(themeId) || theme.free;
          const isPremium = theme.premium;

          return (
            <Card
              key={themeId}
              className={cn(
                'relative overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg',
                isActive && 'ring-2 ring-primary',
                !isUnlocked && 'opacity-60'
              )}
              onClick={() => handleSelectTheme(themeId)}
            >
              {/* Color Preview Bar */}
              {theme.colors && (
                <div className="h-2 flex">
                  <div
                    className="flex-1"
                    style={{ backgroundColor: theme.colors.primary }}
                  />
                  <div
                    className="flex-1"
                    style={{ backgroundColor: theme.colors.secondary }}
                  />
                  <div
                    className="flex-1"
                    style={{ backgroundColor: theme.colors.accent }}
                  />
                </div>
              )}

              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{theme.icon}</span>
                    <CardTitle className="text-lg">{theme.name}</CardTitle>
                  </div>

                  {isActive && (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Aktywny
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
                  {theme.description}
                </CardDescription>
                {isUnlocked && !theme.free && !isActive && (
                  <Badge variant="secondary" className="w-fit mt-1">
                    Kupiony
                  </Badge>
                )}
              </CardHeader>

              <CardContent>
                {!isUnlocked ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Zablokowany
                  </Button>
                ) : isActive ? (
                  <Button
                    variant="default"
                    className="w-full"
                    disabled
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Używany
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSelectTheme(themeId)}
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

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">💡 Wskazówka</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>
            Nowe motywy możesz odblokować w{' '}
            <a href="/gamification/rewards" className="text-primary hover:underline">
              sklepie nagród
            </a>
            . Zdobywaj XP i wymieniaj na ekskluzywne motywy kolorystyczne!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

