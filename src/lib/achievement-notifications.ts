/**
 * Achievement notifications - pokazywanie progress i powiadomień o osiągnięciach
 */

import { toast } from 'sonner';
import { calculateAchievementProgress } from './achievements';

interface AchievementProgressInfo {
  id: string;
  name: string;
  icon: string;
  category: string;
  progress: number;
  target: number;
  progressPercent: number;
  tierName?: string;
}

/**
 * Sprawdza progress osiągnięć po akcji i pokazuje toast jeśli jest postęp
 */
export async function checkAndNotifyAchievementProgress(
  userId: string,
  requirementTypes: string[]
): Promise<void> {
  try {
    const response = await fetch('/api/gamification/achievements/check-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementTypes }),
    });

    if (response.ok) {
      const data = await response.json();

      // Jeśli są osiągnięcia z postępem
      if (data.achievements && data.achievements.length > 0) {
        for (const achievement of data.achievements) {
          const percent = Math.round(achievement.progressPercent);

          // Powiadomienie gdy blisko (90%+)
          if (percent >= 90 && percent < 100) {
            toast.info(`Prawie tam! ${achievement.icon}`, {
              description: `${achievement.name}: ${achievement.progress}/${achievement.target} (${percent}%)`,
              duration: 4000,
            });
          }
          // Normalne powiadomienie o postępie
          else if (percent < 100) {
            toast.success(`${achievement.icon} ${achievement.progress}/${achievement.target}`, {
              description: `${achievement.name}${achievement.tierName ? ` - ${achievement.tierName}` : ''}`,
              duration: 3000,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking achievement progress:', error);
  }
}

/**
 * Sprawdza postęp dla konkretnej kategorii i pokazuje toast
 */
export async function notifyProgressForCategory(
  userId: string,
  category: string,
  actionName: string
): Promise<void> {
  const requirementTypeMap: Record<string, string[]> = {
    TASKS: ['TASKS_COMPLETED'],
    RECIPES: ['RECIPES_ADDED', 'RECIPES_COOKED'],
    SHOPPING: ['SHOPPING_LISTS_COMPLETED'],
    MEALS: ['MEALS_PLANNED'],
    INVENTORY: ['INVENTORY_ITEMS_ADDED'],
    ROUTINES: ['ROUTINE_STREAK'],
  };

  const requirementTypes = requirementTypeMap[category] || [];
  if (requirementTypes.length > 0) {
    await checkAndNotifyAchievementProgress(userId, requirementTypes);
  }
}

/**
 * Pokazuje toast gdy osiągnięcie zostało ukończone (100%)
 */
export function notifyAchievementCompleted(achievement: AchievementProgressInfo): void {
  toast.success(`🏆 Osiągnięcie odblokowane!`, {
    description: `${achievement.icon} ${achievement.name}`,
    duration: 5000,
    action: {
      label: 'Zobacz',
      onClick: () => {
        window.location.href = '/gamification/achievements';
      },
    },
  });
}
