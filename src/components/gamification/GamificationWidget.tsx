'use client';

import { useState, useEffect } from 'react';
import { Trophy, Flame, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CountingNumber } from '@/components/ui/counting-number';
import Link from 'next/link';
import { GAMIFICATION_EVENTS } from '@/lib/gamification-events';

interface GamificationStats {
  level: number;
  xp: number;
  xpForNextLevel: number;
  currentStreak: number;
  achievements: number;
  totalTasks: number;
  closestAchievement?: {
    id: string;
    name: string;
    icon: string;
    progress: number;
    target: number;
    progressPercent: number;
  } | null;
}

/**
 * Widget gamifikacji w navbar - zawsze widoczny
 */
export function GamificationWidget() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();

    // Nasłuchuj na eventy aktualizacji gamifikacji
    const handleUpdate = () => {
      loadStats();
    };

    window.addEventListener(GAMIFICATION_EVENTS.UPDATE, handleUpdate);

    return () => {
      window.removeEventListener(GAMIFICATION_EVENTS.UPDATE, handleUpdate);
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/gamification/widget-stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading gamification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Star className="h-4 w-4" />
        <span className="text-sm font-medium">...</span>
      </Button>
    );
  }

  const levelProgress = (stats.xp / stats.xpForNextLevel) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold">
              <CountingNumber value={stats.level} duration={800} />
            </span>
          </div>

          {stats.currentStreak > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10">
              <Flame className="h-3 w-3 text-orange-500" />
              <span className="text-xs font-bold text-orange-600">
                {stats.currentStreak}
              </span>
            </div>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Twój Postęp</h4>
            <Link href="/gamification">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Zobacz więcej
              </Button>
            </Link>
          </div>

          {/* Level Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <span className="font-bold text-lg">Poziom {stats.level}</span>
              </div>
              <Badge variant="secondary" className="font-mono">
                {stats.xp} / {stats.xpForNextLevel} XP
              </Badge>
            </div>
            <Progress value={levelProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {stats.xpForNextLevel - stats.xp} XP do następnego poziomu
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg border bg-card text-center">
              <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" />
              <div className="text-lg font-bold">{stats.currentStreak}</div>
              <div className="text-xs text-muted-foreground">Seria</div>
            </div>

            <div className="p-2 rounded-lg border bg-card text-center">
              <Trophy className="h-4 w-4 mx-auto mb-1 text-purple-500" />
              <div className="text-lg font-bold">{stats.achievements}</div>
              <div className="text-xs text-muted-foreground">Osiągnięcia</div>
            </div>

            <div className="p-2 rounded-lg border bg-card text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-bold">{stats.totalTasks}</div>
              <div className="text-xs text-muted-foreground">Zadania</div>
            </div>
          </div>

          {/* Closest Achievement */}
          {stats.closestAchievement && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Najbliższe osiągnięcie
                </span>
              </div>
              <div className="p-3 rounded-lg border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{stats.closestAchievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {stats.closestAchievement.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stats.closestAchievement.progress} / {stats.closestAchievement.target}
                    </p>
                  </div>
                </div>
                <Progress
                  value={stats.closestAchievement.progressPercent}
                  className="h-2"
                />
              </div>
            </div>
          )}

          {/* CTA */}
          <Link href="/gamification">
            <Button className="w-full" size="sm">
              <Trophy className="h-4 w-4 mr-2" />
              Otwórz Dashboard
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

