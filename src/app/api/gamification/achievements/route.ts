import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserAchievements, initializeAchievements } from '@/lib/achievements';

// GET - pobierz achievements użytkownika
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const achievements = await getUserAchievements(session.user.id);

    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - inicjalizuj achievements (admin only)
export async function POST() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeAchievements();

    return NextResponse.json({ success: true, message: 'Achievements initialized' });
  } catch (error) {
    console.error('Error initializing achievements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

