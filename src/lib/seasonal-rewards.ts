/**
 * Seasonal Rewards Auto-Management
 * Automatically activates/deactivates seasonal rewards based on dates
 */

import { prisma } from './prisma';

/**
 * Update seasonal rewards status based on current date
 * Should be run daily via cron job
 */
export async function updateSeasonalRewards() {
  const now = new Date();

  console.log('🎃 Updating seasonal rewards...');

  try {
    // Activate rewards that are now in season
    const activated = await prisma.reward.updateMany({
      where: {
        isSeasonal: true,
        availableFrom: { lte: now },
        availableUntil: { gte: now },
        isActive: false,
      },
      data: { isActive: true },
    });

    if (activated.count > 0) {
      console.log(`✅ Activated ${activated.count} seasonal rewards`);
    }

    // Deactivate rewards that are now out of season
    const deactivated = await prisma.reward.updateMany({
      where: {
        isSeasonal: true,
        OR: [
          { availableUntil: { lt: now } },
          { availableFrom: { gt: now } }
        ],
        isActive: true,
      },
      data: { isActive: false },
    });

    if (deactivated.count > 0) {
      console.log(`🔒 Deactivated ${deactivated.count} out-of-season rewards`);
    }

    // Get upcoming seasonal rewards (within next 7 days)
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const upcoming = await prisma.reward.findMany({
      where: {
        isSeasonal: true,
        availableFrom: {
          gte: now,
          lte: weekFromNow,
        },
      },
      select: {
        name: true,
        seasonName: true,
        availableFrom: true,
      },
    });

    if (upcoming.length > 0) {
      console.log(`📅 Upcoming seasonal rewards (next 7 days):`);
      upcoming.forEach(reward => {
        console.log(`  - ${reward.name} (${reward.seasonName}) - starts ${reward.availableFrom}`);
      });
    }

    return {
      activated: activated.count,
      deactivated: deactivated.count,
      upcoming: upcoming.length,
    };
  } catch (error) {
    console.error('Error updating seasonal rewards:', error);
    throw error;
  }
}

/**
 * Get current seasonal rewards
 */
export async function getCurrentSeasonalRewards() {
  const now = new Date();

  return await prisma.reward.findMany({
    where: {
      isSeasonal: true,
      isActive: true,
      availableFrom: { lte: now },
      availableUntil: { gte: now },
    },
    orderBy: {
      availableUntil: 'asc',
    },
  });
}

/**
 * Get time remaining for seasonal reward
 */
export function getSeasonalTimeRemaining(availableUntil: Date): string {
  const now = new Date();
  const diff = availableUntil.getTime() - now.getTime();

  if (diff <= 0) return 'Wygasło';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days} dni`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${minutes}min`;
  }
}

