import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stats
    const [
      totalUsers,
      activeUsers,
      totalAchievements,
      unlockedAchievements,
      totalBadges,
      unlockedBadges,
      todayQuests,
      completedQuests,
      users,
      recentActivity,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active users (last 7 days)
      prisma.user.count({
        where: {
          lastActivityDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Total achievements
      prisma.achievement.count(),

      // Unlocked achievements
      prisma.userAchievement.count(),

      // Total badges
      prisma.badge.count(),

      // Unlocked badges
      prisma.userBadge.count(),

      // Today's quests
      prisma.dailyQuest.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Completed quests today
      prisma.dailyQuestCompletion.count({
        where: {
          completed: true,
          quest: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        },
      }),

      // All users with XP
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          xp: true,
          level: true,
        },
      }),

      // Recent activity (last 10 points history)
      prisma.pointsHistory.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Calculate total XP and avg level
    const totalXP = users.reduce((sum, u) => sum + u.xp, 0);
    const avgLevel = users.length > 0 ? users.reduce((sum, u) => sum + u.level, 0) / users.length : 0;

    // Top 10 users
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        badges: { select: { id: true } },
        userAchievements: { select: { id: true } },
      },
    });

    const topUsersWithCounts = topUsers.map(u => ({
      id: u.id,
      name: u.name,
      xp: u.xp,
      level: u.level,
      achievementsCount: u.userAchievements.length,
    }));

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalXP,
      avgLevel,
      totalAchievements,
      unlockedAchievements,
      totalBadges,
      unlockedBadges,
      totalQuests: todayQuests,
      completedQuests,
      topUsers: topUsersWithCounts,
      recentActivity: recentActivity.map(a => ({
        message: `${a.user.name} ${a.type === 'EARNED' ? 'zdobył' : a.type === 'BONUS' ? 'otrzymał bonus' : 'wydał'} ${Math.abs(a.amount)} XP`,
        xp: a.amount,
        timestamp: a.createdAt.toLocaleString('pl-PL'),
      })),
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

