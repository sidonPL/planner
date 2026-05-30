import { NextResponse } from 'next/server';
import { verifyCronAuth } from "@/lib/web-push";
import { prisma } from '@/lib/prisma';
import { generateDailyQuests } from '@/lib/daily-quests';

// Vercel Cron Job - uruchamiany codziennie o północy
// Authorization: Bearer token z .env
export async function GET(request: Request) {
  try {
    // Verify authorization
  if (!verifyCronAuth(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    console.log('[CRON] Starting daily quests generation...');

    // Get all households
    const households = await prisma.household.findMany({
      select: { id: true, name: true },
    });

    const results = [];

    // Generate quests for each household
    for (const household of households) {
      try {
        const result = await generateDailyQuests(household.id);
        results.push({
          householdId: household.id,
          householdName: household.name,
          ...result,
        });
        console.log(`[CRON] Generated quests for household: ${household.name}`);
      } catch (error) {
        console.error(`[CRON] Error generating quests for ${household.name}:`, error);
        results.push({
          householdId: household.id,
          householdName: household.name,
          error: 'Failed to generate',
        });
      }
    }

    console.log(`[CRON] Completed! Generated quests for ${households.length} households`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      householdsProcessed: households.length,
      results,
    });
  } catch (error) {
    console.error('[CRON] Error in daily quests generation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

