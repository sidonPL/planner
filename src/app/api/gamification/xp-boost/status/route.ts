import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { hasActiveXPBoost } from '@/lib/xp';

/**
 * GET /api/gamification/xp-boost/status
 * Zwraca status aktywnego XP boost dla zalogowanego użytkownika
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const boostStatus = await hasActiveXPBoost(session.user.id);

    return NextResponse.json(boostStatus);
  } catch (error) {
    console.error('Error fetching XP boost status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

