/**
 * Event types dla systemu gamifikacji
 */
export const GAMIFICATION_EVENTS = {
  UPDATE: 'gamification:update',
  ACHIEVEMENT_UNLOCKED: 'gamification:achievement-unlocked',
  XP_EARNED: 'gamification:xp-earned',
  LEVEL_UP: 'gamification:level-up',
  STREAK_UPDATED: 'gamification:streak-updated',
} as const;

interface AchievementUnlockedDetail {
  achievement: {
    id: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  };
}

interface XPEarnedDetail {
  xp: number;
  reason: string;
  newTotal: number;
}

interface LevelUpDetail {
  oldLevel: number;
  newLevel: number;
  newXP: number;
}

interface StreakUpdatedDetail {
  streak: number;
  isNew: boolean;
}

/**
 * Emituje event aktualizacji gamifikacji
 */
export function emitGamificationUpdate() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GAMIFICATION_EVENTS.UPDATE));
}

/**
 * Emituje event odblokowania osiągnięcia
 */
export function emitAchievementUnlocked(detail: AchievementUnlockedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, { detail })
  );
  // Również trigger ogólnej aktualizacji
  emitGamificationUpdate();
}

/**
 * Emituje event zdobycia XP
 */
export function emitXPEarned(detail: XPEarnedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GAMIFICATION_EVENTS.XP_EARNED, { detail })
  );
  emitGamificationUpdate();
}

/**
 * Emituje event awansu na poziom
 */
export function emitLevelUp(detail: LevelUpDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GAMIFICATION_EVENTS.LEVEL_UP, { detail })
  );
  emitGamificationUpdate();
}

/**
 * Emituje event aktualizacji streaka
 */
export function emitStreakUpdated(detail: StreakUpdatedDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GAMIFICATION_EVENTS.STREAK_UPDATED, { detail })
  );
  emitGamificationUpdate();
}

/**
 * Hook do nasłuchiwania na event aktualizacji gamifikacji
 */
export function useGamificationUpdate(callback: () => void) {
  if (typeof window === 'undefined') return;

  const handleUpdate = () => callback();

  window.addEventListener(GAMIFICATION_EVENTS.UPDATE, handleUpdate);

  return () => {
    window.removeEventListener(GAMIFICATION_EVENTS.UPDATE, handleUpdate);
  };
}

/**
 * Hook do nasłuchiwania na event odblokowania osiągnięcia
 */
export function useAchievementUnlocked(
  callback: (detail: AchievementUnlockedDetail) => void
) {
  if (typeof window === 'undefined') return;

  const handleEvent = (event: Event) => {
    const customEvent = event as CustomEvent<AchievementUnlockedDetail>;
    callback(customEvent.detail);
  };

  window.addEventListener(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, handleEvent);

  return () => {
    window.removeEventListener(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, handleEvent);
  };
}

