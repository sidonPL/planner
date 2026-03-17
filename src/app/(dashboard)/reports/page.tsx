import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import { ReportsClient } from "./ReportsClient";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subWeeks,
  subMonths,
} from "date-fns";

export default async function ReportsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevMonthStart = startOfMonth(subMonths(now, 1));
  const prevMonthEnd = endOfMonth(subMonths(now, 1));

  // Pobierz statystyki zadań
  const [
    tasksThisWeek,
    tasksCompletedThisWeek,
    tasksPrevWeek,
    tasksCompletedPrevWeek,
    tasksThisMonth,
    tasksCompletedThisMonth,
    tasksPrevMonth,
    tasksCompletedPrevMonth,
  ] = await Promise.all([
    // Ten tydzień - wszystkie (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        createdAt: { gte: weekStart, lte: weekEnd },
        isRecurring: false,
      },
    }),
    // Ten tydzień - ukończone (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        status: TaskStatus.COMPLETED,
        updatedAt: { gte: weekStart, lte: weekEnd },
        isRecurring: false,
      },
    }),
    // Poprzedni tydzień - wszystkie (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        createdAt: { gte: prevWeekStart, lte: prevWeekEnd },
        isRecurring: false,
      },
    }),
    // Poprzedni tydzień - ukończone (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        status: TaskStatus.COMPLETED,
        updatedAt: { gte: prevWeekStart, lte: prevWeekEnd },
        isRecurring: false,
      },
    }),
    // Ten miesiąc - wszystkie (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        createdAt: { gte: monthStart, lte: monthEnd },
        isRecurring: false,
      },
    }),
    // Ten miesiąc - ukończone (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        status: TaskStatus.COMPLETED,
        updatedAt: { gte: monthStart, lte: monthEnd },
        isRecurring: false,
      },
    }),
    // Poprzedni miesiąc - wszystkie (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
        isRecurring: false,
      },
    }),
    // Poprzedni miesiąc - ukończone (bez rutyn)
    prisma.task.count({
      where: {
        householdId: session.user.householdId,
        status: TaskStatus.COMPLETED,
        updatedAt: { gte: prevMonthStart, lte: prevMonthEnd },
        isRecurring: false,
      },
    }),
  ]);

  // Pobierz statystyki budżetu
  const [
    expensesThisWeek,
    expensesPrevWeek,
    expensesThisMonth,
    expensesPrevMonth,
    incomeThisMonth,
    incomePrevMonth,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "EXPENSE",
        date: { gte: weekStart, lte: weekEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "EXPENSE",
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "EXPENSE",
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "INCOME",
        date: { gte: monthStart, lte: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        householdId: session.user.householdId,
        type: "INCOME",
        date: { gte: prevMonthStart, lte: prevMonthEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  // Wydatki per kategoria w tym miesiącu
  const expensesByCategory = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      householdId: session.user.householdId,
      type: "EXPENSE",
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  // Pobierz statystyki posiłków
  const [mealsThisWeek, mealsPrevWeek] = await Promise.all([
    prisma.meal.count({
      where: {
        householdId: session.user.householdId,
        date: { gte: weekStart, lte: weekEnd },
      },
    }),
    prisma.meal.count({
      where: {
        householdId: session.user.householdId,
        date: { gte: prevWeekStart, lte: prevWeekEnd },
      },
    }),
  ]);

  // Pobierz statystyki zakupów
  const [shoppingCompleted, shoppingPending] = await Promise.all([
    prisma.shoppingItem.count({
      where: {
        householdId: session.user.householdId,
        isPurchased: true,
        updatedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.shoppingItem.count({
      where: {
        householdId: session.user.householdId,
        isPurchased: false,
      },
    }),
  ]);

  // Nadchodzące wyjazdy
  const upcomingTrips = await prisma.trip.findMany({
    where: {
      householdId: session.user.householdId,
      startDate: { gte: now },
      status: "PLANNED",
    },
    orderBy: { startDate: "asc" },
    take: 3,
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      destination: true,
    },
  });

  // Ranking domowników według ukończonych zadań w tym miesiącu
  const userTaskStats = await prisma.taskCompletion.groupBy({
    by: ["userId"],
    where: {
      completedAt: { gte: monthStart, lte: monthEnd },
      task: {
        householdId: session.user.householdId,
      },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  const members = await prisma.user.findMany({
    where: { householdId: session.user.householdId },
    select: { id: true, name: true, color: true, avatar: true },
  });

  const userRanking = userTaskStats.map((stat) => {
    const member = members.find((m) => m.id === stat.userId);
    return {
      userId: stat.userId,
      name: member?.name || "Nieznany",
      color: member?.color || "#6B7280",
      avatar: member?.avatar ?? null,
      tasksCompleted: stat._count.id,
    };
  });

  return (
    <ReportsClient
      taskStats={{
        thisWeek: { total: tasksThisWeek, completed: tasksCompletedThisWeek },
        prevWeek: { total: tasksPrevWeek, completed: tasksCompletedPrevWeek },
        thisMonth: { total: tasksThisMonth, completed: tasksCompletedThisMonth },
        prevMonth: { total: tasksPrevMonth, completed: tasksCompletedPrevMonth },
      }}
      budgetStats={{
        thisWeek: expensesThisWeek._sum.amount || 0,
        prevWeek: expensesPrevWeek._sum.amount || 0,
        thisMonth: expensesThisMonth._sum.amount || 0,
        prevMonth: expensesPrevMonth._sum.amount || 0,
        incomeThisMonth: incomeThisMonth._sum.amount || 0,
        incomePrevMonth: incomePrevMonth._sum.amount || 0,
        byCategory: expensesByCategory.map((e) => ({
          category: e.category || "Inne",
          amount: e._sum.amount || 0,
        })),
      }}
      mealStats={{
        thisWeek: mealsThisWeek,
        prevWeek: mealsPrevWeek,
      }}
      shoppingStats={{
        completed: shoppingCompleted,
        pending: shoppingPending,
      }}
      upcomingTrips={upcomingTrips}
      userRanking={userRanking}
    />
  );
}


