'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Zap,
  Trophy,
  Clock,
  History,
  Target,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RewardStats {
  totalPurchased: number;
  totalSpent: number;
  activeRewards: number;
  expiredRewards: number;
  mostUsedCategory: string;

  xpBoosts: {
    totalActivated: number;
    totalXPEarned: number;
    totalBonusXP: number;
    averageMultiplier: number;
    bestMultiplier: number;
    totalDuration: number; // w godzinach
  };

  themes: {
    totalUnlocked: number;
    currentTheme: string | null;
    mostUsedTheme: string | null;
    themeChanges: number;
  };

  titles: {
    totalUnlocked: number;
    currentTitle: string | null;
    favoriteTitle: string | null;
  };

  history: Array<{
    id: string;
    rewardName: string;
    category: string;
    activatedAt: Date;
    expiresAt: Date | null;
    duration: number | null;
  }>;
}

export function RewardsStatsDashboard() {
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/gamification/rewards/stats?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load reward stats:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Brak danych statystycznych</p>
        </CardContent>
      </Card>
    );
  }

  const roiPercent = stats.totalSpent > 0
    ? Math.round((stats.xpBoosts.totalBonusXP / stats.totalSpent) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header z wyborem okresu */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">📊 Statystyki Nagród</h2>
          <p className="text-muted-foreground">Przegląd wykorzystania nagród i ich efektywności</p>
        </div>
        <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as 'week' | 'month' | 'all')}>
          <TabsList>
            <TabsTrigger value="week">Tydzień</TabsTrigger>
            <TabsTrigger value="month">Miesiąc</TabsTrigger>
            <TabsTrigger value="all">Wszystko</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Główne statystyki */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Zakupione nagrody"
          value={stats.totalPurchased}
          subtitle={`Wydano ${stats.totalSpent} XP`}
          color="purple"
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          label="Aktywne nagrody"
          value={stats.activeRewards}
          subtitle={`${stats.expiredRewards} wygasłych`}
          color="yellow"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Bonusowe XP"
          value={stats.xpBoosts.totalBonusXP}
          subtitle={`z ${stats.xpBoosts.totalActivated} boostów`}
          color="green"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="ROI (zwrot)"
          value={`${roiPercent}%`}
          subtitle="bonus XP vs koszt"
          color="blue"
        />
      </div>

      {/* Szczegółowe statystyki */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* XP Boosts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              XP Boosty
            </CardTitle>
            <CardDescription>Statystyki boostów XP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Całkowite XP</span>
                <span className="font-bold">{stats.xpBoosts.totalXPEarned}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bonusowe XP</span>
                <span className="font-bold text-yellow-600">+{stats.xpBoosts.totalBonusXP}</span>
              </div>
              <Progress
                value={(stats.xpBoosts.totalBonusXP / stats.xpBoosts.totalXPEarned) * 100}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Średni mnożnik</div>
                <div className="text-lg font-bold">
                  x{stats.xpBoosts.averageMultiplier.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Najlepszy mnożnik</div>
                <div className="text-lg font-bold text-green-600">
                  x{stats.xpBoosts.bestMultiplier.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Łączny czas aktywnych boostów:</span>
                <span className="font-semibold">{Math.round(stats.xpBoosts.totalDuration)}h</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Motywy i Tytuły */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Motywy & Tytuły
            </CardTitle>
            <CardDescription>Kosmetyczne ulepszenia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">🎨 Motywy</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Odblokowane</span>
                  <span className="font-semibold">{stats.themes.totalUnlocked}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aktualny</span>
                  {stats.themes.currentTheme ? (
                    <Badge variant="secondary">{stats.themes.currentTheme}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Domyślny</span>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Zmian motywu</span>
                  <span>{stats.themes.themeChanges}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">👑 Tytuły</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Odblokowane</span>
                  <span className="font-semibold">{stats.titles.totalUnlocked}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aktualny</span>
                  {stats.titles.currentTitle ? (
                    <Badge variant="secondary" className="max-w-[150px] truncate">
                      {stats.titles.currentTitle}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">Brak</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historia użycia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia Aktywacji
          </CardTitle>
          <CardDescription>Ostatnio aktywowane nagrody</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak historii aktywacji
            </div>
          ) : (
            <div className="space-y-3">
              {stats.history.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.rewardName}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.activatedAt).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    {item.duration && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(item.duration / 3600)}h
                      </div>
                    )}
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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  color: 'yellow' | 'purple' | 'blue' | 'green';
}

function StatCard({ icon, label, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    yellow: 'from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800',
    purple: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800',
    blue: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800',
    green: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800',
  };

  return (
    <Card className={cn('border-2 bg-gradient-to-br', colorClasses[color])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div>
          <div className="text-2xl font-bold mb-1">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
      </CardContent>
    </Card>
  );
}

