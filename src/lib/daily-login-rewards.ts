/**
 * Daily Login Rewards System
 * Nagradza użytkowników za codzienne logowanie z bonus XP za streaki
 */

import { prisma } from './prisma';
import { startOfDay, differenceInDays } from 'date-fns';

/**
 * XP Rewards based on login streak
 */
const DAILY_LOGIN_XP = {
  BASE: 10,
  STREAK_3: 20,
  STREAK_7: 50,
  STREAK_14: 100,
  STREAK_30: 200,
  MAX_DAILY: 300,
};

/**
 * Check and award daily login reward
 */
export async function checkDailyLoginReward(userId: string, householdId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastLoginDate: true,
        loginStreak: true,
        longestLoginStreak: true,
        xp: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const today = startOfDay(new Date());
    const lastLogin = user.lastLoginDate ? startOfDay(user.lastLoginDate) : null;

    if (lastLogin && lastLogin.getTime() === today.getTime()) {
      return {
        alreadyClaimed: true,
        streak: user.loginStreak,
        xpRewarded: 0,
      };
    }

    let newStreak = 1;
    let bonusType: string | null = null;
    let xpRewarded = DAILY_LOGIN_XP.BASE;
    let shieldUsed = false;
    let shieldInfo: { usesLeft: number; maxUses: number } | null = null;

    if (lastLogin) {
      const daysSinceLastLogin = differenceInDays(today, lastLogin);

      if (daysSinceLastLogin === 1) {
        newStreak = user.loginStreak + 1;
      } else if (daysSinceLastLogin > 1) {
        const activeShield = await prisma.claimedReward.findFirst({
          where: {
            userId,
            isActive: true,
            reward: {
              effectData: {
                path: ['type'],
                equals: 'streak_shield'
              }
            },
            // Nie może być wygasła
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          include: {
            reward: true
          }
        });

        if (activeShield && activeShield.usedCount < (activeShield.maxUses || 1)) {
          newStreak = user.loginStreak;
          shieldUsed = true;

          await prisma.claimedReward.update({
            where: { id: activeShield.id },
            data: {
              usedCount: { increment: 1 },
              isActive: activeShield.usedCount + 1 < (activeShield.maxUses || 1)
            }
          });

          // Zapisz info o shield
          shieldInfo = {
            usesLeft: (activeShield.maxUses || 1) - activeShield.usedCount - 1,
            maxUses: activeShield.maxUses || 1
          };
        } else {
          newStreak = 1;
        }
      }
    }

    if (newStreak === 3) {
      xpRewarded += DAILY_LOGIN_XP.STREAK_3;
      bonusType = 'STREAK_3';
    } else if (newStreak === 7) {
      xpRewarded += DAILY_LOGIN_XP.STREAK_7;
      bonusType = 'STREAK_7';
    } else if (newStreak === 14) {
      xpRewarded += DAILY_LOGIN_XP.STREAK_14;
      bonusType = 'STREAK_14';
    } else if (newStreak === 30) {
      xpRewarded += DAILY_LOGIN_XP.STREAK_30;
      bonusType = 'STREAK_30';
    } else if (newStreak > 30 && newStreak % 30 === 0) {
      xpRewarded += DAILY_LOGIN_XP.STREAK_30;
      bonusType = `STREAK_${newStreak}`;
    }

    xpRewarded = Math.min(xpRewarded, DAILY_LOGIN_XP.MAX_DAILY);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginDate: today,
          loginStreak: newStreak,
          longestLoginStreak: Math.max(newStreak, user.longestLoginStreak),
          xp: user.xp + xpRewarded,
        },
      }),
      prisma.dailyLoginReward.create({
        data: {
          userId,
          householdId,
          loginDate: today,
          dayNumber: newStreak,
          xpRewarded,
          bonusType,
          claimed: true,
        },
      }),
      prisma.pointsHistory.create({
        data: {
          userId,
          amount: xpRewarded,
          reason: bonusType
            ? `Codzienne logowanie - ${newStreak} dni z rzędu! 🔥`
            : `Codzienne logowanie`,
          type: 'EARNED',
        },
      }),
    ]);

    return {
      alreadyClaimed: false,
      streak: newStreak,
      xpRewarded,
      bonusType,
      shieldUsed,
      shieldInfo,
      longestStreak: Math.max(newStreak, user.longestLoginStreak),
    };
  } catch (error) {
    console.error('Error checking daily login reward:', error);
    throw error;
  }
}

/**
 * Get login history for user
 */
export async function getLoginHistory(userId: string, limit = 30) {
  return prisma.dailyLoginReward.findMany({
    where: { userId },
    orderBy: { loginDate: 'desc' },
    take: limit,
  });
}

/**
 * Get login stats for user
 */
export async function getLoginStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      loginStreak: true,
      longestLoginStreak: true,
      lastLoginDate: true,
    },
  });

  const totalLogins = await prisma.dailyLoginReward.count({
    where: { userId },
  });

  const totalXpFromLogins = await prisma.dailyLoginReward.aggregate({
    where: { userId },
    _sum: { xpRewarded: true },
  });

  return {
    currentStreak: user?.loginStreak || 0,
    longestStreak: user?.longestLoginStreak || 0,
    lastLoginDate: user?.lastLoginDate,
    totalLogins,
    totalXpEarned: totalXpFromLogins._sum.xpRewarded || 0,
  };
}

/**
 * Check if user can claim today's reward
 */
export async function canClaimTodayReward(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastLoginDate: true },
  });

  if (!user) return false;

  const today = startOfDay(new Date());
  const lastLogin = user.lastLoginDate ? startOfDay(user.lastLoginDate) : null;

  return !lastLogin || lastLogin.getTime() !== today.getTime();
}

