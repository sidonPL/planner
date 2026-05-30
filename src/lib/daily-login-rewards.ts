/**
 * Daily Login Rewards System
 * Nagradza użytkowników za codzienne logowanie z bonus XP za streaki
 */

import { prisma } from "./prisma";
import {
  differenceInLocalCalendarDays,
  getLocalDayDate,
  isSameLocalDay,
} from "./local-date";
import { addXP } from "./xp";

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

function computeNextStreak(
  currentStreak: number,
  lastLoginDate: Date | null,
  now: Date
): number {
  if (!lastLoginDate) {
    return 1;
  }

  const daysSinceLastLogin = differenceInLocalCalendarDays(now, lastLoginDate);

  if (daysSinceLastLogin <= 0) {
    return currentStreak;
  }

  if (daysSinceLastLogin === 1) {
    return currentStreak + 1;
  }

  return 1;
}

function calculateXpReward(newStreak: number): {
  xpRewarded: number;
  bonusType: string | null;
} {
  let xpRewarded = DAILY_LOGIN_XP.BASE;
  let bonusType: string | null = null;

  if (newStreak === 3) {
    xpRewarded += DAILY_LOGIN_XP.STREAK_3;
    bonusType = "STREAK_3";
  } else if (newStreak === 7) {
    xpRewarded += DAILY_LOGIN_XP.STREAK_7;
    bonusType = "STREAK_7";
  } else if (newStreak === 14) {
    xpRewarded += DAILY_LOGIN_XP.STREAK_14;
    bonusType = "STREAK_14";
  } else if (newStreak === 30) {
    xpRewarded += DAILY_LOGIN_XP.STREAK_30;
    bonusType = "STREAK_30";
  } else if (newStreak > 30 && newStreak % 30 === 0) {
    xpRewarded += DAILY_LOGIN_XP.STREAK_30;
    bonusType = `STREAK_${newStreak}`;
  }

  return {
    xpRewarded: Math.min(xpRewarded, DAILY_LOGIN_XP.MAX_DAILY),
    bonusType,
  };
}

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
      throw new Error("User not found");
    }

    const now = new Date();
    const today = getLocalDayDate(now);
    const lastLogin = user.lastLoginDate ?? null;

    if (lastLogin && isSameLocalDay(lastLogin, now)) {
      return {
        alreadyClaimed: true,
        streak: user.loginStreak,
        xpRewarded: 0,
        bonusType: null,
        isNewRecord: false,
        totalXp: user.xp,
      };
    }

    let newStreak = 1;
    let bonusType: string | null = null;
    let xpRewarded = DAILY_LOGIN_XP.BASE;
    let shieldUsed = false;
    let shieldInfo: { usesLeft: number; maxUses: number } | null = null;

    if (lastLogin) {
      const daysSinceLastLogin = differenceInLocalCalendarDays(now, lastLogin);

      if (daysSinceLastLogin === 1) {
        newStreak = user.loginStreak + 1;
      } else if (daysSinceLastLogin > 1) {
        const activeShield = await prisma.claimedReward.findFirst({
          where: {
            userId,
            isActive: true,
            reward: {
              effectData: {
                path: ["type"],
                equals: "streak_shield",
              },
            },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: {
            reward: true,
          },
        });

        if (activeShield && activeShield.usedCount < (activeShield.maxUses || 1)) {
          newStreak = user.loginStreak;
          shieldUsed = true;

          await prisma.claimedReward.update({
            where: { id: activeShield.id },
            data: {
              usedCount: { increment: 1 },
              isActive: activeShield.usedCount + 1 < (activeShield.maxUses || 1),
            },
          });

          shieldInfo = {
            usesLeft: (activeShield.maxUses || 1) - activeShield.usedCount - 1,
            maxUses: activeShield.maxUses || 1,
          };
        } else {
          newStreak = 1;
        }
      }
    }

    const reward = calculateXpReward(newStreak);
    xpRewarded = reward.xpRewarded;
    bonusType = reward.bonusType;

    const isNewRecord = newStreak > user.longestLoginStreak;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginDate: today,
          loginStreak: newStreak,
          longestLoginStreak: Math.max(newStreak, user.longestLoginStreak),
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
    ]);

    const xpResult = await addXP(
      userId,
      xpRewarded,
      bonusType
        ? `Codzienne logowanie - ${newStreak} dni z rzędu`
        : "Codzienne logowanie"
    );

    return {
      alreadyClaimed: false,
      streak: newStreak,
      xpRewarded,
      bonusType,
      shieldUsed,
      shieldInfo,
      longestStreak: Math.max(newStreak, user.longestLoginStreak),
      isNewRecord,
      totalXp: xpResult.totalXP,
      leveledUp: xpResult.leveledUp,
    };
  } catch (error) {
    console.error("Error checking daily login reward:", error);
    throw error;
  }
}

/**
 * Get login history for user
 */
export async function getLoginHistory(userId: string, limit = 30) {
  return prisma.dailyLoginReward.findMany({
    where: { userId },
    orderBy: { loginDate: "desc" },
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

  const now = new Date();
  const lastLogin = user?.lastLoginDate ?? null;
  const alreadyClaimedToday = lastLogin ? isSameLocalDay(lastLogin, now) : false;
  const canClaimToday = !alreadyClaimedToday;

  const displayStreak = alreadyClaimedToday
    ? user?.loginStreak || 0
    : computeNextStreak(user?.loginStreak || 0, lastLogin, now);

  return {
    currentStreak: displayStreak,
    storedStreak: user?.loginStreak || 0,
    longestStreak: user?.longestLoginStreak || 0,
    lastLoginDate: user?.lastLoginDate,
    totalLogins,
    totalXpEarned: totalXpFromLogins._sum.xpRewarded || 0,
    alreadyClaimedToday,
    canClaimToday,
    todayDayNumber: displayStreak,
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

  if (!user.lastLoginDate) return true;

  return !isSameLocalDay(user.lastLoginDate, new Date());
}
