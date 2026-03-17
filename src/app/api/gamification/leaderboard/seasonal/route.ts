import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * GET /api/gamification/leaderboard/seasonal?period=WEEKLY|MONTHLY&offset=0
 * Zwraca sezonowy leaderboard
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'WEEKLY'; // WEEKLY lub MONTHLY
    const offset = parseInt(searchParams.get('offset') || '0'); // 0 = current, 1 = previous, etc.

    if (period !== 'WEEKLY' && period !== 'MONTHLY') {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    const householdId = session.user.householdId;
    const now = new Date();

    // Oblicz weekNumber/monthNumber dla bieżącego okresu
    let currentWeekNumber: number | null = null;
    let currentMonthNumber: number | null = null;
    let currentYear = now.getFullYear();

    if (period === 'WEEKLY') {
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      currentWeekNumber = Math.ceil(((weekStart.getTime() - new Date(currentYear, 0, 1).getTime()) / 86400000 + 1) / 7);
    } else {
      currentMonthNumber = now.getMonth() + 1;
    }

    // Znajdź snapshoty dla danego okresu i gospodarstwa domowego
    const snapshots = await prisma.leaderboardSnapshot.findMany({
      where: {
        householdId,
        period,
        ...(period === 'WEEKLY' ? { weekNumber: currentWeekNumber } : { monthNumber: currentMonthNumber }),
        year: currentYear,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            avatar: true,
            level: true,
          },
        },
      },
      orderBy: {
        rank: 'asc',
      },
    });

    if (snapshots.length === 0) {
      // Brak snapshot - zwróć dane na bieżąco (current period)
      const userId = session.user.id;

      let startDate: Date, endDate: Date;
      if (period === 'WEEKLY') {
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
      } else {
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
      }

      // Pobierz użytkowników z tego gospodarstwa domowego
      const users = await prisma.user.findMany({
        where: {
          householdId,
        },
        take: 100,
      });

      const entries = await Promise.all(
        users.map(async (user) => {
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
            user: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              level: user.level,
            },
            rank: 0,
            xpEarned,
          };
        })
      );

      // Sortuj i przypisz ranki
      entries.sort((a, b) => b.xpEarned - a.xpEarned);
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Znajdź pozycję aktualnego użytkownika
      const userEntry = entries.find((e) => e.user.id === userId);

      return NextResponse.json({
        period,
        startDate,
        endDate,
        isCurrent: true,
        entries: entries.slice(0, 50),
        userEntry,
        totalEntries: entries.length,
      });
    }

    // Konwertuj snapshoty do formatu entries
    const entries = snapshots.map((snapshot) => ({
      user: {
        id: snapshot.User.id,
        name: snapshot.User.name,
        avatar: snapshot.User.avatar,
        level: snapshot.User.level,
      },
      rank: snapshot.rank,
      xpEarned: snapshot.xpEarned,
    }));

    const userEntry = entries.find((e) => e.user.id === session.user.id);

    // Oblicz daty dla okresu
    let startDate: Date, endDate: Date;
    if (period === 'WEEKLY' && currentWeekNumber) {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
    } else if (period === 'MONTHLY' && currentMonthNumber) {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
    } else {
      startDate = now;
      endDate = now;
    }

    return NextResponse.json({
      period,
      startDate,
      endDate,
      isCurrent: offset === 0,
      entries: entries.slice(0, 50),
      userEntry,
      totalEntries: entries.length,
    });
  } catch (error) {
    console.error('Error fetching seasonal leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
