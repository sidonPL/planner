'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Sparkles, Palette, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActiveReward {
  id: string;
  reward: {
    name: string;
    icon: string;
    category: string;
  };
  expiresAt: string | null;
}

interface ActiveRewardsDisplayProps {
  className?: string;
}

export function ActiveRewardsDisplay({ className }: ActiveRewardsDisplayProps) {
  const [rewards, setRewards] = useState<ActiveReward[]>([]);
  const [xpBoost, setXpBoost] = useState<{
    multiplier: number;
    expiresAt: string | null;
  } | null>(null);

  const fetchActiveRewards = useCallback(async () => {
    try {
      const res = await fetch('/api/gamification/active-rewards');
      if (res.ok) {
        const data = await res.json();
        setRewards(data.activeRewards || []);

        // Sprawdź XP boost z aktywnych nagród
        if (data.xpBoost?.active) {
          setXpBoost({
            multiplier: data.xpBoost.multiplier,
            expiresAt: data.xpBoost.expiresAt,
          });
        } else {
          setXpBoost(null);
        }
      }
    } catch (error) {
      console.error('Error fetching active rewards:', error);
    }
  }, []);

  useEffect(() => {
    const refresh = () => {
      void fetchActiveRewards();
    };

    const timeout = setTimeout(refresh, 0);
    const interval = setInterval(() => {
      refresh();
    }, 60000); // Refresh co minutę

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchActiveRewards]);

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Wygasło';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (rewards.length === 0 && !xpBoost) {
    return null;
  }

  return (
    <Card className={cn('p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-300', className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span>Aktywne Efekty</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* XP Boost */}
          {xpBoost && (
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
              <Zap className="h-3 w-3 mr-1" />
              +{Math.round((xpBoost.multiplier - 1) * 100)}% XP
              {xpBoost.expiresAt && (
                <span className="ml-1 opacity-70">
                  ({formatTimeRemaining(xpBoost.expiresAt)})
                </span>
              )}
            </Badge>
          )}

          {/* Inne nagrody */}
          {rewards.map((reward) => {
            const Icon =
              reward.reward.category === 'PERK' ? Zap :
              reward.reward.category === 'THEME' ? Palette :
              reward.reward.category === 'TITLE' ? Crown :
              Sparkles;

            return (
              <Badge
                key={reward.id}
                variant="secondary"
                className="bg-purple-500/20 text-purple-700 border-purple-500/30"
              >
                <Icon className="h-3 w-3 mr-1" />
                {reward.reward.icon} {reward.reward.name}
                {reward.expiresAt && (
                  <span className="ml-1 opacity-70">
                    ({formatTimeRemaining(reward.expiresAt)})
                  </span>
                )}
              </Badge>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

