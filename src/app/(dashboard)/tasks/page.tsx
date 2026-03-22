import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TasksClient } from "./TasksClient";

export default async function TasksPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const [tasks, categories, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
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
        { status: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
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
    <TasksClient
      initialTasks={tasks}
      categories={categories}
      members={members}
      currentUserId={session.user.id}
    />
  );
}

