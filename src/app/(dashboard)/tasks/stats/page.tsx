// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\(dashboard)\tasks\stats\page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { TaskStatsClient } from "./TaskStatsClient";

export default async function TaskStatsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Pobierz członków gospodarstwa
  const members = await prisma.user.findMany({
    where: { householdId: session.user.householdId },
    select: {
      id: true,
      name: true,
      avatar: true,
      color: true,
    },
  });

  // Pobierz wszystkie ukończone zadania dla statystyk (bez rutyn)
  const completedTasks = await prisma.task.findMany({
    where: {
      householdId: session.user.householdId,
      status: TaskStatus.COMPLETED,
      isRecurring: false, // Wyklucz rutyny
    },
    include: {
      completions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
      assignee: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });

  // Statystyki dzienne
  const todayCompleted = completedTasks.filter((t) => {
    const completion = t.completions[0];
    if (!completion) return false;
    return completion.completedAt >= today && completion.completedAt <= todayEnd;
  }).length;

  // Statystyki tygodniowe
  const weekCompleted = completedTasks.filter((t) => {
    const completion = t.completions[0];
    if (!completion) return false;
    return completion.completedAt >= weekStart && completion.completedAt <= weekEnd;
  }).length;

  // Statystyki miesięczne
  const monthCompleted = completedTasks.filter((t) => {
    const completion = t.completions[0];
    if (!completion) return false;
    return completion.completedAt >= monthStart && completion.completedAt <= monthEnd;
  }).length;

  // Statystyki poprzedniego miesiąca
  const lastMonthCompleted = completedTasks.filter((t) => {
    const completion = t.completions[0];
    if (!completion) return false;
    return completion.completedAt >= lastMonthStart && completion.completedAt <= lastMonthEnd;
  }).length;

  // Ranking domowników
  const userStats = members.map((member) => {
    const userCompletedTasks = completedTasks.filter((t) => {
      const completion = t.completions.find((c) => c.userId === member.id);
      return completion && completion.completedAt >= monthStart && completion.completedAt <= monthEnd;
    });

    const onTimeTasks = userCompletedTasks.filter((t) => {
      if (!t.dueDate) return true;
      const completion = t.completions.find((c) => c.userId === member.id);
      return completion && completion.completedAt <= t.dueDate;
    });

    return {
      ...member,
      completedCount: userCompletedTasks.length,
      onTimeCount: onTimeTasks.length,
      onTimePercentage:
        userCompletedTasks.length > 0
          ? Math.round((onTimeTasks.length / userCompletedTasks.length) * 100)
          : 0,
    };
  }).sort((a, b) => b.completedCount - a.completedCount);

  // Statystyki per dzień (ostatnie 30 dni)
  const dailyStats: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const count = completedTasks.filter((t) => {
      const completion = t.completions[0];
      if (!completion) return false;
      return completion.completedAt >= dayStart && completion.completedAt <= dayEnd;
    }).length;

    dailyStats.push({
      date: date.toISOString().split("T")[0],
      count,
    });
  }

  // Ogólna terminowość
  const tasksWithDeadline = completedTasks.filter((t) => t.dueDate);
  const onTimeTasks = tasksWithDeadline.filter((t) => {
    const completion = t.completions[0];
    if (!completion || !t.dueDate) return false;
    return completion.completedAt <= t.dueDate;
  });
  const overallOnTimePercentage =
    tasksWithDeadline.length > 0
      ? Math.round((onTimeTasks.length / tasksWithDeadline.length) * 100)
      : 0;

  // Średni czas wykonania zadań (od utworzenia do ukończenia)
  const tasksWithCompletionTime = completedTasks
    .filter((t) => t.completions.length > 0)
    .map((t) => {
      const completion = t.completions[0];
      const createdAt = new Date(t.createdAt).getTime();
      const completedAt = new Date(completion.completedAt).getTime();
      return completedAt - createdAt;
    })
    .filter((time) => time > 0);

  const avgCompletionTimeMs = tasksWithCompletionTime.length > 0
    ? tasksWithCompletionTime.reduce((a, b) => a + b, 0) / tasksWithCompletionTime.length
    : 0;
  
  // Konwertuj na godziny
  const avgCompletionTimeHours = Math.round(avgCompletionTimeMs / (1000 * 60 * 60));

  // Aktywne zadania do wykonania (bez rutyn)
  const pendingTasks = await prisma.task.count({
    where: {
      householdId: session.user.householdId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      isRecurring: false,
    },
  });

  // Przeterminowane zadania (bez rutyn)
  const overdueTasks = await prisma.task.count({
    where: {
      householdId: session.user.householdId,
      status: { in: ["TODO", "IN_PROGRESS"] },
      dueDate: { lt: now },
      isRecurring: false,
    },
  });

  return (
    <TaskStatsClient
      stats={{
        todayCompleted,
        weekCompleted,
        monthCompleted,
        lastMonthCompleted,
        pendingTasks,
        overdueTasks,
        overallOnTimePercentage,
        totalCompleted: completedTasks.length,
        avgCompletionTimeHours,
      }}
      userStats={userStats}
      dailyStats={dailyStats}
    />
  );
}


