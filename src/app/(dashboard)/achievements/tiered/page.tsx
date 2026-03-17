'use client';

import { useState, useEffect } from 'react';
import { TieredAchievementCard } from '@/components/gamification/TieredAchievementCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Tier {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  tierName: string;
  requirementValue: number;
  xpReward: number;
  unlocked: boolean;
  progress: number;
  unlockedAt?: Date;
}

interface Series {
  seriesName: string;
  icon: string;
  category: string;
  tiers: Tier[];
  currentProgress: number;
  unlockedCount: number;
  totalCount: number;
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

export default function TieredAchievementsPage() {
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    loadTieredAchievements();
  }, []);

  const loadTieredAchievements = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/achievements/tiered');
      if (response.ok) {
        const data = await response.json();
        setSeries(data.series || []);
      }
    } catch (error) {
      console.error('Error loading tiered achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSeries = selectedCategory === 'ALL'
    ? series
    : series.filter(s => s.category === selectedCategory);

  const categories = ['ALL', ...Array.from(new Set(series.map(s => s.category)))];

  const totalUnlocked = series.reduce((sum, s) => sum + s.unlockedCount, 0);
  const totalAchievements = series.reduce((sum, s) => sum + s.totalCount, 0);
  const completedSeries = series.filter(s => s.unlockedCount === s.totalCount).length;

  if (loading) {
    return (
      <div className="container max-w-7xl mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/achievements">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Osiągnięcia Wielopoziomowe
            </h1>
            <p className="text-muted-foreground">
              Zdobądź wszystkie poziomy w każdej serii: Bronze → Silver → Gold → Platinum
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Odblokowane Poziomy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalUnlocked}/{totalAchievements}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round((totalUnlocked / totalAchievements) * 100)}% ukończenia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ukończone Serie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {completedSeries}/{series.length}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round((completedSeries / series.length) * 100)}% serii
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dostępne Serie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{series.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {series.length * 4} poziomów do zdobycia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-9 w-full">
          {categories.map((cat) => (
            <TabsTrigger key={cat} value={cat} className="text-xs">
              {cat === 'ALL' ? 'Wszystkie' : categoryLabels[cat] || cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-6 mt-6">
          {filteredSeries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Brak serii osiągnięć w tej kategorii
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredSeries.map((s) => (
                <TieredAchievementCard
                  key={s.seriesName}
                  seriesName={s.seriesName}
                  tiers={s.tiers}
                  currentProgress={s.currentProgress}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

