import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";
import { startOfDay, endOfDay, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    todayTasks,
    _upcomingTasks,
    todayEvents,
    shoppingItems,
    monthTransactions,
    members,
    todayMeals,
    upcomingTrips,
    recentNotifications,
    todaySchedules,
    userSettings,
    anniversaries,
    externalBirthdays,
    financialAccounts,
    boardNotes,
  ] = await Promise.all([
    // Zadania na dziś (bez rutyn)
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        dueDate: { gte: todayStart, lte: todayEnd },
        isRecurring: false, // Wyklucz rutyny ze statystyk
      },
      include: {
        assignee: { select: { id: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Nadchodzące zadania (najbliższe 7 dni, bez rutyn)
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        dueDate: { gte: todayEnd, lte: weekEnd },
        status: { not: "COMPLETED" },
        isRecurring: false, // Wyklucz rutyny ze statystyk
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Wydarzenia na dziś
    prisma.event.findMany({
      where: {
        householdId: session.user.householdId,
        startDate: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { startDate: "asc" },
    }),
    // Lista zakupów (nieprzeczytane)
    prisma.shoppingItem.findMany({
      where: {
        householdId: session.user.householdId,
        isPurchased: false,
      },
      orderBy: [{ isUrgent: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    // Transakcje w tym miesiącu (z userId dla filtrowania)
    prisma.transaction.findMany({
      where: {
        householdId: session.user.householdId,
        date: { gte: monthStart, lte: monthEnd },
      },
      select: {
        id: true,
        amount: true,
        type: true,
        category: true,
        userId: true,
      },
    }),
    // Członkowie gospodarstwa z obecnością
    prisma.user.findMany({
      where: { householdId: session.user.householdId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        color: true,
        role: true,
        birthDate: true,
        nameDay: true,
        presenceRecords: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    }),
    // Posiłki na dziś (z assignee) - date jest typu Date, porównujemy z samą datą
    prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
        date: todayStart,
      },
      include: {
        recipe: { select: { id: true, name: true } },
        simpleDish: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, color: true } },
      },
      orderBy: { mealType: "asc" },
    }),
    // Nadchodzące wyjazdy
    prisma.trip.findMany({
      where: {
        householdId: session.user.householdId,
        startDate: { gte: now },
      },
      orderBy: { startDate: "asc" },
      take: 2,
    }),
    // Ostatnie powiadomienia
    prisma.notification.findMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // Harmonogramy na dziś
    prisma.schedule.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      include: {
        user: { select: { id: true, name: true, color: true } },
      },
    }),
    // Ustawienia użytkownika
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    }),
    // Rocznice
    prisma.anniversary.findMany({
      where: {
        householdId: session.user.householdId,
      },
      orderBy: { date: "asc" },
    }),
    // Zewnętrzne urodziny
    prisma.externalBirthday.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        birthDate: true,
        color: true,
        relationship: true,
      },
      orderBy: { name: "asc" },
    }),
    // Konta finansowe z ostatnimi transakcjami
    prisma.financialAccount.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      include: {
        transactions: {
          take: 5,
          orderBy: { date: "desc" },
          include: {
            user: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { balance: "desc" },
    }),
    // Notatki z tablicy rodzinnej
    prisma.boardNote.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
    }),
  ]);

  // Oblicz statystyki z transakcji
  const monthExpenses = monthTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthIncome = monthTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

  // Statystyki
  const stats = {
    todayTasksCount: todayTasks.length,
    todayTasksCompleted: todayTasks.filter((t) => t.status === "COMPLETED").length,
    weekEventsCount: todayEvents.length,
    shoppingCount: shoppingItems.length,
    shoppingUrgent: shoppingItems.filter((i) => i.isUrgent).length,
    monthExpenses,
    monthIncome,
    unreadNotifications: recentNotifications.length,
  };

  return (
    <DashboardClient
      user={session.user}
      stats={stats}
      todayTasks={todayTasks}
      todayEvents={todayEvents}
      shoppingItems={shoppingItems}
      members={members}
      todayMeals={todayMeals}
      upcomingTrips={upcomingTrips}
      notifications={recentNotifications}
      schedules={todaySchedules}
      transactions={monthTransactions}
      userSettings={userSettings}
      anniversaries={anniversaries}
      externalBirthdays={externalBirthdays}
      financialAccounts={financialAccounts}
      boardNotes={boardNotes}
    />
  );
}

