'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Target, Award, TrendingUp, Zap } from 'lucide-react';

export function AdminStatsOverview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/gamification/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Ładowanie statystyk...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">Brak danych</div>;
  }

  const statCards = [
    {
      title: 'Aktywni użytkownicy',
      value: stats.activeUsers || 0,
      description: 'W ostatnich 7 dniach',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Total XP',
      value: stats.totalXP?.toLocaleString() || '0',
      description: 'Zdobyte przez wszystkich',
      icon: Zap,
      color: 'text-yellow-500',
    },
    {
      title: 'Osiągnięcia',
      value: `${stats.unlockedAchievements || 0} / ${stats.totalAchievements || 0}`,
      description: 'Odblokowanych',
      icon: Trophy,
      color: 'text-purple-500',
    },
    {
      title: 'Daily Quests',
      value: `${stats.completedQuests || 0} / ${stats.totalQuests || 0}`,
      description: 'Ukończonych dziś',
      icon: Target,
      color: 'text-green-500',
    },
    {
      title: 'Avg Level',
      value: stats.avgLevel?.toFixed(1) || '0',
      description: 'Średni poziom',
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      title: 'Odznaki',
      value: `${stats.unlockedBadges || 0} / ${stats.totalBadges || 0}`,
      description: 'Odblokowanych',
      icon: Award,
      color: 'text-pink-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Ostatnia aktywność</CardTitle>
          <CardDescription>Najnowsze wydarzenia w systemie gamifikacji</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity?.map((activity: any, index: number) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{activity.message}</p>
                  <p className="text-sm text-muted-foreground">{activity.timestamp}</p>
                </div>
                {activity.xp && (
                  <div className="text-yellow-600 font-bold">+{activity.xp} XP</div>
                )}
              </div>
            )) || <p className="text-muted-foreground">Brak aktywności</p>}
          </div>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Użytkowników</CardTitle>
          <CardDescription>Ranking według XP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topUsers?.map((user: any, index: number) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="font-bold text-lg w-8 text-center">#{index + 1}</div>
                <div className="flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">Level {user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-yellow-600">{user.xp.toLocaleString()} XP</p>
                  <p className="text-xs text-muted-foreground">
                    {user.achievementsCount} osiągnięć
                  </p>
                </div>
              </div>
            )) || <p className="text-muted-foreground">Brak użytkowników</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

