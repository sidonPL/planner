'use client';

import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Sparkles, Zap, TrendingUp } from 'lucide-react';
import { playLevelUp } from '@/lib/sound-effects';

interface XPToastOptions {
  xpAdded: number;
  bonusXP?: number;
  reason?: string;
  boostActive?: boolean;
  leveledUp?: boolean;
  newLevel?: number;
  withConfetti?: boolean;
  withSound?: boolean;
}

/**
 * Pokazuje toast z informacją o zdobytym XP
 * Automatycznie obsługuje bonusy i awanse
 */
export function showXPToast(options: XPToastOptions) {
  const {
    xpAdded,
    bonusXP = 0,
    reason,
    boostActive = false,
    leveledUp = false,
    newLevel,
    withConfetti = leveledUp,
    withSound = true,
  } = options;

  if (withSound) {
    playLevelUp();
  }

  if (withConfetti) {
    confetti({
      particleCount: leveledUp ? 150 : 50,
      spread: leveledUp ? 100 : 70,
      origin: { y: 0.6 },
      colors: leveledUp
        ? ['#FFD700', '#FFA500', '#FF6347', '#FF1493']
        : ['#FFD700', '#FFA500'],
    });
  }

  // Toast dla awansu poziomem
  if (leveledUp && newLevel) {
    toast.success(
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-base">Awans na poziom {newLevel}! 🎉</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            +{xpAdded} XP{bonusXP > 0 && ` (+${bonusXP} bonus)`}
            {reason && ` • ${reason}`}
          </div>
        </div>
      </div>,
      {
        duration: 6000,
        style: {
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
          border: '2px solid #FCD34D',
        },
      }
    );
    return;
  }

  // Standardowy toast XP
  const hasBonus = bonusXP > 0 && boostActive;
  const icon = hasBonus ? (
    <Zap className="h-5 w-5 fill-yellow-500 text-yellow-500" />
  ) : (
    <Sparkles className="h-5 w-5 text-yellow-600" />
  );

  toast.success(
    <div className="flex items-center gap-2">
      {icon}
      <div>
        <span className="font-bold text-yellow-700 dark:text-yellow-300">
          +{xpAdded} XP
        </span>
        {hasBonus && (
          <span className="ml-1.5 text-xs text-orange-600 dark:text-orange-400 font-semibold">
            (+{bonusXP} bonus!)
          </span>
        )}
        {reason && (
          <span className="ml-2 text-xs text-muted-foreground">• {reason}</span>
        )}
      </div>
    </div>,
    {
      duration: 3000,
      className: hasBonus
        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-300 dark:border-yellow-700'
        : undefined,
    }
  );
}

/**
 * Hook do łatwego używania XP toast
 */
export function useXPToast() {
  return {
    showXP: showXPToast,
  };
}

