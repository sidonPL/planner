'use client';

import { createElement } from 'react';
import { Lock, Star, Sparkles, Crown, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AchievementIcon } from '@/lib/achievement-icons';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EnhancedAchievementCardProps {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    xpReward: number;
    isSecret: boolean;
    unlocked: boolean;
    unlockedAt?: Date;
    progress?: number;
    currentValue?: number;
    requirementValue: number;
    // New fields
    hint?: string;
    detailedHint?: string;
    showProgressBar?: boolean;
    rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    tierName?: string;
    seriesName?: string;
    badgeUnlock?: string;
    titleUnlock?: string;
  };
  onClick?: () => void;
}

const rarityConfig = {
  COMMON: {
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/20',
    icon: Star,
    label: 'Zwykłe',
  },
  RARE: {
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: Sparkles,
    label: 'Rzadkie',
  },
  EPIC: {
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: Zap,
    label: 'Epicki',
  },
  LEGENDARY: {
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    icon: Crown,
    label: 'Legendarne',
  },
};

export function EnhancedAchievementCard({ achievement, onClick }: EnhancedAchievementCardProps) {
  const isLocked = !achievement.unlocked;
  const rarity = achievement.rarity || 'COMMON';
  const rarityInfo = rarityConfig[rarity];

  // Jeśli secret i locked, ukryj szczegóły
  const isHiddenSecret = achievement.isSecret && isLocked;

  const rarityIcon = createElement(rarityInfo.icon, { className: `h-4 w-4 ${rarityInfo.color}` });

  return (
    <TooltipProvider>
      <Card
        className={`
          transition-all hover:shadow-lg cursor-pointer
          ${isLocked ? 'opacity-70' : `border-2 ${rarityInfo.border}`}
          ${isHiddenSecret ? 'relative overflow-hidden' : ''}
        `}
        onClick={onClick}
      >
        {/* Secret achievement overlay */}
        {isHiddenSecret && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="text-center">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Tajemnicze Osiągnięcie</p>
              <p className="text-xs text-muted-foreground">???</p>
            </div>
          </div>
        )}

        <CardContent className="pt-6 relative">
          <div className="space-y-4">
            {/* Header with Icon and Rarity */}
            <div className="flex items-start justify-between">
              {/* Icon */}
              <div className="flex justify-center flex-1">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    isLocked ? 'bg-gray-500/20' : rarityInfo.bg
                  }`}
                >
                  {isLocked && !isHiddenSecret ? (
                    <Lock className="h-8 w-8 text-gray-400" />
                  ) : (
                    <AchievementIcon
                      icon={achievement.icon}
                      className={`h-8 w-8 ${isLocked ? 'text-gray-400' : rarityInfo.color}`}
                      unlocked={false}
                    />
                  )}
                </div>
              </div>

              {/* Rarity Badge */}
              {!isHiddenSecret && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className={`${rarityInfo.bg} rounded-full p-1.5`}>
                      {rarityIcon}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{rarityInfo.label}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Info */}
            {!isHiddenSecret && (
              <>
                <div className="text-center space-y-1">
                  <h3 className="font-bold flex items-center justify-center gap-2">
                    {achievement.name}
                    {achievement.tierName && (
                      <Badge variant="outline" className="text-xs">
                        {achievement.tierName}
                      </Badge>
                    )}
                  </h3>
                  {achievement.seriesName && (
                    <p className="text-xs text-muted-foreground">
                      {achievement.seriesName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>

                {/* Hints for locked achievements */}
                {isLocked && achievement.hint && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      💡 Wskazówka:
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {achievement.hint}
                    </p>
                    {achievement.detailedHint && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-blue-500 hover:text-blue-600">
                          Więcej szczegółów
                        </summary>
                        <p className="text-xs text-muted-foreground mt-1">
                          {achievement.detailedHint}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {/* Progress */}
                {isLocked &&
                  achievement.showProgressBar !== false &&
                  typeof achievement.progress === 'number' && (
                    <div className="space-y-1">
                      <Progress value={achievement.progress} className="h-2" />
                      <div className="text-xs text-center text-muted-foreground">
                        {achievement.currentValue} / {achievement.requirementValue}
                      </div>
                    </div>
                  )}

                {/* Unlocks */}
                {(achievement.badgeUnlock || achievement.titleUnlock) && (
                  <div className="border-t pt-3 space-y-1">
                    <p className="text-xs font-medium text-center">
                      🎁 Odblokowuje:
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {achievement.badgeUnlock && (
                        <Badge variant="secondary" className="text-xs">
                          {achievement.badgeUnlock}
                        </Badge>
                      )}
                      {achievement.titleUnlock && (
                        <Badge variant="secondary" className="text-xs">
                          &ldquo;{achievement.titleUnlock}&rdquo;
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="outline" className="text-xs">
                    {achievement.category}
                  </Badge>
                  <Badge
                    variant={isLocked ? 'secondary' : 'default'}
                    className={isLocked ? '' : rarityInfo.color}
                  >
                    +{achievement.xpReward} XP
                  </Badge>
                </div>

                {achievement.unlocked && achievement.unlockedAt && (
                  <div className="text-xs text-center text-muted-foreground">
                    Odblokowano{' '}
                    {format(new Date(achievement.unlockedAt), 'PPp', {
                      locale: pl,
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

