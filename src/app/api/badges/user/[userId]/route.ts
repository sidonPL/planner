import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    const { userId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz odznaki użytkownika
    const userBadges = await prisma.userBadge.findMany({
      where: {
        userId,
      },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: "desc",
      },
    });

    // Oblicz całkowite punkty z odznak
    const totalBadgePoints = userBadges.reduce(
      (sum, ub) => sum + ub.badge.points,
      0
    );

    // Pobierz dane użytkownika (nowy system XP)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
      },
    });

    // Pobierz liczbę ukończonych zadań
    const completedTasksCount = await prisma.taskCompletion.count({
      where: {
        userId,
      },
    });

    return NextResponse.json({
      badges: userBadges,
      stats: {
        totalBadges: userBadges.length,
        xp: user?.xp || 0,
        level: user?.level || 1,
        currentStreak: user?.currentStreak || 0,
        badgePoints: totalBadgePoints,
        completedTasks: completedTasksCount,
      },
    });
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

