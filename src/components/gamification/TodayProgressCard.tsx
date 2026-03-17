'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  TrendingUp,
  Flame,
  Star,
  Clock,
  Target,
  Award,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface TodayProgress {
  tasksCompleted: number;
  tasksTotal: number;
  questsCompleted: number;
  questsTotal: number;
  recipesCooked: number;
  minutesActive: number;
  xpEarned: number;
  streakActive: boolean;
  recentActivities: Array<{
    type: 'TASK' | 'QUEST' | 'RECIPE' | 'ACHIEVEMENT';
    title: string;
    xp: number;
    timestamp: Date;
    icon: string;
  }>;
}

export function TodayProgressCard() {
  const [progress, setProgress] = useState<TodayProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
    // Odśwież co 30 sekund
    const interval = setInterval(loadProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadProgress = async () => {
    try {
      const response = await fetch('/api/gamification/today-progress');
      if (response.ok) {
        const data = await response.json();
        setProgress({
          ...data,
          recentActivities: (data.recentActivities || []).map((a: { type: string; title: string; xp: number; timestamp: string; icon: string }) => ({
            ...a,
            timestamp: new Date(a.timestamp),
          })),
        });
      }
    } catch (error) {
      console.error('Error loading today progress:', error);
    } finally {
      setLoading(false);
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

  if (!progress) return null;

  const tasksProgress = progress.tasksTotal > 0
    ? (progress.tasksCompleted / progress.tasksTotal) * 100
    : 0;
  const questsProgress = progress.questsTotal > 0
    ? (progress.questsCompleted / progress.questsTotal) * 100
    : 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'QUEST':
        return <Target className="h-4 w-4 text-blue-500" />;
      case 'RECIPE':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'ACHIEVEMENT':
        return <Award className="h-4 w-4 text-purple-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Dzisiejszy postęp
            </CardTitle>
            <CardDescription>Twoja aktywność z dzisiaj</CardDescription>
          </div>
          {progress.streakActive && (
            <Badge variant="default" className="gap-1">
              <Flame className="h-3 w-3" />
              Streak aktywny!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Główne statystyki */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <CheckCircle2 className="h-3 w-3" />
              <span>Zadania</span>
            </div>
            <div className="text-2xl font-bold">
              {progress.tasksCompleted}/{progress.tasksTotal}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Target className="h-3 w-3" />
              <span>Questy</span>
            </div>
            <div className="text-2xl font-bold">
              {progress.questsCompleted}/{progress.questsTotal}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Star className="h-3 w-3" />
              <span>Przepisy</span>
            </div>
            <div className="text-2xl font-bold">{progress.recipesCooked}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Award className="h-3 w-3" />
              <span>XP zdobyte</span>
            </div>
            <div className="text-2xl font-bold text-primary">+{progress.xpEarned}</div>
          </div>
        </div>

        {/* Paski postępu */}
        <div className="space-y-4">
          {progress.tasksTotal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Zadania</span>
                <span className="font-medium">{Math.round(tasksProgress)}%</span>
              </div>
              <Progress value={tasksProgress} className="h-2" />
            </div>
          )}

          {progress.questsTotal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Quests</span>
                <span className="font-medium">{Math.round(questsProgress)}%</span>
              </div>
              <Progress value={questsProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Ostatnia aktywność */}
        {progress.recentActivities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ostatnia aktywność
            </h4>
            <div className="space-y-2">
              {progress.recentActivities.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </p>
                  </div>
                  {activity.xp > 0 && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      +{activity.xp} XP
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Czas aktywności */}
        {progress.minutesActive > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Czas aktywności dzisiaj</span>
              </div>
              <span className="font-semibold">{progress.minutesActive} min</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

