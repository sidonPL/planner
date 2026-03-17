'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Star, Sparkles, Crown, Zap, Lock, ShoppingCart, Calendar, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import confetti from 'canvas-confetti';
import Link from 'next/link';

interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointsCost: number;
  isActive: boolean;
  stock: number | null;
  type: 'COSMETIC' | 'FUNCTIONAL' | 'EXCLUSIVE' | 'PHYSICAL';
  category: 'AVATAR' | 'BADGE' | 'TITLE' | 'PERK' | 'THEME' | 'PHYSICAL' | 'OTHER';
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  isSeasonal: boolean;
  seasonName?: string;
  availableFrom?: Date;
  availableUntil?: Date;
  requiredLevel?: number;
  requiredAchievementId?: string;
  effectData?: any;
}

interface UserStats {
  xp: number;
  level: number;
  unlockedAchievements: string[];
}

const rarityConfig = {
  COMMON: { color: 'text-gray-500', bg: 'bg-gray-500/10', icon: Star, label: 'Zwykłe' },
  RARE: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Sparkles, label: 'Rzadkie' },
  EPIC: { color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Zap, label: 'Epicki' },
  LEGENDARY: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', icon: Crown, label: 'Legendarne' },
};

const categoryIcons = {
  AVATAR: '👤',
  BADGE: '🛡️',
  TITLE: '👑',
  PERK: '⚡',
  THEME: '🎨',
  PHYSICAL: '🎁',
  OTHER: '✨',
};

