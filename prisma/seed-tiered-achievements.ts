import { PrismaClient, AchievementCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Tiered Achievement Series
const tieredAchievements = [
  // ===== PIZZA MASTER SERIES =====
  {
    name: "Mistrz Pizzy - Bronze",
    description: "Stwórz 5 pizz",
    icon: "🍕",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CATEGORY",
    requirementValue: 5,
    xpReward: 10,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Mistrz Pizzy",
  },
  {
    name: "Mistrz Pizzy - Silver",
    description: "Stwórz 25 pizz",
    icon: "🍕",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CATEGORY",
    requirementValue: 25,
    xpReward: 30,
    tier: 2,
    tierName: "Silver",
    seriesName: "Mistrz Pizzy",
  },
  {
    name: "Mistrz Pizzy - Gold",
    description: "Stwórz 100 pizz",
    icon: "🍕",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CATEGORY",
    requirementValue: 100,
    xpReward: 100,
    tier: 3,
    tierName: "Gold",
    seriesName: "Mistrz Pizzy",
  },
  {
    name: "Mistrz Pizzy - Platinum",
    description: "Stwórz 500 pizz - Legenda!",
    icon: "🍕",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CATEGORY",
    requirementValue: 500,
    xpReward: 500,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Mistrz Pizzy",
  },

  // ===== TASK MASTER SERIES =====
  {
    name: "Wykonawca - Bronze",
    description: "Ukończ 10 zadań",
    icon: "✅",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_COMPLETED",
    requirementValue: 10,
    xpReward: 15,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Wykonawca",
  },
  {
    name: "Wykonawca - Silver",
    description: "Ukończ 50 zadań",
    icon: "✅",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_COMPLETED",
    requirementValue: 50,
    xpReward: 50,
    tier: 2,
    tierName: "Silver",
    seriesName: "Wykonawca",
  },
  {
    name: "Wykonawca - Gold",
    description: "Ukończ 200 zadań",
    icon: "✅",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_COMPLETED",
    requirementValue: 200,
    xpReward: 150,
    tier: 3,
    tierName: "Gold",
    seriesName: "Wykonawca",
  },
  {
    name: "Wykonawca - Platinum",
    description: "Ukończ 1000 zadań - Nieustępliwy!",
    icon: "✅",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_COMPLETED",
    requirementValue: 1000,
    xpReward: 750,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Wykonawca",
  },

  // ===== STREAK MASTER SERIES =====
  {
    name: "Człowiek Nawyku - Bronze",
    description: "Utrzymaj streak przez 7 dni",
    icon: "🔥",
    category: AchievementCategory.STREAK,
    requirementType: "STREAK_DAYS",
    requirementValue: 7,
    xpReward: 20,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Człowiek Nawyku",
  },
  {
    name: "Człowiek Nawyku - Silver",
    description: "Utrzymaj streak przez 30 dni",
    icon: "🔥",
    category: AchievementCategory.STREAK,
    requirementType: "STREAK_DAYS",
    requirementValue: 30,
    xpReward: 75,
    tier: 2,
    tierName: "Silver",
    seriesName: "Człowiek Nawyku",
  },
  {
    name: "Człowiek Nawyku - Gold",
    description: "Utrzymaj streak przez 100 dni",
    icon: "🔥",
    category: AchievementCategory.STREAK,
    requirementType: "STREAK_DAYS",
    requirementValue: 100,
    xpReward: 250,
    tier: 3,
    tierName: "Gold",
    seriesName: "Człowiek Nawyku",
  },
  {
    name: "Człowiek Nawyku - Platinum",
    description: "Utrzymaj streak przez 365 dni - Rok perfekcji!",
    icon: "🔥",
    category: AchievementCategory.STREAK,
    requirementType: "STREAK_DAYS",
    requirementValue: 365,
    xpReward: 1000,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Człowiek Nawyku",
  },

  // ===== CHEF SERIES =====
  {
    name: "Szef Kuchni - Bronze",
    description: "Stwórz 10 różnych przepisów",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CREATED",
    requirementValue: 10,
    xpReward: 25,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Szef Kuchni",
  },
  {
    name: "Szef Kuchni - Silver",
    description: "Stwórz 50 różnych przepisów",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CREATED",
    requirementValue: 50,
    xpReward: 100,
    tier: 2,
    tierName: "Silver",
    seriesName: "Szef Kuchni",
  },
  {
    name: "Szef Kuchni - Gold",
    description: "Stwórz 200 różnych przepisów",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CREATED",
    requirementValue: 200,
    xpReward: 400,
    tier: 3,
    tierName: "Gold",
    seriesName: "Szef Kuchni",
  },
  {
    name: "Szef Kuchni - Platinum",
    description: "Stwórz 500 różnych przepisów - Mistrz Mistrzów!",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_CREATED",
    requirementValue: 500,
    xpReward: 1500,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Szef Kuchni",
  },

  // ===== MEAL PLANNER SERIES =====
  {
    name: "Planer Posiłków - Bronze",
    description: "Zaplanuj 20 posiłków",
    icon: "📅",
    category: AchievementCategory.MEALS,
    requirementType: "MEALS_PLANNED",
    requirementValue: 20,
    xpReward: 20,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Planer Posiłków",
  },
  {
    name: "Planer Posiłków - Silver",
    description: "Zaplanuj 100 posiłków",
    icon: "📅",
    category: AchievementCategory.MEALS,
    requirementType: "MEALS_PLANNED",
    requirementValue: 100,
    xpReward: 75,
    tier: 2,
    tierName: "Silver",
    seriesName: "Planer Posiłków",
  },
  {
    name: "Planer Posiłków - Gold",
    description: "Zaplanuj 500 posiłków",
    icon: "📅",
    category: AchievementCategory.MEALS,
    requirementType: "MEALS_PLANNED",
    requirementValue: 500,
    xpReward: 300,
    tier: 3,
    tierName: "Gold",
    seriesName: "Planer Posiłków",
  },
  {
    name: "Planer Posiłków - Platinum",
    description: "Zaplanuj 2000 posiłków - Strategiczny Umysł!",
    icon: "📅",
    category: AchievementCategory.MEALS,
    requirementType: "MEALS_PLANNED",
    requirementValue: 2000,
    xpReward: 1000,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Planer Posiłków",
  },

  // ===== SHOPPING MASTER SERIES =====
  {
    name: "Król Zakupów - Bronze",
    description: "Ukończ 10 list zakupów",
    icon: "🛒",
    category: AchievementCategory.SHOPPING,
    requirementType: "SHOPPING_COMPLETED",
    requirementValue: 10,
    xpReward: 15,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Król Zakupów",
  },
  {
    name: "Król Zakupów - Silver",
    description: "Ukończ 50 list zakupów",
    icon: "🛒",
    category: AchievementCategory.SHOPPING,
    requirementType: "SHOPPING_COMPLETED",
    requirementValue: 50,
    xpReward: 60,
    tier: 2,
    tierName: "Silver",
    seriesName: "Król Zakupów",
  },
  {
    name: "Król Zakupów - Gold",
    description: "Ukończ 200 list zakupów",
    icon: "🛒",
    category: AchievementCategory.SHOPPING,
    requirementType: "SHOPPING_COMPLETED",
    requirementValue: 200,
    xpReward: 200,
    tier: 3,
    tierName: "Gold",
    seriesName: "Król Zakupów",
  },
  {
    name: "Król Zakupów - Platinum",
    description: "Ukończ 1000 list zakupów - Zakupoholik!",
    icon: "🛒",
    category: AchievementCategory.SHOPPING,
    requirementType: "SHOPPING_COMPLETED",
    requirementValue: 1000,
    xpReward: 800,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Król Zakupów",
  },
];

async function main() {
  console.log('🏆 Seeding Tiered Achievements...');

  // Create achievements and link tiers
  const createdAchievements = [];

  for (const achievement of tieredAchievements) {
    const created = await prisma.achievement.create({
      data: achievement,
    });
    createdAchievements.push(created);
  }

  console.log(`✅ Created ${createdAchievements.length} tiered achievements`);

  // Link tiers (set nextTierId and previousTierId)
  const series = [...new Set(tieredAchievements.map(a => a.seriesName))];

  for (const seriesName of series) {
    const seriesAchievements = createdAchievements
      .filter(a => a.seriesName === seriesName)
      .sort((a, b) => (a.tier || 0) - (b.tier || 0));

    for (let i = 0; i < seriesAchievements.length; i++) {
      const current = seriesAchievements[i];
      const next = seriesAchievements[i + 1];
      const previous = seriesAchievements[i - 1];

      await prisma.achievement.update({
        where: { id: current.id },
        data: {
          nextTierId: next?.id || null,
          previousTierId: previous?.id || null,
        },
      });
    }
  }

  console.log(`🔗 Linked tiers for ${series.length} series`);

  // Display summary
  console.log('\n📊 Summary by series:');
  for (const seriesName of series) {
    const count = createdAchievements.filter(a => a.seriesName === seriesName).length;
    console.log(`   ${seriesName}: ${count} tiers (Bronze → Platinum)`);
  }

  console.log('\n✅ Tiered Achievements seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding tiered achievements:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

