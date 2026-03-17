"use client";

import { Trophy, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
}

interface BadgeToastProps {
  badges: Badge[];
}

// Konfetti animacja
const triggerConfetti = async () => {
  try {
    const confetti = (await import("canvas-confetti")).default;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  } catch (error) {
    console.error("Confetti error:", error);
  }
};

// Toast component dla odznak
export function BadgeToast({ badges }: BadgeToastProps) {
  return (
    <div className="space-y-2">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-start gap-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
        >
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-600 animate-pulse" />
              <h4 className="font-bold text-sm">Nowa odznaka!</h4>
            </div>
            <p className="font-semibold text-base mt-1">{badge.name}</p>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
            <div className="flex items-center gap-1 mt-2 text-yellow-600">
              <Star className="h-3 w-3 fill-current" />
              <span className="text-xs font-bold">+{badge.points} punktów</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hook do obsługi powiadomień o odznakach
export function useBadgeNotifications() {
  const showBadgeToast = (badges: Badge[]) => {
    if (badges.length === 0) return;

    // Odtwórz dźwięk (opcjonalnie)
    try {
      const audio = new Audio("/sounds/achievement.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore errors if sound file doesn't exist
      });
    } catch {
      // Ignore sound errors
    }

    // Pokaż toast z odznakąmi
    toast.custom(
      () => <BadgeToast badges={badges} />,
      {
        duration: 5000,
        position: "top-center",
      }
    );

    // Uruchom konfetti
    triggerConfetti();
  };

  return { showBadgeToast };
}

// Hook do sprawdzania nowych odznak po akcji
export function useCheckBadges() {
  const { showBadgeToast } = useBadgeNotifications();

  const checkAndShowBadges = (newBadges?: string[]) => {
    if (!newBadges || newBadges.length === 0) return;

    // Pobierz szczegóły odznak
    Promise.all(
      newBadges.map((badgeId) =>
        fetch(`/api/badges/${badgeId}`).then((res) => res.json())
      )
    ).then((badges) => {
      showBadgeToast(badges);
    });
  };

  return { checkAndShowBadges };
}

