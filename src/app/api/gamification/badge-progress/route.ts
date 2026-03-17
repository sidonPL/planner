import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserBadgeProgress } from '@/lib/achievements';

// GET - pobierz postęp odznak użytkownika
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const badges = await getUserBadgeProgress(session.user.id);

    return NextResponse.json(badges);
  } catch (error) {
    console.error('Error fetching badge progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

