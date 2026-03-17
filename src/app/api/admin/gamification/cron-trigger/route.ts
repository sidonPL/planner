import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobName } = await request.json();

    // Trigger the cron job manually by calling its endpoint
    const cronSecret = process.env.CRON_SECRET;
    let endpoint = '';

    switch (jobName) {
      case 'cron-daily-quests':
        endpoint = '/api/cron/daily-quests';
        break;
      case 'cron-task-reminders':
        endpoint = '/api/cron/task-reminders';
        break;
      default:
        return NextResponse.json({ error: 'Unknown job' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Job execution failed' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error triggering cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

