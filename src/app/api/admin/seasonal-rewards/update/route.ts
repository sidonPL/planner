import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { updateSeasonalRewards } from '@/lib/seasonal-rewards';

/**
 * POST /api/admin/seasonal-rewards/update
 * Manually trigger seasonal rewards update (admin only)
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await updateSeasonalRewards();

    return NextResponse.json({
      success: true,
      message: 'Seasonal rewards updated',
      ...result,
    });
  } catch (error) {
    console.error('Error updating seasonal rewards:', error);
    return NextResponse.json(
      { error: 'Failed to update seasonal rewards' },
      { status: 500 }
    );
  }
}

