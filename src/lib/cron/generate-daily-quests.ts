import { DailyQuestType } from '@prisma/client';
import { startOfDay } from 'date-fns';
import { prisma } from '../prisma';

/**
 * Generates daily quests for all households
 * Run this daily at 00:00 (midnight)
 */
export async function generateDailyQuests() {
  console.log('🎲 Generating daily quests...');

  try {
    const households = await prisma.household.findMany({
      select: { id: true, name: true },
    });

    console.log(`Found ${households.length} households`);

    const today = startOfDay(new Date());

    for (const household of households) {
      try {
        // 1. Delete old quests (older than today)
        const deleted = await prisma.dailyQuest.deleteMany({
          where: {
            householdId: household.id,
            date: { lt: today },
          },
        });

        if (deleted.count > 0) {
          console.log(`  🗑️  Deleted ${deleted.count} old quests for ${household.name}`);
        }

        // 2. Check if today's quests already exist
        const existingQuests = await prisma.dailyQuest.findMany({
          where: {
            householdId: household.id,
            date: today,
          },
        });

        if (existingQuests.length >= 3) {
          console.log(`  ⏭️  ${household.name} already has ${existingQuests.length} active quests for today, skipping`);
          continue;
        }

        // 3. Get active quest templates
        const templates = await prisma.questTemplate.findMany({
          where: { isActive: true },
        });

        if (templates.length === 0) {
          console.warn(`  ⚠️  No active quest templates found!`);
          continue;
        }

        // 4. Weighted random selection
        const selectedTemplates = weightedRandomSelection(templates, 5 - existingQuests.length);

        // 5. Create daily quests
        let createdCount = 0;
        for (const template of selectedTemplates) {
          await prisma.dailyQuest.create({
            data: {
              householdId: household.id,
              title: template.title,
              description: template.description,
              type: template.type as DailyQuestType,
              target: template.requirementValue,
              reward: template.xpReward,
              date: today,
              isActive: true,
            },
          });
          createdCount++;
        }

        console.log(`  ✅ Created ${createdCount} new quests for ${household.name}`);
      } catch (error) {
        console.error(`  ❌ Error generating quests for ${household.name}:`, error);
      }
    }

    console.log('✅ Daily quest generation completed!');
  } catch (error) {
    console.error('❌ Error in generateDailyQuests:', error);
    throw error;
  }
}

/**
 * Weighted random selection from quest templates
 * Templates with higher weight have higher probability
 */
function weightedRandomSelection<T extends { weight: number }>(
  items: T[],
  count: number
): T[] {
  const selected: T[] = [];
  const remaining = [...items];

  while (selected.length < count && remaining.length > 0) {
    // Calculate total weight
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);

    // Random selection based on weight
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < remaining.length; i++) {
      random -= remaining[i].weight;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    // Add to selected and remove from remaining
    selected.push(remaining[selectedIndex]);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
}

// If running directly (not imported)
if (require.main === module) {
  generateDailyQuests()
    .then(() => {
      console.log('✅ Daily quest generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Daily quest generation failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

