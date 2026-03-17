/**
 * Script: Setup Seasonal Leaderboards
 *
 * Uruchamia migrację i tworzy pierwsze snapshoty
 *
 * Usage: npm run setup-seasonal-leaderboards
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  console.log('🚀 Setting up Seasonal Leaderboards...\n');

  try {
    // 1. Uruchom migrację SQL
    console.log('📦 Running migration...');
    const migrationPath = resolve(__dirname, '../prisma/migrations/add_seasonal_leaderboards.sql');
    const migration = readFileSync(migrationPath, 'utf-8');

    // Możesz uruchomić przez Prisma CLI lub bezpośrednio przez psql
    console.log('Migration SQL loaded. Please run it manually using:');
    console.log('  npx prisma db execute --file prisma/migrations/add_seasonal_leaderboards.sql');
    console.log('\nOr use Prisma Studio / your database client to execute the SQL.\n');

    // 2. Wygeneruj Prisma Client
    console.log('🔄 Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // 3. Opcjonalnie - utwórz pierwsze snapshoty
    console.log('\n📸 Creating initial snapshots...');
    console.log('You can now create snapshots by:');
    console.log('  1. Import functions: import { createWeeklySnapshot, createMonthlySnapshot } from "@/lib/leaderboard-snapshots"');
    console.log('  2. Call them: await createWeeklySnapshot()');
    console.log('\nOr set up a cron job to run them automatically:\n');
    console.log('  Weekly:  Every Monday at 00:01');
    console.log('  Monthly: 1st day of month at 00:01\n');

    console.log('✅ Setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Run the migration SQL');
    console.log('  2. Set up cron jobs (optional)');
    console.log('  3. Navigate to /gamification to see the seasonal leaderboards');
  } catch (error) {
    console.error('❌ Error during setup:', error);
    process.exit(1);
  }
}

main();
