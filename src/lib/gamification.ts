import { prisma } from './prisma';
import { createNotification } from './notifications';
import { triggerGamificationUpdate } from './pusher-server';

// XP calculation
export function xpForLevel(level: number): number {
  return level * 100; // Level 1 = 100 XP, Level 2 = 200 XP, etc.
}

export function calculateLevelFromXP(xp: number): number {
  let level = 1;
  let totalXP = 0;

  while (totalXP + xpForLevel(level) <= xp) {
    totalXP += xpForLevel(level);
    level++;
  }

  return level;
}

export function calculateLevelProgress(xp: number, level: number): number {
  const xpForCurrentLevel = xpForLevel(level);
  const xpForPreviousLevels = Array.from({ length: level - 1 }, (_, i) => xpForLevel(i + 1))
    .reduce((sum, xp) => sum + xp, 0);

  const currentLevelXP = xp - xpForPreviousLevels;
  return (currentLevelXP / xpForCurrentLevel) * 100;
}

// Add points and XP
export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  type: 'EARNED' | 'SPENT' | 'BONUS' | 'PENALTY' = 'EARNED'
) {
  // Create points history entry
  await prisma.pointsHistory.create({
    data: {
      userId,
      amount,
      reason,
      type,
    },
  });

  // Get current user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, householdId: true, name: true },
  });

  if (!user) return null;

  const newXP = Math.max(0, user.xp + amount);
  const newLevel = calculateLevelFromXP(newXP);
  const leveledUp = newLevel > user.level;

  // Update user
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      xp: newXP,
      level: newLevel,
    },
    select: {
      id: true,
      name: true,
      xp: true,
      level: true,
    },
  });

  // If leveled up, send notification
  if (leveledUp && user.householdId) {
    await createNotification({
      userId,
      householdId: user.householdId,
      title: `🎉 Awans na poziom ${newLevel}!`,
      message: `Gratulacje! Osiągnąłeś poziom ${newLevel}!`,
      type: 'SYSTEM',
      link: '/gamification',
    });

    // Broadcast real-time update
    await triggerGamificationUpdate(user.householdId, 'level-up', {
      userId,
      data: {
        level: newLevel,
        previousLevel: user.level,
        name: user.name,
        xp: newXP,
      },
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ...updated,
    leveledUp,
    previousLevel: user.level,
  };
}

// Update streak
export async function updateStreak(userId: string, activityDate: Date = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
    },
  });

  if (!user) return null;

  const today = new Date(activityDate);
  today.setHours(0, 0, 0, 0);

  if (!user.lastActivityDate) {
    // First activity ever
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      },
    });
    return { currentStreak: 1, longestStreak: 1 };
  }

  const lastActivity = new Date(user.lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  let newStreak = user.currentStreak;

  if (daysDiff === 0) {
    // Same day - no change
    return { currentStreak: user.currentStreak, longestStreak: user.longestStreak };
  } else if (daysDiff === 1) {
    // Consecutive day - increment
    newStreak = user.currentStreak + 1;
  } else {
    // Streak broken - reset
    newStreak = 1;
  }

  const newLongestStreak = Math.max(newStreak, user.longestStreak);

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: today,
    },
  });

  return { currentStreak: newStreak, longestStreak: newLongestStreak };
}

// Get activity calendar (last 30 days)
export async function getActivityCalendar(userId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Get points history for last 30 days
  const history = await prisma.pointsHistory.findMany({
    where: {
      userId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
      type: 'EARNED', // Only count positive activities
    },
    select: {
      createdAt: true,
      amount: true,
    },
  });

  // Group by date
  const activityMap = new Map<string, number>();

  history.forEach((entry) => {
    const date = new Date(entry.createdAt);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];

    activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + entry.amount);
  });

  // Generate last 30 days array
  const calendar = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];

    calendar.push({
      date: dateKey,
      points: activityMap.get(dateKey) || 0,
      hasActivity: activityMap.has(dateKey),
    });
  }

  return calendar;
}

