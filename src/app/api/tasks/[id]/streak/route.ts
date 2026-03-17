import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - pobierz streak dla konkretnego zadania i użytkownika
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;

    // Pobierz lub utwórz streak
    let streak = await prisma.routineStreak.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: session.user.id,
        },
      },
    });

    if (!streak) {
      // Utwórz nowy streak jeśli nie istnieje
      streak = await prisma.routineStreak.create({
        data: {
          taskId,
          userId: session.user.id,
          currentStreak: 0,
          longestStreak: 0,
          totalCompletions: 0,
        },
      });
    }

    return NextResponse.json(streak);
  } catch (error) {
    console.error("Error fetching routine streak:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - zaktualizuj streak po ukończeniu zadania
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const now = new Date();

    // Pobierz istniejący streak
    let streak = await prisma.routineStreak.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId: session.user.id,
        },
      },
    });

    if (!streak) {
      // Utwórz nowy streak
      streak = await prisma.routineStreak.create({
        data: {
          taskId,
          userId: session.user.id,
          currentStreak: 1,
          longestStreak: 1,
          totalCompletions: 1,
          lastCompletedAt: now,
        },
      });
    } else {
      // Zaktualizuj streak
      const lastCompleted = streak.lastCompletedAt;
      let newCurrentStreak = streak.currentStreak;

      if (lastCompleted) {
        const daysSinceLastCompletion = Math.floor(
          (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastCompletion === 0) {
          // To samo dzisiaj - nie zmieniamy streaku
          return NextResponse.json(streak);
        } else if (daysSinceLastCompletion === 1) {
          // Kolejny dzień - kontynuuj streak
          newCurrentStreak += 1;
        } else {
          // Przerwa - zresetuj streak
          newCurrentStreak = 1;
        }
      } else {
        newCurrentStreak = 1;
      }

      const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

      streak = await prisma.routineStreak.update({
        where: {
          taskId_userId: {
            taskId,
            userId: session.user.id,
          },
        },
        data: {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          totalCompletions: streak.totalCompletions + 1,
          lastCompletedAt: now,
        },
      });
    }

    return NextResponse.json(streak);
  } catch (error) {
    console.error("Error updating routine streak:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

