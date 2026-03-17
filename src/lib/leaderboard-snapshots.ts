/**
 * Cron Job: Create Leaderboard Snapshots
 *
 * Uruchamiany co tydzień/miesiąc aby stworzyć snapshot leaderboard
 * Można też uruchomić ręcznie przez API endpoint
 */

import { prisma } from './prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

export async function createWeeklySnapshot(householdId: string) {
  const now = new Date();
  const lastWeek = subWeeks(now, 1);
  const startDate = startOfWeek(lastWeek, { weekStartsOn: 1 }); // Poniedziałek
  const endDate = endOfWeek(lastWeek, { weekStartsOn: 1 }); // Niedziela
  const year = startDate.getFullYear();
  const weekNumber = Math.ceil(((startDate.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + 1) / 7);

  // Pobierz wszystkich użytkowników z gospodarstwa domowego z ich statystykami za ostatni tydzień
  const users = await prisma.user.findMany({
    where: {
      householdId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const snapshots = await Promise.all(
    users.map(async (user) => {
      // Sprawdź czy snapshot już istnieje dla tego użytkownika
      const existing = await prisma.leaderboardSnapshot.findFirst({
        where: {
          userId: user.id,
          period: 'WEEKLY',
          weekNumber,
          year,
        },
      });

      if (existing) {
        console.log(`Weekly snapshot for user ${user.id} week ${weekNumber}/${year} already exists`);
        return existing;
      }

      // XP zdobyte w tym tygodniu
      const xpHistory = await prisma.pointsHistory.findMany({
        where: {
          userId: user.id,
          type: 'EARNED',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      const xpEarned = xpHistory.reduce((sum, ph) => sum + ph.amount, 0);

      return {
        userId: user.id,
        xpEarned,
      };
    })
  );

  // Filtruj istniejące snapshoty
  const newEntries = snapshots.filter(s => !('id' in s)) as { userId: string; xpEarned: number }[];

  // Sortuj po XP (główne kryterium)
  newEntries.sort((a, b) => b.xpEarned - a.xpEarned);

  // Utwórz snapshoty dla nowych użytkowników
  const created = await Promise.all(
    newEntries.map(async (entry, index) => {
      return await prisma.leaderboardSnapshot.create({
        data: {
          userId: entry.userId,
          householdId,
          period: 'WEEKLY',
          weekNumber,
          year,
          xpEarned: entry.xpEarned,
          rank: index + 1,
        },
      });
    })
  );

  console.log(`Created ${created.length} weekly snapshots for household ${householdId}, week ${weekNumber}/${year}`);
  return created;
}

export async function createMonthlySnapshot(householdId: string) {
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const startDate = startOfMonth(lastMonth);
  const endDate = endOfMonth(lastMonth);
  const year = startDate.getFullYear();
  const monthNumber = startDate.getMonth() + 1; // 1-12

  // Pobierz wszystkich użytkowników z gospodarstwa domowego z ich statystykami za ostatni miesiąc
  const users = await prisma.user.findMany({
    where: {
      householdId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const snapshots = await Promise.all(
    users.map(async (user) => {
      // Sprawdź czy snapshot już istnieje dla tego użytkownika
      const existing = await prisma.leaderboardSnapshot.findFirst({
        where: {
          userId: user.id,
          period: 'MONTHLY',
          monthNumber,
          year,
        },
      });

      if (existing) {
        console.log(`Monthly snapshot for user ${user.id} month ${monthNumber}/${year} already exists`);
        return existing;
      }

      // XP zdobyte w tym miesiącu
      const xpHistory = await prisma.pointsHistory.findMany({
        where: {
          userId: user.id,
          type: 'EARNED',
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      const xpEarned = xpHistory.reduce((sum, ph) => sum + ph.amount, 0);

      return {
        userId: user.id,
        xpEarned,
      };
    })
  );

  // Filtruj istniejące snapshoty
  const newEntries = snapshots.filter(s => !('id' in s)) as { userId: string; xpEarned: number }[];

  // Sortuj po XP
  newEntries.sort((a, b) => b.xpEarned - a.xpEarned);

  // Utwórz snapshoty dla nowych użytkowników
  const created = await Promise.all(
    newEntries.map(async (entry, index) => {
      return await prisma.leaderboardSnapshot.create({
        data: {
          userId: entry.userId,
          householdId,
          period: 'MONTHLY',
          monthNumber,
          year,
          xpEarned: entry.xpEarned,
          rank: index + 1,
        },
      });
    })
  );

  console.log(`Created ${created.length} monthly snapshots for household ${householdId}, month ${monthNumber}/${year}`);
  return created;
}
