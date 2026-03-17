'use client';

import { Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ProgressRing } from '@/components/ui/progress-ring';
import { CountingNumber } from '@/components/ui/counting-number';

interface LevelProgressCardProps {
  level: number;
  xp: number;
  className?: string;
}

function xpForLevel(level: number): number {
  return level * 100;
}

function calculateLevelProgress(xp: number, level: number): number {
  const xpForCurrentLevel = xpForLevel(level);
  const xpForPreviousLevels = Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1))
    .reduce((sum, xp) => sum + xp, 0);

  const currentLevelXP = xp - xpForPreviousLevels;
  return (currentLevelXP / xpForCurrentLevel) * 100;
}

export function LevelProgressCard({ level, xp, className }: LevelProgressCardProps) {
  const xpNeeded = xpForLevel(level);
  const xpForPreviousLevels = Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1))
    .reduce((sum, xp) => sum + xp, 0);
  const currentLevelXP = xp - xpForPreviousLevels;
  const progress = calculateLevelProgress(xp, level);
  const xpToNextLevel = xpNeeded - currentLevelXP;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
              Poziom {level}
            </CardTitle>
            <CardDescription>
              {currentLevelXP} / {xpNeeded} XP
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-2xl px-4 py-2">
            ⭐ {level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Ring - wizualnie atrakcyjny */}
        <div className="flex items-center justify-center py-4">
          <ProgressRing progress={progress} size={140} strokeWidth={10} showValue={false}>
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold">
                <CountingNumber value={level} duration={1000} />
              </div>
              <div className="text-xs text-muted-foreground">Poziom</div>
              <div className="text-sm font-semibold text-primary mt-1">
                {Math.round(progress)}%
              </div>
            </div>
          </ProgressRing>
        </div>

        {/* Linear progress bar */}
        <Progress value={progress} className="h-3" />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Postęp do następnego poziomu</span>
          </div>
          <span className="font-semibold text-primary">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Potrzebujesz jeszcze <span className="font-semibold text-foreground">{xpToNextLevel} XP</span> do poziomu {level + 1}
        </div>

        {/* Level milestones */}
        <div className="grid grid-cols-5 gap-1 pt-2">
          {Array.from({ length: 5 }, (_, i) => {
            const milestoneLevel = Math.floor(level / 5) * 5 + i + 1;
            const isPast = milestoneLevel < level;
            const isCurrent = milestoneLevel === level;

            return (
              <div
                key={i}
                className={`h-2 rounded-full ${
                  isPast ? 'bg-yellow-500' : 
                  isCurrent ? 'bg-yellow-300' : 
                  'bg-gray-200 dark:bg-gray-700'
                }`}
                title={`Poziom ${milestoneLevel}`}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

