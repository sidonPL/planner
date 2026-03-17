import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GamificationClient } from "./GamificationClient";

export default async function GamificationPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  // Pobierz statystyki użytkowników z gospodarstwa
  const [members, badges, userBadges, rewards] = await Promise.all([
    prisma.user.findMany({
      where: { householdId: session.user.householdId },
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
          include: { badge: true },
        },
        claimedRewards: {
          include: { reward: true },
        },
      },
    }),
    prisma.badge.findMany({
      orderBy: { points: "desc" },
    }),
    prisma.userBadge.findMany({
      where: {
        user: { householdId: session.user.householdId },
      },
      include: {
        badge: true,
        user: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { earnedAt: "desc" },
      take: 10,
    }),
    prisma.reward.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      include: {
        claims: {
          include: {
            user: {
              select: { id: true, name: true, color: true },
            },
          },
        },
      },
      orderBy: { pointsCost: "asc" },
    }),
  ]);

  // Oblicz punkty dla każdego użytkownika
  const membersWithPoints = members.map((member) => {
    const taskPoints = member.completedTasks.length * 10; // 10 punktów za zadanie
    const badgePoints = member.badges.reduce((sum: number, ub) => sum + ub.badge.points, 0);
    const totalPoints = taskPoints + badgePoints;
    const spentPoints = member.claimedRewards.reduce(
      (sum: number, cr) => sum + cr.reward.pointsCost,
      0
    );
    const availablePoints = totalPoints - spentPoints;

    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      color: member.color,
      completedTasks: member.completedTasks.length,
      badges: member.badges,
      points: totalPoints,
      availablePoints: availablePoints,
      xp: member.xp,
      level: member.level,
      currentStreak: member.currentStreak,
      longestStreak: member.longestStreak,
    };
  }).sort((a, b) => b.points - a.points);

  // Mapowanie rewards dla komponentu
  const mappedRewards = rewards.map((reward) => ({
    id: reward.id,
    name: reward.name,
    description: reward.description,
    icon: reward.icon,
    pointsCost: reward.pointsCost,
    isActive: reward.isActive,
    claimedBy: reward.claims.map((claim) => ({
      id: claim.id,
      claimedAt: claim.claimedAt,
      fulfilled: claim.fulfilled,
      user: claim.user,
    })),
  }));

  return (
    <GamificationClient
      members={membersWithPoints}
      allBadges={badges}
      recentBadges={userBadges}
      rewards={mappedRewards}
      currentUserId={session.user.id}
    />
  );
}

