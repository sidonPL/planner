import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.householdId) {
      return NextResponse.json({ error: "No household" }, { status: 400 });
    }

    // Pobierz użytkowników z gospodarstwa z danymi gamifikacji
    const users = await prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
        xp: true,
        level: true,
        currentStreak: true,
        longestStreak: true,
        completedTasks: {
          select: { id: true },
        },
        badges: {
          include: {
            badge: true,
          },
        },
      },
      orderBy: {
        xp: 'desc', // Sortuj po XP (główny ranking)
      },
    });

    // Mapuj do leaderboard format
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      color: user.color,
      xp: user.xp,
      level: user.level,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      completedTasks: user.completedTasks.length,
      badges: user.badges.length,
      badgePoints: user.badges.reduce((sum, ub) => sum + ub.badge.points, 0),
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

