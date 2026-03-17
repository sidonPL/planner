import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Pobierz zadania z dzisiaj
    const [completedTasks, totalTasks] = await Promise.all([
      prisma.taskCompletion.count({
        where: {
          userId,
          completedAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
      prisma.task.count({
        where: {
          assigneeId: userId,
          dueDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
      }),
    ]);

    // Pobierz daily quests z dzisiaj
    const dailyQuests = await prisma.dailyQuest.findMany({
      where: {
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        completions: {
          where: {
            userId,
          },
        },
      },
    });

    const questsCompleted = dailyQuests.filter((quest) => quest.completions.length > 0).length;
    const questsTotal = dailyQuests.length;

    // Pobierz przepisy ugotowane dzisiaj
    const recipesCooked = await prisma.recipeRating.count({
      where: {
        userId,
        cookedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });

    // Pobierz XP zdobyte dzisiaj
    const pointsHistory = await prisma.pointsHistory.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
        type: 'EARNED',
      },
    });

    const xpEarned = pointsHistory.reduce((sum, ph) => sum + ph.amount, 0);

    // Sprawdź czy streak jest aktywny
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true },
    });

    const streakActive = (user?.currentStreak || 0) > 0;

    // Ostatnia aktywność
    const recentActivities: Array<{
      type: 'TASK' | 'QUEST' | 'RECIPE' | 'ACHIEVEMENT';
      title: string;
      xp: number;
      timestamp: Date;
      icon: string;
    }> = [];

    // Zadania
    const recentTaskCompletions = await prisma.taskCompletion.findMany({
      where: {
        userId,
        completedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
    });

    recentTaskCompletions.forEach((completion) => {
      recentActivities.push({
        type: 'TASK',
        title: completion.task.title,
        xp: 10, // Domyślne XP za zadanie
        timestamp: completion.completedAt,
        icon: '✅',
      });
    });

    // Questy
    const recentQuestCompletions = await prisma.dailyQuestCompletion.findMany({
      where: {
        userId,
        completedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        quest: {
          select: {
            title: true,
            reward: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 2,
    });

    recentQuestCompletions.forEach((completion) => {
      recentActivities.push({
        type: 'QUEST',
        title: completion.quest.title,
        xp: completion.quest.reward,
        timestamp: completion.completedAt ?? today,
        icon: '🎯',
      });
    });

    // Przepisy
    const recentRecipes = await prisma.recipeRating.findMany({
      where: {
        userId,
        cookedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        recipe: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { cookedAt: 'desc' },
      take: 2,
    });

    recentRecipes.forEach((rating) => {
      recentActivities.push({
        type: 'RECIPE',
        title: `Ugotowano: ${rating.recipe.name}`,
        xp: 15,
        timestamp: rating.cookedAt ?? today,
        icon: '👨‍🍳',
      });
    });

    // Osiągnięcia z dzisiaj
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlockedAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
      take: 2,
    });

    recentAchievements.forEach((ua) => {
      recentActivities.push({
        type: 'ACHIEVEMENT',
        title: `Osiągnięcie: ${ua.achievement.name}`,
        xp: ua.achievement.xpReward,
        timestamp: ua.unlockedAt,
        icon: ua.achievement.icon,
      });
    });

    // Sortuj po czasie
    recentActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Oblicz czas aktywności (przybliżony)
    const firstActivity = recentActivities[recentActivities.length - 1];
    const lastActivity = recentActivities[0];
    let minutesActive = 0;

    if (firstActivity && lastActivity) {
      const diff = lastActivity.timestamp.getTime() - firstActivity.timestamp.getTime();
      minutesActive = Math.round(diff / 1000 / 60);
    }

    return NextResponse.json({
      tasksCompleted: completedTasks,
      tasksTotal: totalTasks,
      questsCompleted,
      questsTotal,
      recipesCooked,
      minutesActive,
      xpEarned,
      streakActive,
      recentActivities: recentActivities.slice(0, 10),
    });
  } catch (error) {
    console.error('Error fetching today progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

