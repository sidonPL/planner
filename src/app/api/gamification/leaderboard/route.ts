import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/gamification/leaderboard?period=ALL_TIME
 * Zwraca leaderboard ALL_TIME (total XP)
 *
 * Dla WEEKLY/MONTHLY użyj /api/gamification/leaderboard/seasonal
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const householdId = session.user.householdId;

    // Get all-time leaderboard (total XP)
    const users = await prisma.user.findMany({
      where: { householdId },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
        level: true,
        xp: true,
      },
      orderBy: { xp: 'desc' },
    });

    const leaderboard = users.map((user, index) => ({
      id: `all-time-${user.id}`,
      userId: user.id,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        color: user.color,
        level: user.level,
      },
      xpEarned: user.xp, // Total XP
      rank: index + 1,
    }));

    // Find current user's rank
    const currentUserRank = leaderboard.findIndex((entry) => entry.userId === session.user.id) + 1;

    return NextResponse.json({
      leaderboard,
      currentUserRank: currentUserRank || null,
      period: 'ALL_TIME',
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

