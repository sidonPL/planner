import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

// PATCH - aktualizuj postęp uczestnika
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: challengeId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { increment = 1 } = body; // Domyślnie +1 do postępu

    // Znajdź participation
    const participation = await prisma.challengParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.user.id,
        },
      },
      include: {
        challenge: true,
        user: true,
      },
    });

    if (!participation) {
      return NextResponse.json({ error: "Participation not found" }, { status: 404 });
    }

    // Sprawdź czy wyzwanie jest aktywne
    if (!participation.challenge.isActive) {
      return NextResponse.json({ error: "Challenge is not active" }, { status: 400 });
    }

    // Sprawdź czy już ukończone
    if (participation.completed) {
      return NextResponse.json({ error: "Challenge already completed" }, { status: 400 });
    }

    // Aktualizuj postęp
    const newProgress = participation.progress + increment;
    const isNowCompleted = newProgress >= participation.challenge.target;

    const updated = await prisma.challengParticipant.update({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.user.id,
        },
      },
      data: {
        progress: newProgress,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? new Date() : null,
      },
      include: {
        challenge: true,
      },
    });

    // Jeśli ukończone, wyślij powiadomienie i nagrodę
    if (isNowCompleted && !participation.completed) {
      // Powiadomienie
      await createNotification({
        userId: session.user.id,
        householdId: session.user.householdId!,
        title: "🎉 Wyzwanie ukończone!",
        message: `Gratulacje! Ukończyłeś wyzwanie "${participation.challenge.title}" i zdobyłeś ${participation.challenge.reward} punktów!`,
        type: "SYSTEM",
        link: "/dashboard",
      });

      // TODO: Dodaj punkty do użytkownika (jeśli masz system punktów)
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating challenge progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Claim nagrody
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id: challengeId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Znajdź participation
    const participation = await prisma.challengParticipant.findUnique({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.user.id,
        },
      },
      include: {
        challenge: true,
      },
    });

    if (!participation) {
      return NextResponse.json({ error: "Participation not found" }, { status: 404 });
    }

    if (!participation.completed) {
      return NextResponse.json({ error: "Challenge not completed yet" }, { status: 400 });
    }

    if (participation.rewardClaimed) {
      return NextResponse.json({ error: "Reward already claimed" }, { status: 400 });
    }

    // Oznacz nagrodę jako odebraną
    const updated = await prisma.challengParticipant.update({
      where: {
        challengeId_userId: {
          challengeId,
          userId: session.user.id,
        },
      },
      data: {
        rewardClaimed: true,
      },
    });

    // TODO: Dodaj punkty XP do użytkownika (integracja z systemem punktów)

    return NextResponse.json({
      ...updated,
      message: `Odebrano ${participation.challenge.reward} punktów!`,
    });
  } catch (error) {
    console.error("Error claiming reward:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

