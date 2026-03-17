import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalEvents = await prisma.event.count();

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingEvents = await prisma.event.count({
      where: {
        startDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    });

    const anniversaries = await prisma.anniversary.count();

    // Count users with birthDate set
    const birthdays = await prisma.user.count({
      where: {
        birthDate: {
          not: null,
        },
      },
    });

    // Get upcoming events list
    const upcomingList = await prisma.event.findMany({
      where: {
        startDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
      take: 10,
      orderBy: {
        startDate: 'asc',
      },
      include: {
        household: {
          select: {
            name: true,
          },
        },
      },
    });

    const formattedUpcoming = upcomingList.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.startDate,
      type: 'EVENT',
      householdName: event.household?.name || 'Nieznane',
    }));

    return NextResponse.json({
      stats: {
        totalEvents,
        upcomingEvents,
        anniversaries,
        birthdays,
        upcomingList: formattedUpcoming,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