export default function RewardShopPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rewardsRes, statsRes] = await Promise.all([
        fetch('/api/gamification/rewards'),
        fetch('/api/gamification/user-stats'),
      ]);

      if (rewardsRes.ok) {
        const data = await rewardsRes.json();
        setRewards(data);
      } else {
        const error = await rewardsRes.json().catch(() => ({}));
        toast.error(error.error || 'Nie udało się pobrać nagród');
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setUserStats(data);
      } else {
        const error = await statsRes.json().catch(() => ({}));
        toast.error(error.error || 'Nie udało się pobrać statystyk gracza');
      }
    } catch (error) {
      console.error('Error loading reward shop:', error);
      toast.error('Nie udało się załadować sklepu');
    } finally {
      setLoading(false);
    }
  };

  const canPurchase = (reward: Reward): { can: boolean; reason?: string } => {
    if (!userStats) return { can: false, reason: 'Ładowanie...' };

    if (!reward.isActive) return { can: false, reason: 'Niedostępne' };

    if (userStats.xp < reward.pointsCost) {
      return { can: false, reason: `Brakuje ${reward.pointsCost - userStats.xp} XP` };
    }

    if (reward.requiredLevel && userStats.level < reward.requiredLevel) {
      return { can: false, reason: `Wymagany poziom ${reward.requiredLevel}` };
    }

    if (reward.requiredAchievementId && !userStats.unlockedAchievements.includes(reward.requiredAchievementId)) {
      return { can: false, reason: 'Brakuje osiągnięcia' };
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return { can: false, reason: 'Wyprzedane' };
    }

    if (reward.availableUntil && new Date() > new Date(reward.availableUntil)) {
      return { can: false, reason: 'Wygasło' };
    }

    return { can: true };
  };

  const handlePurchase = async (reward: Reward) => {
    try {
      setPurchasing(true);
      const response = await fetch('/api/gamification/rewards/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id }),
      });

      if (response.ok) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        toast.success(`Zakupiono: ${reward.name}! 🎉`);
        setSelectedReward(null);
        await loadData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Nie udało się kupić nagrody');
      }
    } catch (error) {
      console.error('Error purchasing reward:', error);
      toast.error('Wystąpił błąd');
    } finally {
      setPurchasing(false);
    }
  };

  const categories = ['ALL', 'AVATAR', 'BADGE', 'TITLE', 'PERK', 'THEME', 'PHYSICAL'];

  const filteredRewards = rewards.filter(
    (r) => selectedCategory === 'ALL' || r.category === selectedCategory
  );

  const seasonalRewards = rewards.filter((r) => r.isSeasonal && r.isActive);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Ładowanie sklepu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-purple-500" />
            Sklep z Nagrodami
          </h1>
          <p className="text-muted-foreground">
            Wydaj swoje XP na nagrody i ulepszenia!
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/rewards/stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              Statystyki
            </Link>
          </Button>
          {userStats && (
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-500">
                {userStats.xp} XP
              </div>
              <div className="text-sm text-muted-foreground">
                Dostępne punkty
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Seasonal Rewards Banner */}
      {seasonalRewards.length > 0 && (
        <Card className="border-purple-500/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              Nagrody Sezonowe
            </CardTitle>
            <CardDescription>
              Limitowane nagrody dostępne tylko przez ograniczony czas!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {seasonalRewards.map((reward) => (
                <RewardCard
                  key={reward.id}
                  reward={reward}
                  userStats={userStats}
                  onSelect={setSelectedReward}
                  canPurchase={canPurchase}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category === 'ALL' ? 'Wszystkie' : `${categoryIcons[category as keyof typeof categoryIcons]} ${category}`}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRewards.map((reward) => (
              <RewardCard
                key={reward.id}
                reward={reward}
                userStats={userStats}
                onSelect={setSelectedReward}
                canPurchase={canPurchase}
              />
            ))}
          </div>

          {filteredRewards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Brak nagród w tej kategorii
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Purchase Dialog */}
      {selectedReward && (
        <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-3xl">{selectedReward.icon}</span>
                {selectedReward.name}
              </DialogTitle>
              <DialogDescription>{selectedReward.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Rarity */}
              <div className="flex items-center gap-2">
                {React.createElement(rarityConfig[selectedReward.rarity].icon, {
                  className: `h-5 w-5 ${rarityConfig[selectedReward.rarity].color}`,
                })}
                <span className="font-medium">{rarityConfig[selectedReward.rarity].label}</span>
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-medium">Koszt:</span>
                <span className="text-2xl font-bold text-purple-500">
                  {selectedReward.pointsCost} XP
                </span>
              </div>

              {/* Requirements */}
              {(selectedReward.requiredLevel || selectedReward.requiredAchievementId) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Wymagania:</p>
                  {selectedReward.requiredLevel && (
                    <Badge variant="outline">Poziom {selectedReward.requiredLevel}+</Badge>
                  )}
                  {selectedReward.requiredAchievementId && (
                    <Badge variant="outline">Specjalne osiągnięcie</Badge>
                  )}
                </div>
              )}

              {/* Stock */}
              {selectedReward.stock !== null && (
                <div className="text-sm text-muted-foreground">
                  Pozostało: {selectedReward.stock} sztuk
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReward(null)}>
                Anuluj
              </Button>
              <Button
                onClick={() => handlePurchase(selectedReward)}
                disabled={!canPurchase(selectedReward).can || purchasing}
              >
                {purchasing ? (
                  'Kupowanie...'
                ) : canPurchase(selectedReward).can ? (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Kup teraz
                  </>
                ) : (
                  canPurchase(selectedReward).reason
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function RewardCard({
  reward,
  userStats,
  onSelect,
  canPurchase,
}: {
  reward: Reward;
  userStats: UserStats | null;
  onSelect: (reward: Reward) => void;
  canPurchase: (reward: Reward) => { can: boolean; reason?: string };
}) {
  const rarityInfo = rarityConfig[reward.rarity];
  const RarityIcon = rarityInfo.icon;
  const purchaseInfo = canPurchase(reward);

  return (
    <Card
      className={`transition-all hover:shadow-lg cursor-pointer border-2 ${rarityInfo.bg} ${
        purchaseInfo.can ? 'hover:border-purple-500' : 'opacity-60'
      }`}
      onClick={() => onSelect(reward)}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Icon & Rarity */}
          <div className="flex items-start justify-between">
            <div className="text-5xl">{reward.icon}</div>
            <RarityIcon className={`h-5 w-5 ${rarityInfo.color}`} />
          </div>

          {/* Info */}
          <div className="space-y-2">
            <h3 className="font-bold">{reward.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {reward.description}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {categoryIcons[reward.category]} {reward.category}
            </Badge>
            {reward.isSeasonal && (
              <Badge variant="secondary" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {reward.seasonName || 'Sezonowe'}
              </Badge>
            )}
            {reward.stock !== null && (
              <Badge variant="secondary" className="text-xs">
                {reward.stock} szt.
              </Badge>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {purchaseInfo.can ? 'Dostępne' : purchaseInfo.reason}
            </span>
            <span className={`text-lg font-bold ${rarityInfo.color}`}>
              {reward.pointsCost} XP
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

