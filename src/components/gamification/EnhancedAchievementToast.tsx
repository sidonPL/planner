'use client';

import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { Trophy, Star, Sparkles } from 'lucide-react';
import { playAchievementUnlock, playConfetti } from '@/lib/sound-effects';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

interface EnhancedAchievementToastProps {
  achievement: Achievement;
  duration?: number;
}

/**
 * Pokazuje enhanced toast dla nowego osiągnięcia
 * z konfetti i lepszą wizualizacją
 */
export function showEnhancedAchievementToast(
  achievement: Achievement,
  options?: {
    duration?: number;
    confettiCount?: number;
  }
) {
  const duration = options?.duration || 6000;
  const confettiCount = options?.confettiCount || 100;

  // Play achievement unlock sound
  playAchievementUnlock();

  // Określ kolor konfetti na podstawie XP
  const getConfettiColors = () => {
    if (achievement.xpReward >= 100) {
      return ['#FFD700', '#FFA500', '#FF6347', '#9370DB']; // Rainbow
    } else if (achievement.xpReward >= 50) {
      return ['#FFD700', '#FFA500', '#FF6347']; // Gold-Orange-Red
    } else {
      return ['#FFD700', '#FFA500']; // Gold-Orange
    }
  };

  // Wystrzał konfetti
  const fireConfetti = () => {
    const colors = getConfettiColors();

    // Play confetti sound
    playConfetti();

    // Burst 1 - z lewej
    confetti({
      particleCount: confettiCount / 2,
      angle: 60,
      spread: 55,
      origin: { x: 0.2, y: 0.6 },
      colors,
    });

    // Burst 2 - z prawej
    confetti({
      particleCount: confettiCount / 2,
      angle: 120,
      spread: 55,
      origin: { x: 0.8, y: 0.6 },
      colors,
    });

    // Jeśli duże osiągnięcie (100+ XP) - dodatkowe konfetti
    if (achievement.xpReward >= 100) {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 90,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
          colors,
          shapes: ['star'],
        });
      }, 200);
    }
  };

  // Pokazuje toast z custom JSX
  toast.custom(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => (
      <div
        className={`
          bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 
          dark:from-yellow-950/50 dark:via-orange-950/50 dark:to-red-950/50
          border-2 border-yellow-400 dark:border-yellow-600
          rounded-lg shadow-2xl p-4 min-w-[350px] max-w-[450px]
          animate-in slide-in-from-top-5 
          ${t.visible ? 'animate-in' : 'animate-out'}
        `}
        style={{
          animation: t.visible
            ? 'slide-in-from-top 0.3s ease-out, shake 0.5s ease-in-out 0.3s'
            : 'slide-out-to-top 0.2s ease-in',
        }}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 text-5xl animate-bounce">
            {achievement.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <h3 className="font-bold text-lg text-foreground">
                Osiągnięcie Odblokowane!
              </h3>
            </div>

            <p className="font-semibold text-base text-foreground mb-1">
              {achievement.name}
            </p>

            <p className="text-sm text-muted-foreground mb-2">
              {achievement.description}
            </p>

            <div className="flex items-center gap-2">
              {achievement.xpReward >= 100 ? (
                <Sparkles className="h-4 w-4 text-yellow-500" />
              ) : (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
              <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                +{achievement.xpReward} XP
              </span>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
          }
        `}</style>
      </div>
    ),
    {
      duration,
      position: 'top-center',
    }
  );

  // Wystrzał konfetti po małym opóźnieniu
  setTimeout(fireConfetti, 100);

  // Dodatkowe mini-bursts
  if (achievement.xpReward >= 50) {
    setTimeout(fireConfetti, 400);
    setTimeout(fireConfetti, 800);
  }
}

/**
 * Hook do pokazywania enhanced achievement toasts
 */
export function useEnhancedAchievementToast() {
  return {
    showAchievement: showEnhancedAchievementToast,
  };
}

