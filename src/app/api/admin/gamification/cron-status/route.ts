import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock cron status - in production this would check PM2 or actual cron logs
    const jobs = [
      {
        name: 'cron-daily-quests',
        schedule: '0 0 * * *',
        lastRun: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
        nextRun: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
        status: 'success',
        lastResult: {
          success: true,
          message: 'Quests generated successfully',
          householdsProcessed: 3,
          results: [
            { householdName: 'Rodzina Kowalskich', created: 3 },
            { householdName: 'Rodzina Nowak', created: 3 },
            { householdName: 'Mieszkanie Shared', created: 3 },
          ],
        },
      },
      {
        name: 'cron-task-reminders',
        schedule: '*/15 * * * *',
        lastRun: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15min ago
        nextRun: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: 'success',
        lastResult: {
          success: true,
          message: 'Reminders sent',
        },
      },
    ];

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching cron status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

