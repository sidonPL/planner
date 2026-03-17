import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KanbanClient } from "./KanbanClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tablica Kanban - Zadania",
};

export default async function KanbanPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  const [tasks, categories, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        isRecurring: false, // Wyklucz rutyny - są w osobnej zakładce
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
          select: {
            completedAt: true,
          },
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
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.category.findMany({
      where: {
        householdId: session.user.householdId,
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

  return <KanbanClient initialTasks={tasks} categories={categories} members={members} />;
}

