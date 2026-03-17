import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const totalTasks = await prisma.task.count();

    const completedTasks = await prisma.taskCompletion.count();

    const overdueTasks = await prisma.task.count({
      where: {
        dueDate: {
          lt: new Date(),
        },
        completions: {
          none: {},
        },
      },
    });

    const todayTasks = await prisma.task.count({
      where: {
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    });

    // Top templates (mock data - would need proper tracking)
    const topTemplates = [
      { id: '1', title: 'Sprzątanie kuchni', usageCount: 45 },
      { id: '2', title: 'Zakupy spożywcze', usageCount: 38 },
      { id: '3', title: 'Wyprowadzenie psa', usageCount: 32 },
      { id: '4', title: 'Pranie ubrań', usageCount: 28 },
      { id: '5', title: 'Gotowanie obiadu', usageCount: 24 },
    ];

    return NextResponse.json({
      stats: {
        totalTasks,
        completedTasks,
        overdueTasks,
        todayTasks,
        topTemplates,
      },
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

