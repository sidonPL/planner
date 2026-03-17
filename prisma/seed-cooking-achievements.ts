// Seed dla osiągnięć kulinarnych
// Ten plik dodaje osiągnięcia związane z gotowaniem do bazy danych

import { prisma } from "../src/lib/prisma";
import { AchievementCategory } from "@prisma/client";

const cookingAchievements: Array<{
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  requirementType: string;
  requirementValue: number;
  xpReward: number;
  isSecret: boolean;
}> = [
  // Pierwsze kroki
  {
    name: "Pierwszy posiłek",
    description: "Ugotuj swój pierwszy przepis",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 1,
    xpReward: 10,
    isSecret: false,
  },
  {
    name: "Praktykant",
    description: "Ugotuj 5 przepisów",
    icon: "🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 5,
    xpReward: 25,
    isSecret: false,
  },
  {
    name: "Kucharz",
    description: "Ugotuj 10 przepisów",
    icon: "👨‍🍳",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 10,
    xpReward: 50,
    isSecret: false,
  },
  {
    name: "Szef kuchni",
    description: "Ugotuj 25 przepisów",
    icon: "👨‍🍳✨",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 25,
    xpReward: 100,
    isSecret: false,
  },
  {
    name: "Mistrz kulinarny",
    description: "Ugotuj 50 przepisów",
    icon: "🏆",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 50,
    xpReward: 200,
    isSecret: false,
  },
  {
    name: "Legenda kuchni",
    description: "Ugotuj 100 przepisów",
    icon: "👑",
    category: AchievementCategory.RECIPES,
    requirementType: "RECIPES_COOKED",
    requirementValue: 100,
    xpReward: 500,
    isSecret: false,
  },

  // Różnorodność
  {
    name: "Odkrywca smaków",
    description: "Ugotuj 10 różnych przepisów",
    icon: "🗺️",
    category: AchievementCategory.RECIPES,
    requirementType: "UNIQUE_RECIPES",
    requirementValue: 10,
    xpReward: 50,
    isSecret: false,
  },
  {
    name: "Kolekcjoner przepisów",
    description: "Ugotuj 25 różnych przepisów",
    icon: "📚",
    category: AchievementCategory.RECIPES,
    requirementType: "UNIQUE_RECIPES",
    requirementValue: 25,
    xpReward: 100,
    isSecret: false,
  },

  // Streaki gotowania
  {
    name: "Tydzień w kuchni",
    description: "Gotuj 7 dni z rzędu",
    icon: "🔥",
    category: AchievementCategory.STREAK,
    requirementType: "COOKING_STREAK",
    requirementValue: 7,
    xpReward: 75,
    isSecret: false,
  },
  {
    name: "Miesiąc gotowania",
    description: "Gotuj 30 dni z rzędu",
    icon: "🔥🔥",
    category: AchievementCategory.STREAK,
    requirementType: "COOKING_STREAK",
    requirementValue: 30,
    xpReward: 300,
    isSecret: false,
  },

  // Kategorie
  {
    name: "Król śniadań",
    description: "Przygotuj 10 śniadań",
    icon: "🥞",
    category: AchievementCategory.RECIPES,
    requirementType: "CATEGORY_BREAKFAST",
    requirementValue: 10,
    xpReward: 50,
    isSecret: false,
  },
  {
    name: "Mistrz obiadów",
    description: "Przygotuj 20 obiadów",
    icon: "🍝",
    category: AchievementCategory.RECIPES,
    requirementType: "CATEGORY_LUNCH",
    requirementValue: 20,
    xpReward: 75,
    isSecret: false,
  },
  {
    name: "Specjalista deserów",
    description: "Przygotuj 10 deserów",
    icon: "🍰",
    category: AchievementCategory.RECIPES,
    requirementType: "CATEGORY_DESSERT",
    requirementValue: 10,
    xpReward: 50,
    isSecret: false,
  },

  // Oceny
  {
    name: "Perfekcjonista",
    description: "Zdobądź 10 ocen 5 gwiazdek",
    icon: "⭐",
    category: AchievementCategory.RECIPES,
    requirementType: "FIVE_STAR_RATINGS",
    requirementValue: 10,
    xpReward: 100,
    isSecret: false,
  },

  // Czas gotowania
  {
    name: "Maraton w kuchni",
    description: "Spędź 24 godziny gotując (łącznie)",
    icon: "⏱️",
    category: AchievementCategory.RECIPES,
    requirementType: "COOKING_TIME_HOURS",
    requirementValue: 24,
    xpReward: 100,
    isSecret: false,
  },
  {
    name: "Żelazny szef",
    description: "Spędź 100 godzin gotując (łącznie)",
    icon: "⏱️💪",
    category: AchievementCategory.RECIPES,
    requirementType: "COOKING_TIME_HOURS",
    requirementValue: 100,
    xpReward: 500,
    isSecret: false,
  },

  // Specjalne
  {
    name: "Nocny kucharz",
    description: "Ugotuj przepis po północy",
    icon: "🌙",
    category: AchievementCategory.RECIPES,
    requirementType: "COOK_AT_MIDNIGHT",
    requirementValue: 1,
    xpReward: 25,
    isSecret: true,
  },
  {
    name: "Wczesny ptaszek",
    description: "Ugotuj śniadanie przed 6 rano",
    icon: "🌅",
    category: AchievementCategory.RECIPES,
    requirementType: "COOK_BEFORE_6AM",
    requirementValue: 1,
    xpReward: 25,
    isSecret: true,
  },
  {
    name: "Szybki jak błyskawica",
    description: "Ugotuj przepis w trybie gotowania poniżej 15 minut",
    icon: "⚡",
    category: AchievementCategory.RECIPES,
    requirementType: "QUICK_COOK",
    requirementValue: 1,
    xpReward: 50,
    isSecret: false,
  },
];

async function seedCookingAchievements() {
  console.log("🌱 Dodawanie osiągnięć kulinarnych...");

  for (const achievement of cookingAchievements) {
    // Find existing achievement by name and category
    const existing = await prisma.achievement.findFirst({
      where: {
        name: achievement.name,
        category: achievement.category,
      },
    });

    if (existing) {
      // Update existing
      await prisma.achievement.update({
        where: { id: existing.id },
        data: achievement,
      });
    } else {
      // Create new
      await prisma.achievement.create({
        data: achievement,
      });
    }
  }

  console.log(`✅ Dodano ${cookingAchievements.length} osiągnięć kulinarnych!`);
}

seedCookingAchievements()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

