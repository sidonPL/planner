'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Lock, CheckCircle2, Trophy, Sparkles } from 'lucide-react';

interface TieredAchievementCardProps {
  seriesName: string;
  tiers: {
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: number;
    tierName: string;
    requirementValue: number;
    xpReward: number;
    unlocked: boolean;
    progress?: number;
    unlockedAt?: Date;
  }[];
  currentProgress: number;
  className?: string;
}

const tierColors = {
  1: { // Bronze
    bg: 'bg-gradient-to-br from-amber-900/20 to-orange-900/20 dark:from-amber-900/30 dark:to-orange-900/30',
    border: 'border-amber-700/50',
    badge: 'bg-amber-700 text-white',
    glow: 'shadow-amber-500/20',
  },
  2: { // Silver
    bg: 'bg-gradient-to-br from-slate-400/20 to-slate-500/20 dark:from-slate-400/30 dark:to-slate-500/30',
    border: 'border-slate-400/50',
    badge: 'bg-slate-400 text-slate-900',
    glow: 'shadow-slate-400/20',
  },
  3: { // Gold
    bg: 'bg-gradient-to-br from-yellow-400/20 to-amber-500/20 dark:from-yellow-400/30 dark:to-amber-500/30',
    border: 'border-yellow-500/50',
    badge: 'bg-yellow-500 text-yellow-950',
    glow: 'shadow-yellow-500/20',
  },
  4: { // Platinum
    bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 dark:from-purple-500/30 dark:to-pink-500/30',
    border: 'border-purple-500/50',
    badge: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    glow: 'shadow-purple-500/20',
  },
};

export function TieredAchievementCard({
  seriesName,
  tiers,
  currentProgress,
  className,
}: TieredAchievementCardProps) {
  const currentTier = tiers.find(t => !t.unlocked) || tiers[tiers.length - 1];
  const unlockedTiers = tiers.filter(t => t.unlocked);
  const nextTier = tiers.find(t => !t.unlocked);

  const progressPercent = nextTier
    ? Math.min((currentProgress / nextTier.requirementValue) * 100, 100)
    : 100;

  const allUnlocked = unlockedTiers.length === tiers.length;

  return (
    <Card className={cn(
      'overflow-hidden transition-all duration-300 hover:shadow-lg',
      className
    )}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{currentTier.icon}</div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                {seriesName}
                {allUnlocked && (
                  <Sparkles className="h-4 w-4 text-purple-500" />
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {allUnlocked ? 'Seria ukończona!' : `${unlockedTiers.length}/${tiers.length} odblokowań`}
              </p>
            </div>
          </div>

          {!allUnlocked && (
            <Badge variant="outline" className="text-xs">
              {currentProgress} / {nextTier?.requirementValue}
            </Badge>
          )}
        </div>

        {/* Progress Bar for Next Tier */}
        {!allUnlocked && nextTier && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">
                Do następnego poziomu: <strong>{nextTier.tierName}</strong>
              </span>
              <span className="font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        {/* Tiers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiers.map((tier) => {
            const colors = tierColors[tier.tier as keyof typeof tierColors];
            const isNext = tier.id === nextTier?.id;

            return (
              <div
                key={tier.id}
                className={cn(
                  'relative p-3 rounded-lg border-2 transition-all duration-300',
                  tier.unlocked ? colors.bg : 'bg-muted/50',
                  tier.unlocked ? colors.border : 'border-muted',
                  tier.unlocked && 'shadow-lg',
                  tier.unlocked && colors.glow,
                  isNext && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
              >
                {/* Tier Badge */}
                <div className="absolute -top-2 -right-2">
                  {tier.unlocked ? (
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="bg-muted text-muted-foreground rounded-full p-1">
                      <Lock className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="text-center">
                  <div className={cn(
                    'inline-flex items-center justify-center w-10 h-10 rounded-full mb-2',
                    tier.unlocked ? colors.badge : 'bg-muted'
                  )}>
                    {tier.tier === 1 && '🥉'}
                    {tier.tier === 2 && '🥈'}
                    {tier.tier === 3 && '🥇'}
                    {tier.tier === 4 && '💎'}
                  </div>

                  <p className={cn(
                    'text-xs font-semibold mb-1',
                    tier.unlocked ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {tier.tierName}
                  </p>

                  <p className="text-xs text-muted-foreground mb-1">
                    {tier.requirementValue}
                  </p>

                  <Badge
                    variant={tier.unlocked ? 'default' : 'outline'}
                    className="text-[10px] px-1 py-0"
                  >
                    +{tier.xpReward} XP
                  </Badge>
                </div>

                {/* Progress for current tier */}
                {isNext && tier.progress !== undefined && (
                  <div className="mt-2">
                    <Progress
                      value={(currentProgress / tier.requirementValue) * 100}
                      className="h-1"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All Complete Trophy */}
        {allUnlocked && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Seria ukończona! 🎉
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

