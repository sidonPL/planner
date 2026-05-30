import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RoutinesClient } from "./RoutinesClient";
import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { getLocalDayDate } from "@/lib/local-date";

export default async function RoutinesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const today = getLocalDayDate(new Date());
  const pastDate = startOfDay(subDays(today, 30));
  const futureDate = endOfDay(addDays(today, 45));

  const [routines, categories, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        isRecurring: true,
        OR: [
          {
            dueDate: {
              gte: pastDate,
              lte: futureDate,
            },
          },
          {
            parentTaskId: null,
            OR: [
              { recurrenceEndDate: null },
              { recurrenceEndDate: { gte: today } },
            ],
          },
        ],
      },
      take: 1000,
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
        { dueDate: "asc" },
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

