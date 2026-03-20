/**
 * Daily Quests Auto-Generation Script (Direct Database)
 *
 * Usage:
 *   node scripts/generate-daily-quests.js
 *
 * Crontab (daily at midnight):
 *   0 0 * * * cd /path/to/planner && node scripts/generate-daily-quests.js >> /var/log/planner/cron.log 2>&1
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Quest templates
const QUEST_TEMPLATES = [
  {
    title: 'Wykonaj 3 zadania',
    description: 'Ukończ dowolne 3 zadania z listy',
    type: 'TASKS',
    target: 3,
    reward: 30,
  },
  {
    title: 'Dodaj przepis',
    description: 'Dodaj nowy przepis do bazy',
    type: 'RECIPES',
    target: 1,
    reward: 20,
  },
  {
    title: 'Zaplanuj posiłki',
    description: 'Zaplanuj 2 posiłki na dziś',
    type: 'MEALS',
    target: 2,
    reward: 25,
  },
  {
    title: 'Zrób zakupy',
    description: 'Zaznacz zakupy jako zrobione',
    type: 'SHOPPING',
    target: 1,
    reward: 15,
  },
  {
    title: 'Sprawdź inwentarz',
    description: 'Dodaj lub zaktualizuj produkt w inwentarzu',
    type: 'INVENTORY',
    target: 1,
    reward: 10,
  },
];

async function generateDailyQuests(householdId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if quests already exist for today
  const existing = await prisma.dailyQuest.findFirst({
    where: {
      householdId,
      date: today,
    },
  });

  if (existing) {
    return { message: 'Quests already exist for today', created: 0 };
  }

  // Select 3 random quests
  const selectedQuests = [...QUEST_TEMPLATES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Create quests
  const createdQuests = await Promise.all(
    selectedQuests.map((template) =>
      prisma.dailyQuest.create({
        data: {
          householdId,
          title: template.title,
          description: template.description,
          type: template.type,
          target: template.target,
          reward: template.reward,
          date: today,
        },
      })
    )
  );

  // Auto-join all household members
  const members = await prisma.user.findMany({
    where: { householdId },
    select: { id: true },
  });

  for (const quest of createdQuests) {
    await prisma.dailyQuestCompletion.createMany({
      data: members.map((member) => ({
        questId: quest.id,
        userId: member.id,
      })),
    });
  }

  return { created: createdQuests.length, quests: createdQuests };
}

async function main() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ===== STARTING DAILY QUESTS GENERATION =====`);

  try {
    // Get all households
    const households = await prisma.household.findMany({
      select: { id: true, name: true },
    });

    console.log(`Found ${households.length} household(s)`);

    let successCount = 0;
    let errorCount = 0;

    // Generate quests for each household
    for (const household of households) {
      try {
        const result = await generateDailyQuests(household.id);
        console.log(
          `✓ ${household.name}: ${result.created > 0 ? `Generated ${result.created} quests` : result.message}`
        );
        successCount++;
      } catch (error) {
        console.error(`✗ ${household.name}: Error -`, error.message);
        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n===== SUMMARY =====`);
    console.log(`Total households: ${households.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`[${new Date().toISOString()}] ===== COMPLETED =====\n`);

    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
