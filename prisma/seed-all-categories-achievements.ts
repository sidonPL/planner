import { PrismaClient, AchievementCategory, AchievementRarity } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Kompletny seed osiągnięć dla wszystkich kategorii
 * Uzupełnia brakujące kategorie: INVENTORY i SOCIAL
 */
const allCategoriesAchievements = [
  // ===== INVENTORY SERIES =====
  {
    name: "Zarządca Zapasów - Bronze",
    description: "Dodaj 10 produktów do inwentarza",
    icon: "📦",
    category: AchievementCategory.INVENTORY,
    requirementType: "INVENTORY_ITEMS",
    requirementValue: 10,
    xpReward: 10,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Zarządca Zapasów",
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Zarządca Zapasów - Silver",
    description: "Dodaj 50 produktów do inwentarza",
    icon: "📦",
    category: AchievementCategory.INVENTORY,
    requirementType: "INVENTORY_ITEMS",
    requirementValue: 50,
    xpReward: 40,
    tier: 2,
    tierName: "Silver",
    seriesName: "Zarządca Zapasów",
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Zarządca Zapasów - Gold",
    description: "Dodaj 200 produktów do inwentarza",
    icon: "📦",
    category: AchievementCategory.INVENTORY,
    requirementType: "INVENTORY_ITEMS",
    requirementValue: 200,
    xpReward: 120,
    tier: 3,
    tierName: "Gold",
    seriesName: "Zarządca Zapasów",
    rarity: AchievementRarity.RARE,
  },
  {
    name: "Zarządca Zapasów - Platinum",
    description: "Dodaj 1000 produktów - Mistrz Organizacji!",
    icon: "📦",
    category: AchievementCategory.INVENTORY,
    requirementType: "INVENTORY_ITEMS",
    requirementValue: 1000,
    xpReward: 500,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Zarządca Zapasów",
    rarity: AchievementRarity.EPIC,
  },

  // ===== SOCIAL / COOPERATION SERIES =====
  {
    name: "Gracz Zespołowy - Bronze",
    description: "Ukończ 5 zadań przypisanych przez innych",
    icon: "🤝",
    category: AchievementCategory.SOCIAL,
    requirementType: "TASKS_FROM_OTHERS",
    requirementValue: 5,
    xpReward: 15,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Gracz Zespołowy",
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Gracz Zespołowy - Silver",
    description: "Ukończ 25 zadań przypisanych przez innych",
    icon: "🤝",
    category: AchievementCategory.SOCIAL,
    requirementType: "TASKS_FROM_OTHERS",
    requirementValue: 25,
    xpReward: 50,
    tier: 2,
    tierName: "Silver",
    seriesName: "Gracz Zespołowy",
    rarity: AchievementRarity.COMMON,
  },
  {
    name: "Gracz Zespołowy - Gold",
    description: "Ukończ 100 zadań przypisanych przez innych",
    icon: "🤝",
    category: AchievementCategory.SOCIAL,
    requirementType: "TASKS_FROM_OTHERS",
    requirementValue: 100,
    xpReward: 150,
    tier: 3,
    tierName: "Gold",
    seriesName: "Gracz Zespołowy",
    rarity: AchievementRarity.RARE,
  },
  {
    name: "Gracz Zespołowy - Platinum",
    description: "Ukończ 500 zadań - Fundament Zespołu!",
    icon: "🤝",
    category: AchievementCategory.SOCIAL,
    requirementType: "TASKS_FROM_OTHERS",
    requirementValue: 500,
    xpReward: 600,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Gracz Zespołowy",
    rarity: AchievementRarity.EPIC,
  },

  // ===== MASTER SERIES (wszystko) =====
  {
    name: "Mistrz Uniwersalny - Bronze",
    description: "Zdobądź 10 osiągnięć z różnych kategorii",
    icon: "👑",
    category: AchievementCategory.MASTER,
    requirementType: "DIVERSE_ACHIEVEMENTS",
    requirementValue: 10,
    xpReward: 50,
    tier: 1,
    tierName: "Bronze",
    seriesName: "Mistrz Uniwersalny",
    rarity: AchievementRarity.RARE,
  },
  {
    name: "Mistrz Uniwersalny - Silver",
    description: "Zdobądź 25 osiągnięć z różnych kategorii",
    icon: "👑",
    category: AchievementCategory.MASTER,
    requirementType: "DIVERSE_ACHIEVEMENTS",
    requirementValue: 25,
    xpReward: 150,
    tier: 2,
    tierName: "Silver",
    seriesName: "Mistrz Uniwersalny",
    rarity: AchievementRarity.RARE,
  },
  {
    name: "Mistrz Uniwersalny - Gold",
    description: "Zdobądź 50 osiągnięć z różnych kategorii",
    icon: "👑",
    category: AchievementCategory.MASTER,
    requirementType: "DIVERSE_ACHIEVEMENTS",
    requirementValue: 50,
    xpReward: 400,
    tier: 3,
    tierName: "Gold",
    seriesName: "Mistrz Uniwersalny",
    rarity: AchievementRarity.EPIC,
  },
  {
    name: "Mistrz Uniwersalny - Platinum",
    description: "Zdobądź 100 osiągnięć - Legenda Plannera!",
    icon: "👑",
    category: AchievementCategory.MASTER,
    requirementType: "DIVERSE_ACHIEVEMENTS",
    requirementValue: 100,
    xpReward: 1500,
    tier: 4,
    tierName: "Platinum",
    seriesName: "Mistrz Uniwersalny",
    rarity: AchievementRarity.LEGENDARY,
  },

  // ===== SECRET ACHIEVEMENTS =====
  {
    name: "Nocny Maratończyk",
    description: "Ukończ 10 zadań między 00:00 a 06:00",
    icon: "🦉",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_NIGHT",
    requirementValue: 10,
    xpReward: 100,
    tier: null,
    tierName: null,
    seriesName: null,
    rarity: AchievementRarity.EPIC,
    isSecret: true,
  },
  {
    name: "Perfekcjonista",
    description: "Ukończ 50 zadań z priorytetem HIGH",
    icon: "💎",
    category: AchievementCategory.TASKS,
    requirementType: "TASKS_HIGH_PRIORITY",
    requirementValue: 50,
    xpReward: 150,
    tier: null,
    tierName: null,
    seriesName: null,
    rarity: AchievementRarity.EPIC,
    isSecret: true,
  },
  {
    name: "Kulinarny Eksplorator",
    description: "Dodaj przepisy z 10 różnych kuchni świata",
    icon: "🌍",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_DIVERSE_CUISINES",
    requirementValue: 10,
    xpReward: 120,
    tier: null,
    tierName: null,
    seriesName: null,
    rarity: AchievementRarity.RARE,
    isSecret: true,
  },
  {
    name: "Zero Waste Hero",
    description: "Zużyj 100 produktów przed datą ważności",
    icon: "♻️",
    category: AchievementCategory.INVENTORY,
    requirementType: "INVENTORY_USED_BEFORE_EXPIRY",
    requirementValue: 100,
    xpReward: 200,
    tier: null,
    tierName: null,
    seriesName: null,
    rarity: AchievementRarity.LEGENDARY,
    isSecret: true,
  },
  {
    name: "Ekonom Rodzinny",
    description: "Zaoszczędź 1000 zł na zakupach",
    icon: "💰",
    category: AchievementCategory.SHOPPING,
    requirementType: "SHOPPING_SAVINGS",
    requirementValue: 1000,
    xpReward: 250,
    tier: null,
    tierName: null,
    seriesName: null,
    rarity: AchievementRarity.LEGENDARY,
    isSecret: true,
  },
];

