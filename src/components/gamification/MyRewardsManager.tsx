'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Power,
  PowerOff,
  Clock,
  Sparkles,
  Zap,
  Palette,
  Crown,
  Star,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClaimedReward {
  id: string;
  rewardId: string;
  claimedAt: string;
  isActive: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  usedCount: number;
  maxUses: number | null;
  metadata: unknown;
  reward: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    type: string;
    rarity: string;
    pointsCost: number;
    effectData: unknown;
  };
}

type IconComponent = React.ComponentType<{ className?: string }>;

const categoryIcons: Record<string, IconComponent> = {
  AVATAR: Palette,
  BADGE: Star,
  TITLE: Crown,
  PERK: Zap,
  THEME: Sparkles,
  PHYSICAL: Gift,
  OTHER: Sparkles,
};

const rarityColors: Record<string, string> = {
  COMMON: 'text-gray-500 border-gray-300',
  RARE: 'text-blue-500 border-blue-300',
  EPIC: 'text-purple-500 border-purple-300',
  LEGENDARY: 'text-yellow-500 border-yellow-300',
};

export function MyRewardsManager() {
  const [rewards, setRewards] = useState<{
    all: ClaimedReward[];
    grouped: Record<string, ClaimedReward[]>;
    active: ClaimedReward[];
    inactive: ClaimedReward[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchMyRewards();
  }, []);

  const fetchMyRewards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gamification/my-rewards');
      if (res.ok) {
        const data = await res.json();
        setRewards(data);
      }
    } catch (error) {
      console.error('Error fetching my rewards:', error);
      toast.error('Nie udało się załadować nagród');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (claimedRewardId: string) => {
    try {
      const res = await fetch(
        `/api/gamification/claimed-rewards/${claimedRewardId}/activate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) }
      );

      if (res.ok) {
        toast.success('Nagroda została aktywowana! 🎉');
        fetchMyRewards();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Nie udało się aktywować nagrody');
      }
    } catch (error) {
      console.error('Error activating reward:', error);
      toast.error('Wystąpił błąd');
    }
  };

  const handleDeactivate = async (claimedRewardId: string) => {
    try {
      const res = await fetch(
        `/api/gamification/claimed-rewards/${claimedRewardId}/activate`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        toast.success('Nagroda została wyłączona');
        fetchMyRewards();
      } else {
        toast.error('Nie udało się wyłączyć nagrody');
      }
    } catch (error) {
      console.error('Error deactivating reward:', error);
      toast.error('Wystąpił błąd');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie nagród...</p>
        </div>
      </div>
    );
  }

  if (!rewards || rewards.all.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Nie masz jeszcze żadnych nagród</h3>
          <p className="text-muted-foreground mb-4">
            Odwiedź sklep nagród i kup swoją pierwszą nagrodę!
          </p>
          <Button asChild>
            <a href="/rewards">Przejdź do sklepu</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const categories = ['ALL', ...Object.keys(rewards.grouped)];
  const displayRewards =
    selectedCategory === 'ALL'
      ? rewards.all
      : rewards.grouped[selectedCategory] || [];

  return (
    <div className="space-y-6">
      {/* Active Rewards Summary */}
      {rewards.active.length > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Aktywne Nagrody
            </CardTitle>
            <CardDescription>
              Obecnie używasz {rewards.active.length} nagród
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rewards.active.map((cr) => (
                <div
                  key={cr.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background border"
                >
                  <span className="text-2xl">{cr.reward.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{cr.reward.name}</p>
                    {cr.expiresAt && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Wygasa: {new Date(cr.expiresAt).toLocaleString('pl-PL')}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeactivate(cr.id)}
                  >
                    <PowerOff className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Rewards */}
      <Card>
        <CardHeader>
          <CardTitle>Moje Nagrody</CardTitle>
          <CardDescription>
            Zarządzaj swoimi kupionymi nagrodami
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="mb-4">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat === 'ALL' ? 'Wszystkie' : cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayRewards.map((cr) => {
                  const isExpired =
                    cr.expiresAt && new Date(cr.expiresAt) < new Date();
                  const canUse =
                    !cr.maxUses || cr.usedCount < cr.maxUses;

                  return (
                    <Card
                      key={cr.id}
                      className={cn(
                        'relative',
                        cr.isActive && 'ring-2 ring-primary',
                        isExpired && 'opacity-50'
                      )}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{cr.reward.icon}</span>
                            <div>
                              <CardTitle className="text-base">
                                {cr.reward.name}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {cr.reward.category}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              rarityColors[cr.reward.rarity]
                            )}
                          >
                            {cr.reward.rarity}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {cr.reward.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Kupiono: {new Date(cr.claimedAt).toLocaleDateString('pl-PL')}
                        </div>

                        {cr.maxUses && (
                          <div className="text-xs text-muted-foreground">
                            Użycia: {cr.usedCount} / {cr.maxUses}
                          </div>
                        )}

                        {cr.expiresAt && (
                          <div className="text-xs text-muted-foreground">
                            Wygasa: {new Date(cr.expiresAt).toLocaleString('pl-PL')}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {cr.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleDeactivate(cr.id)}
                            >
                              <PowerOff className="h-4 w-4 mr-1" />
                              Wyłącz
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => handleActivate(cr.id)}
                              disabled={isExpired || !canUse}
                            >
                              <Power className="h-4 w-4 mr-1" />
                              {isExpired ? 'Wygasła' : canUse ? 'Aktywuj' : 'Wykorzystana'}
                            </Button>
                          )}
                        </div>

                        {cr.isActive && (
                          <Badge className="w-full justify-center" variant="default">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Aktywna
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

