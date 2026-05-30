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

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, householdId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const sameHousehold =
      session.user.householdId &&
      targetUser.householdId === session.user.householdId;
    const isSelf = session.user.id === userId;
    const isAdmin = session.user.role === "ADMIN";

    if (!isSelf && !sameHousehold && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: "desc" },
    });

    const totalBadgePoints = userBadges.reduce(
      (sum, ub) => sum + ub.badge.points,
      0
    );

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        level: true,
        currentStreak: true,
      },
    });

    const completedTasksCount = await prisma.taskCompletion.count({
      where: { userId },
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
