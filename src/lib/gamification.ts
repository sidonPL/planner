import { prisma } from './prisma';
import { createNotification } from './notifications';
import { triggerGamificationUpdate } from './pusher-server';
import {
  differenceInLocalCalendarDays,
  getLocalDayDate,
  isSameLocalDay,
} from './local-date';
import { calculateLevel } from './xp';

export { calculateLevel as calculateLevelFromXP, xpProgressPercent as calculateLevelProgress } from './xp';

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
  const newLevel = calculateLevel(newXP);
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

  const today = getLocalDayDate(activityDate);

  if (!user.lastActivityDate) {
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

  if (isSameLocalDay(user.lastActivityDate, activityDate)) {
    return { currentStreak: user.currentStreak, longestStreak: user.longestStreak };
  }

  const daysDiff = differenceInLocalCalendarDays(activityDate, user.lastActivityDate);

  let newStreak = user.currentStreak;
  if (daysDiff === 1) {
    newStreak = user.currentStreak + 1;
  } else {
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

