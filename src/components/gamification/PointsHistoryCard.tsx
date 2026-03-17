'use client';

import { useState, useEffect } from 'react';
import { History, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PointsHistoryEntry {
  id: string;
  amount: number;
  reason: string;
  type: 'EARNED' | 'SPENT' | 'BONUS' | 'PENALTY';
  createdAt: Date;
}

interface PointsHistoryCardProps {
  className?: string;
}

const typeConfig = {
  EARNED: { icon: TrendingUp, label: 'Zdobyte', color: 'text-green-600' },
  SPENT: { icon: TrendingDown, label: 'Wydane', color: 'text-red-600' },
  BONUS: { icon: Award, label: 'Bonus', color: 'text-yellow-600' },
  PENALTY: { icon: TrendingDown, label: 'Kara', color: 'text-orange-600' },
};

export function PointsHistoryCard({ className }: PointsHistoryCardProps) {
  const [history, setHistory] = useState<PointsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/gamification/points-history?limit=50');
      if (response.ok) {
        const data: PointsHistoryEntry[] = await response.json();
        setHistory(data.map((entry) => ({
          ...entry,
          createdAt: new Date(entry.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading points history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = filter === 'all'
    ? history
    : history.filter(entry => entry.type === filter);

  const stats = {
    earned: history.filter(h => h.type === 'EARNED').reduce((sum, h) => sum + h.amount, 0),
    spent: history.filter(h => h.type === 'SPENT').reduce((sum, h) => sum + Math.abs(h.amount), 0),
    bonus: history.filter(h => h.type === 'BONUS').reduce((sum, h) => sum + h.amount, 0),
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historia punktów
        </CardTitle>
        <CardDescription>
          Śledzenie wszystkich transakcji punktów
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">+{stats.earned}</div>
            <div className="text-xs text-muted-foreground">Zdobyte</div>
          </div>
          <div className="text-center p-2 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600">-{stats.spent}</div>
            <div className="text-xs text-muted-foreground">Wydane</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">+{stats.bonus}</div>
            <div className="text-xs text-muted-foreground">Bonusy</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Wszystkie</TabsTrigger>
            <TabsTrigger value="EARNED">Zdobyte</TabsTrigger>
            <TabsTrigger value="SPENT">Wydane</TabsTrigger>
            <TabsTrigger value="BONUS">Bonusy</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ładowanie...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Brak transakcji</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {filteredHistory.map((entry) => {
                    const config = typeConfig[entry.type];
                    const Icon = config.icon;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full bg-muted ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {entry.reason}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {config.label}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(entry.createdAt, {
                                  addSuffix: true,
                                  locale: pl
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className={`font-bold text-lg ${config.color} whitespace-nowrap ml-2`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

