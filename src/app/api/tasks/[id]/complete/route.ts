import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateNextTaskOccurrence } from "@/lib/recurrence";
import { updateQuestProgress } from "@/lib/daily-quests";
import { updateStreak } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";
import { addXP } from "@/lib/xp";

// PATCH - oznacz zadanie jako ukończone/nieukończone
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const completed = Boolean(body?.completed);

    // Sprawdź czy zadanie istnieje i należy do tego gospodarstwa
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        status: true,
        title: true,
        description: true,
        priority: true,
        dueDate: true,
        dueTime: true,
        isRecurring: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceEndDate: true,
        recurrenceDays: true,
        reminderMinutes: true,
        householdId: true,
        categoryId: true,
        assigneeId: true,
        creatorId: true,
        parentTaskId: true,
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Aktualizuj status zadania
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: completed ? "COMPLETED" : "TODO",
      },
      include: {
        category: true,
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true,
            color: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        completions: {
          orderBy: {
            completedAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Jeśli zadanie zostało ukończone, dodaj wpis do completions i sprawdź odznaki
    if (completed) {
      const wasAlreadyCompleted = existingTask.status === "COMPLETED";

      if (!wasAlreadyCompleted) {
        await prisma.taskCompletion.create({
          data: {
            taskId: id,
            userId: session.user.id,
          },
        });

        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            totalTaskCompletions: {
              increment: 1,
            },
          },
        });
      }

      // Aktualizuj streak dla zadań cyklicznych
      if (existingTask.isRecurring && !wasAlreadyCompleted) {
        const now = new Date();
        
        // Pobierz istniejący streak
        const streak = await prisma.routineStreak.findUnique({
          where: {
            taskId_userId: {
              taskId: id,
              userId: session.user.id,
            },
          },
        });

        if (!streak) {
          // Utwórz nowy streak
          await prisma.routineStreak.create({
            data: {
              taskId: id,
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
              // To samo dzisiaj - nie zmieniamy streaku, tylko totalCompletions
              newCurrentStreak = streak.currentStreak;
            } else if (daysSinceLastCompletion === 1) {
              // Kolejny dzień - kontynuuj streak
              newCurrentStreak = streak.currentStreak + 1;
            } else {
              // Przerwa - zresetuj streak
              newCurrentStreak = 1;
            }
          } else {
            newCurrentStreak = 1;
          }

          const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

          await prisma.routineStreak.update({
            where: {
              taskId_userId: {
                taskId: id,
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
      }

      // Generuj kolejne wystąpienie dla zadań cyklicznych
      let nextOccurrence = null;
      if (existingTask.isRecurring && existingTask.recurrenceType && !wasAlreadyCompleted) {
        nextOccurrence = await generateNextTaskOccurrence({
          id: existingTask.id,
          title: existingTask.title,
          description: existingTask.description,
          priority: existingTask.priority,
          dueDate: existingTask.dueDate,
          dueTime: existingTask.dueTime,
          isRecurring: existingTask.isRecurring,
          recurrenceType: existingTask.recurrenceType,
          recurrenceInterval: existingTask.recurrenceInterval,
          recurrenceEndDate: existingTask.recurrenceEndDate,
          recurrenceDays: existingTask.recurrenceDays,
          reminderMinutes: existingTask.reminderMinutes,
          householdId: existingTask.householdId,
          categoryId: existingTask.categoryId,
          assigneeId: existingTask.assigneeId,
          creatorId: existingTask.creatorId,
          parentTaskId: existingTask.parentTaskId,
        });
      }

      let xpResult: Awaited<ReturnType<typeof addXP>> | null = null;

      // Nalicz XP tylko przy faktycznej zmianie statusu na COMPLETED.
      if (!wasAlreadyCompleted) {
        const xpReward =
          existingTask.priority === "URGENT"
            ? 20
            : existingTask.priority === "HIGH"
              ? 15
              : existingTask.priority === "MEDIUM"
                ? 10
                : 5;

        xpResult = await addXP(
          session.user.id,
          xpReward,
          `Ukończono zadanie: ${existingTask.title}`,
          "EARNED"
        );

        // Update daily quest progress
        await updateQuestProgress(session.user.id, 'TASKS', 1);
      }

      // Update user streak
      await updateStreak(session.user.id);

      // Check achievements
      const newAchievements = await checkAchievements(session.user.id);

      return NextResponse.json({
        ...task,
        nextOccurrence,
        xpAward: xpResult,
        newAchievements: newAchievements.length > 0 ? newAchievements : undefined
      });
    }

    if (existingTask.status === "COMPLETED") {
      const latestCompletion = await prisma.taskCompletion.findFirst({
        where: {
          taskId: id,
          userId: session.user.id,
        },
        orderBy: {
          completedAt: "desc",
        },
        select: {
          id: true,
        },
      });

      if (latestCompletion) {
        await prisma.taskCompletion.delete({
          where: {
            id: latestCompletion.id,
          },
        });

        const userStats = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { totalTaskCompletions: true },
        });

        if ((userStats?.totalTaskCompletions || 0) > 0) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: {
              totalTaskCompletions: {
                decrement: 1,
              },
            },
          });
        }
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error toggling task completion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