async function main() {
  console.log('🌟 Seeding All Categories Achievements...');

  const createdAchievements = [];

  for (const achievement of allCategoriesAchievements) {
    // Check if already exists
    const existing = await prisma.achievement.findFirst({
      where: {
        name: achievement.name,
        category: achievement.category,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing: ${achievement.name}`);
      continue;
    }

    const created = await prisma.achievement.create({
      data: achievement,
    });
    createdAchievements.push(created);
    console.log(`  ✅ Created: ${achievement.name}`);
  }

  console.log(`\n✅ Created ${createdAchievements.length} new achievements`);

  // Link tiers
  const series = [...new Set(allCategoriesAchievements.filter(a => a.seriesName).map(a => a.seriesName))];

  for (const seriesName of series) {
    const seriesAchievements = (await prisma.achievement.findMany({
      where: { seriesName },
      orderBy: { tier: 'asc' },
    }));

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

  console.log(`\n🔗 Linked tiers for ${series.length} series`);

  // Display summary
  console.log('\n📊 Summary by category:');
  for (const category of Object.values(AchievementCategory)) {
    const count = allCategoriesAchievements.filter(a => a.category === category).length;
    if (count > 0) {
      console.log(`   ${category}: ${count} achievements`);
    }
  }

  const secretCount = allCategoriesAchievements.filter(a => a.isSecret).length;
  console.log(`\n🎭 Secret Achievements: ${secretCount}`);

  console.log('\n✅ All Categories Achievements seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding achievements:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

