import { prisma } from './prisma';

/**
 * Check if user has active priority boost
 */
export async function hasActivePriorityBoost(userId: string): Promise<boolean> {
  const activeBoost = await prisma.claimedReward.findFirst({
    where: {
      userId,
      isActive: true,
      reward: {
        effectData: {
          path: ['type'],
          equals: 'priority_boost'
        }
      }
    }
  });

  return !!activeBoost;
}

/**
 * Sort tasks with priority boost - user's tasks come first
 */
export function sortTasksWithPriorityBoost<T extends { userId?: string | null; assigneeId?: string | null }>(
  tasks: T[],
  currentUserId: string,
  hasPriorityBoost: boolean
): T[] {
  if (!hasPriorityBoost) return tasks;

  return [...tasks].sort((a, b) => {
    const aIsUser = a.userId === currentUserId || a.assigneeId === currentUserId;
    const bIsUser = b.userId === currentUserId || b.assigneeId === currentUserId;

    if (aIsUser && !bIsUser) return -1; // User's tasks first
    if (!aIsUser && bIsUser) return 1;

    return 0; // Keep original order for same type
  });
}

