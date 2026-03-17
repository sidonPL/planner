'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Clock, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ShoppingStats {
  userStats: {
    userId: string;
    userName: string;
    color: string;
    totalPurchased: number;
    averageTime: number; // w godzinach
  }[];
  categoryStats: {
    category: string;
    count: number;
    mostFrequentBuyer: string;
  }[];
  topProducts: {
    name: string;
    count: number;
    lastPurchasedBy: string;
  }[];
}

export function ShoppingAnalytics() {
  const [stats, setStats] = useState<ShoppingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopping/analytics');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching shopping analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* User Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Statystyki użytkowników
          </CardTitle>
          <CardDescription>Kto najczęściej kupuje i jak szybko</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.userStats.map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="font-medium">{user.userName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>{user.totalPurchased} produktów</span>
                  </div>
                  {user.averageTime > 0 && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>~{Math.round(user.averageTime)}h</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Najpopularniejsze kategorie
          </CardTitle>
          <CardDescription>Co najczęściej kupujecie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                <span className="font-medium">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{cat.count}x</Badge>
                  {cat.mostFrequentBuyer && (
                    <span className="text-xs text-muted-foreground">
                      Zwykle: {cat.mostFrequentBuyer}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Najczęściej kupowane produkty</CardTitle>
          <CardDescription>TOP 10 produktów w historii</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <span>{product.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{product.count}x</Badge>
                  <span className="text-xs text-muted-foreground">
                    Ostatnio: {product.lastPurchasedBy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

