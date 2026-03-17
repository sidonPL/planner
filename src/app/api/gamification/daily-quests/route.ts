import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTodayQuests, generateDailyQuests } from '@/lib/daily-quests';

// GET - pobierz dzisiejsze questy
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quests = await getTodayQuests(session.user.id, session.user.householdId);

    return NextResponse.json(quests);
  } catch (error) {
    console.error('Error fetching daily quests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - generuj nowe questy (admin only)
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const result = await generateDailyQuests(session.user.householdId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating daily quests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

