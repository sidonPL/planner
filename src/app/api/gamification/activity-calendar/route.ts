import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getActivityCalendar } from '@/lib/gamification';

// GET - pobierz kalendarz aktywności (last 30 days)
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const calendar = await getActivityCalendar(session.user.id);

    return NextResponse.json(calendar);
  } catch (error) {
    console.error('Error fetching activity calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

