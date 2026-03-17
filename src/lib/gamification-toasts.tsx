import confetti from 'canvas-confetti';
import { toast } from 'sonner';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
}

export function showAchievementToast(achievement: Achievement) {
  // Confetti explosion
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347'],
  });

  // Custom toast with gradient background
  toast.custom((t) => (
    <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 p-4 rounded-lg shadow-xl border-2 border-white dark:border-gray-800">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="text-5xl animate-bounce">
          {achievement.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="font-bold text-white text-lg">
            🎉 Osiągnięcie odblokowane!
          </h4>
          <p className="text-white font-semibold">
            {achievement.name}
          </p>
          <p className="text-white/90 text-sm">
            {achievement.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-white/20 text-white px-2 py-1 rounded text-sm font-bold">
              +{achievement.xpReward} XP
            </span>
            <span className="text-yellow-200 text-xs">
              ⭐ Gratulacje!
            </span>
          </div>
        </div>
      </div>
    </div>
  ), {
    duration: 5000,
  });
}

export function showXPGainToast(amount: number, reason: string) {
  toast.success(
    <div className="flex items-center gap-2">
      <span className="text-2xl">⚡</span>
      <div>
        <div className="font-bold">+{amount} XP</div>
        <div className="text-sm text-muted-foreground">{reason}</div>
      </div>
    </div>,
    {
      duration: 3000,
    }
  );
}

export function showLevelUpToast(newLevel: number) {
  confetti({
    particleCount: 200,
    spread: 120,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347', '#9333EA'],
  });

  toast.custom((t) => (
    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-4 rounded-lg shadow-xl border-2 border-white dark:border-gray-800">
      <div className="flex items-center gap-3">
        <div className="text-5xl">
          🎉
        </div>
        <div>
          <h4 className="font-bold text-white text-lg">
            Awans na poziom {newLevel}!
          </h4>
          <p className="text-white/90 text-sm">
            Gratulacje! Osiągnąłeś nowy poziom!
          </p>
        </div>
      </div>
    </div>
  ), {
    duration: 5000,
  });
}

