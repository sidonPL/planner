import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Funkcja pomocnicza do obliczania punktów użytkownika
async function getUserPoints(userId: string): Promise<number> {
  const userBadges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
  });

  return userBadges.reduce((total, userBadge) => total + userBadge.badge.points, 0);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Pobierz nagrodę
    const reward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    // Sprawdź czy nagroda jest aktywna
    if (!reward.isActive) {
      return NextResponse.json(
        { error: "This reward is no longer available" },
        { status: 400 }
      );
    }

    // Sprawdź czy nagroda należy do tego samego gospodarstwa domowego
    if (reward.householdId !== session.user.householdId) {
      return NextResponse.json(
        { error: "This reward does not belong to your household" },
        { status: 403 }
      );
    }

    // Oblicz dostępne punkty użytkownika
    const userPoints = await getUserPoints(session.user.id);

    // Oblicz wykorzystane punkty (na podstawie roszczeń)
    const claimedRewards = await prisma.claimedReward.findMany({
      where: { userId: session.user.id },
      include: { reward: true },
    });

    const usedPoints = claimedRewards.reduce(
      (total, claim) => total + claim.reward.pointsCost,
      0
    );

    const availablePoints = userPoints - usedPoints;

    // Sprawdź czy użytkownik ma wystarczająco punktów
    if (availablePoints < reward.pointsCost) {
      return NextResponse.json(
        {
          error: "Not enough points",
          required: reward.pointsCost,
          available: availablePoints,
        },
        { status: 400 }
      );
    }

    // Utwórz roszczenie nagrody
    const claimedReward = await prisma.claimedReward.create({
      data: {
        userId: session.user.id,
        rewardId: id,
        fulfilled: false,
      },
      include: {
        reward: true,
      },
    });

    // Opcjonalnie: Wyślij powiadomienie do administratorów gospodarstwa
    // TODO: Dodać logikę powiadomień

    return NextResponse.json({
      success: true,
      claimedReward,
      remainingPoints: availablePoints - reward.pointsCost,
    });
  } catch (error) {
    console.error("Error claiming reward:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

