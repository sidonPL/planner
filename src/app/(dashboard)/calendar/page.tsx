import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./CalendarClient";

export default async function CalendarPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/");
  }

  // Pobierz wydarzenia z różnych źródeł
  const [events, tasks, meals, schedules, trips, members, externalBirthdays, anniversaries, importedEvents] = await Promise.all([
    // Wydarzenia kalendarzowe
    prisma.event.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    }),
    // Zadania z terminem (bez rutyn - rutyny mają osobny widok)
    prisma.task.findMany({
      where: {
        householdId: session.user.householdId,
        dueDate: { not: null },
        isRecurring: false, // Wyklucz rutyny z kalendarza
      },
      include: {
        category: true,
        assignee: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    }),
    // Posiłki z jadłospisu
    prisma.meal.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        recipe: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    // Harmonogramy pracy/szkoły
    prisma.schedule.findMany({
      where: {
        householdId: session.user.householdId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        exceptions: true,
      },
    }),
    // Wyjazdy
    prisma.trip.findMany({
      where: {
        householdId: session.user.householdId,
      },
      include: {
        participants: {
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
      },
    }),
    // Członkowie gospodarstwa (z datami urodzin)
    prisma.user.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        avatar: true,
        birthDate: true,
        nameDay: true,
      },
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
    }),
    // Rocznice
    prisma.anniversary.findMany({
      where: {
        householdId: session.user.householdId,
      },
      select: {
        id: true,
        title: true,
        date: true,
        type: true,
        color: true,
      },
    }),
    // Zaimportowane wydarzenia z integracji kalendarzowych
    prisma.calendarImportedEvent.findMany({
      where: {
        householdId: session.user.householdId,
        integration: {
          isActive: true,
        },
      },
      include: {
        integration: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  return (
    <CalendarClient
      events={events}
      tasks={tasks}
      meals={meals}
      schedules={schedules}
      trips={trips}
      members={members}
      externalBirthdays={externalBirthdays}
      anniversaries={anniversaries}
      importedEvents={importedEvents}
      currentUserId={session.user.id}
    />
  );
}
