import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { checkDailyLoginReward, getLoginStats, canClaimTodayReward } from '@/lib/daily-login-rewards';

/**
 * GET /api/gamification/daily-login
 * Check if user can claim today's reward and get stats
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canClaim = await canClaimTodayReward(session.user.id);
    const stats = await getLoginStats(session.user.id);

    return NextResponse.json({
      canClaim,
      stats,
    });
  } catch (error) {
    console.error('Error getting daily login status:', error);
    return NextResponse.json(
      { error: 'Failed to get daily login status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gamification/daily-login
 * Claim today's login reward
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.householdId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await checkDailyLoginReward(
      session.user.id,
      session.user.householdId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error claiming daily login reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim daily login reward' },
      { status: 500 }
    );
  }
}

