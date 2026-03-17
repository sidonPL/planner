import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subDays, format } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const userId = session.user.id;
    const householdId = session.user.householdId;

    // Parallel fetch all stats
    const [
      xpHistory,
      achievementsByCategory,
      topTasks,
      dailyActivity,
      householdComparison,
      recentActivity,
    ] = await Promise.all([
      getXPHistory(userId, days),
      getAchievementsByCategory(userId),
      getTopTasks(userId),
      getDailyActivity(userId, Math.min(days, 365)),
      getHouseholdComparison(userId, householdId),
      getRecentActivity(userId, 10),
    ]);

    return NextResponse.json({
      xpHistory,
      achievementsByCategory,
      topTasks,
      dailyActivity,
      householdComparison,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Get XP history over time
 */
async function getXPHistory(userId: string, days: number) {
  const startDate = subDays(new Date(), days);

  const pointsHistory = await prisma.pointsHistory.findMany({
    where: {
      userId,
      createdAt: { gte: startDate },
      type: { in: ["EARNED", "BONUS"] },
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dailyXP: Record<string, number> = {};

  for (const entry of pointsHistory) {
    const dateKey = format(entry.createdAt, "yyyy-MM-dd");
    dailyXP[dateKey] = (dailyXP[dateKey] || 0) + entry.amount;
  }

  // Convert to array format for charts
  const data = [];
  let cumulativeXP = 0;

  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - i - 1), "yyyy-MM-dd");
    const xp = dailyXP[date] || 0;
    cumulativeXP += xp;

    data.push({
      date,
      xp,
      cumulativeXP,
    });
  }

  return data;
}

/**
 * Get achievements count by category
 */
async function getAchievementsByCategory(userId: string) {
  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: {
      achievement: {
        select: { category: true },
      },
    },
  });

  const categoryCounts: Record<string, number> = {};

  for (const userAchievement of achievements) {
    const category = userAchievement.achievement.category;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  }

  // Convert to array format for pie chart
  return Object.entries(categoryCounts).map(([category, count]) => ({
    category,
    count,
  }));
}

/**
 * Get top completed tasks
 */
async function getTopTasks(userId: string) {
  // Get completed tasks
  const completions = await prisma.taskCompletion.findMany({
    where: { userId },
    include: {
      task: {
        select: { title: true },
      },
    },
    take: 100, // Last 100 completions
  });

  // Count by task title
  const taskCounts: Record<string, number> = {};

  for (const completion of completions) {
    const title = completion.task.title;
    taskCounts[title] = (taskCounts[title] || 0) + 1;
  }

  // Convert to array and sort
  const topTasks = Object.entries(taskCounts)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10

  return topTasks;
}

/**
 * Get daily activity (for heatmap)
 */
async function getDailyActivity(userId: string, days: number) {
  const startDate = subDays(new Date(), days);

  // Get all activity (tasks, recipes, meals, etc.)
  const [taskCompletions, recipes, meals] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: {
        userId,
        completedAt: { gte: startDate },
      },
      select: { completedAt: true },
    }),
    prisma.recipe.findMany({
      where: {
        createdById: userId,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    }),
    prisma.meal.findMany({
      where: {
        assigneeId: userId,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
    }),
  ]);

  // Combine all activity
  const allActivity = [
    ...taskCompletions.map((t) => t.completedAt),
    ...recipes.map((r) => r.createdAt),
    ...meals.map((m) => m.createdAt),
  ];

  // Group by day
  const dailyCounts: Record<string, number> = {};

  for (const date of allActivity) {
    const dateKey = format(date, "yyyy-MM-dd");
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  }

  // Convert to array format
  const data = [];
  for (let i = 0; i < days; i++) {
    const date = format(subDays(new Date(), days - i - 1), "yyyy-MM-dd");
    data.push({
      date,
      count: dailyCounts[date] || 0,
    });
  }

  return data;
}

/**
 * Get household comparison
 */
async function getHouseholdComparison(userId: string, householdId: string) {
  // Get current user XP
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true },
  });

  // Get household average
  const householdUsers = await prisma.user.findMany({
    where: { householdId },
    select: { xp: true, level: true },
  });

  const avgXP = householdUsers.reduce((sum, u) => sum + u.xp, 0) / householdUsers.length;
  const avgLevel = householdUsers.reduce((sum, u) => sum + u.level, 0) / householdUsers.length;

  return {
    yourXP: currentUser?.xp || 0,
    yourLevel: currentUser?.level || 1,
    householdAvgXP: Math.round(avgXP),
    householdAvgLevel: Math.round(avgLevel),
    totalMembers: householdUsers.length,
  };
}

/**
 * Get recent activity feed
 */
async function getRecentActivity(userId: string, limit: number) {
  const [tasks, achievements, recipes] = await Promise.all([
    prisma.taskCompletion.findMany({
      where: { userId },
      include: {
        task: {
          select: { title: true },
        },
      },
      orderBy: { completedAt: "desc" },
      take: limit,
    }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: {
          select: { name: true, icon: true, xpReward: true },
        },
      },
      orderBy: { unlockedAt: "desc" },
      take: limit,
    }),
    prisma.recipe.findMany({
      where: { createdById: userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  // Combine and sort by date
  const activity = [
    ...tasks.map((t) => ({
      type: "task",
      title: t.task.title,
      date: t.completedAt,
      xp: 10, // Assume 10 XP per task
    })),
    ...achievements.map((a) => ({
      type: "achievement",
      title: a.achievement.name,
      icon: a.achievement.icon,
      date: a.unlockedAt,
      xp: a.achievement.xpReward,
    })),
    ...recipes.map((r) => ({
      type: "recipe",
      title: r.name,
      date: r.createdAt,
      xp: 15, // Assume 15 XP per recipe
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);

  return activity;
}
