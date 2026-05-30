import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { calculateAchievementProgress } from '@/lib/achievements';
import { getXpThresholdForNextLevel, xpProgressPercent } from '@/lib/xp';

/**
 * GET /api/gamification/widget-stats
 * Zwraca szybkie statystyki dla widgetu w navbar
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Pobierz dane użytkownika
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Oblicz XP dla następnego poziomu
    const xpForNextLevel = getXpThresholdForNextLevel(user.xp);
    const xpProgress = xpProgressPercent(user.xp);

    // Policz osiągnięcia
    const achievements = await prisma.userAchievement.count({
      where: { userId },
    });

    // Policz ukończone zadania
    const totalTasks = await prisma.taskCompletion.count({
      where: { userId },
    });

    // Znajdź najbliższe osiągnięcie (największy progress, ale < 100%)
    const allAchievements = await prisma.achievement.findMany({
      where: {
        NOT: {
          userAchievements: {
            some: { userId }
          }
        }
      },
      orderBy: [
        { tier: 'asc' },
        { requirementValue: 'asc' }
      ],
      take: 10, // Weź pierwsze 10 do sprawdzenia
    });

    let closestAchievement = null;
    let maxProgress = 0;

    for (const achievement of allAchievements) {
      const progress = await calculateAchievementProgress(userId, achievement.requirementType);
      const progressPercent = (progress / achievement.requirementValue) * 100;

      if (progressPercent < 100 && progressPercent > maxProgress) {
        maxProgress = progressPercent;
        closestAchievement = {
          id: achievement.id,
          name: achievement.name,
          icon: achievement.icon,
          progress,
          target: achievement.requirementValue,
          progressPercent: Math.min(progressPercent, 99),
        };
      }
    }

    return NextResponse.json({
      level: user.level,
      xp: user.xp,
      xpForNextLevel,
      xpProgress,
      currentStreak: user.currentStreak || 0,
      achievements,
      totalTasks,
      closestAchievement,
    });
  } catch (error) {
    console.error('Error fetching widget stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

