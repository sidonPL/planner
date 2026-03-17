import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RoutinesClient } from "./RoutinesClient";

export default async function RoutinesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  // Pobierz instancje rutyn z datami (OGRANICZONY ZAKRES - szybkie zapytanie)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - 3); // Tylko 3 dni wstecz
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + 7); // Tylko 7 dni w przód

  const [routines, categories, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        isRecurring: true,
        parentTaskId: { not: null }, // Tylko instancje
        dueDate: {
          gte: pastDate,
          lte: futureDate,
        },
      },
      take: 100, // LIMIT - maksymalnie 100 instancji
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
        labels: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        subtasks: {
          select: {
            id: true,
            status: true,
          },
        },
        attachments: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { dueTime: "asc" },
        { priority: "desc" },
      ],
    }),
    prisma.category.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        color: true,
      },
    }),
  ]);

  return (
    <RoutinesClient
      initialRoutines={routines}
      categories={categories}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

