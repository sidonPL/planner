/**
 * Cron Job: Create Leaderboard Snapshots
 *
 * This file re-exports functions from leaderboard-snapshots.ts for backward compatibility
 * and provides a CLI interface for running snapshots manually.
 */

export {
  createWeeklySnapshot as createWeeklyLeaderboardSnapshot,
  createMonthlySnapshot as createMonthlyLeaderboardSnapshot
} from '../leaderboard-snapshots';

import { createWeeklySnapshot, createMonthlySnapshot } from '../leaderboard-snapshots';
import { prisma } from '../prisma';


// If running directly (not imported)
if (require.main === module) {
  const mode = process.argv[2] || 'weekly';

  const run = async () => {
    // Pobierz wszystkie gospodarstwa domowe
    const households = await prisma.household.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    if (households.length === 0) {
      console.log('⚠️ No households found');
      return;
    }

    console.log(`📊 Creating snapshots for ${households.length} household(s)...`);

    for (const household of households) {
      console.log(`\n🏠 Processing household: ${household.name} (${household.id})`);

      try {
        if (mode === 'weekly') {
          await createWeeklySnapshot(household.id);
        } else if (mode === 'monthly') {
          await createMonthlySnapshot(household.id);
        } else if (mode === 'both') {
          await createWeeklySnapshot(household.id);
          await createMonthlySnapshot(household.id);
        } else {
          console.error('❌ Invalid mode. Use: weekly, monthly, or both');
          process.exit(1);
        }
      } catch (error) {
        console.error(`❌ Failed to create snapshot for household ${household.name}:`, error);
        // Continue with next household
      }
    }
  };

  run()
    .then(() => {
      console.log('\n✅ Leaderboard snapshot creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Leaderboard snapshot creation failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

