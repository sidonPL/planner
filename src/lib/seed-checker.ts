import { prisma } from "./prisma";
import { initializeAchievements } from "./achievements";
import { seedEnhancedAchievements, seedRewards } from "./seed-enhanced-gamification";
import { autoSeedIngredients } from "./seed-ingredients";

/**
 * Sprawdza czy baza danych ma podstawowe dane (seedy)
 * i automatycznie je dodaje jeśli brakuje
 */
export async function checkAndSeedDatabase() {
  try {
    console.log("🌱 Checking database seeds...");

    // Sprawdź czy są szablony rutyn (globalne, bez householdId)
    const templatesCount = await prisma.routineTemplate.count({
      where: { householdId: null }, // Tylko globalne szablony
    });

    if (templatesCount === 0) {
      console.log("📋 No global routine templates found, seeding...");
      await seedRoutineTemplates();
    } else {
      console.log(`✓ Global routine templates: ${templatesCount} found`);
    }

    // Sprawdź czy są osiągnięcia
    const achievementsCount = await prisma.achievement.count();

    if (achievementsCount === 0) {
      console.log("🏆 No achievements found, seeding...");
      await initializeAchievements();
      console.log(`  ✓ Added achievements to database`);
    } else {
      console.log(`✓ Achievements: ${achievementsCount} found`);
    }

    // Sprawdź czy są rozszerzone osiągnięcia (z hintami i rarity)
    const enhancedAchievementsCount = await prisma.achievement.count({
      where: { hint: { not: null } },
    });

    if (enhancedAchievementsCount === 0) {
      console.log("🎯 No enhanced achievements found, seeding...");
      await seedEnhancedAchievements();
      console.log(`  ✓ Added enhanced achievements to database`);
    } else {
      console.log(`✓ Enhanced Achievements: ${enhancedAchievementsCount} found`);
    }

    // Sprawdź czy są nagrody i składniki dla gospodarstw domowych
    // Seedujemy dane dla każdego gospodarstwa domowego
    const households = await prisma.household.findMany({
      select: { id: true, name: true },
    });

    for (const household of households) {
      // Nagrody
      const rewardsCount = await prisma.reward.count({
        where: { householdId: household.id },
      });

      if (rewardsCount === 0) {
        console.log(`🎁 No rewards found for household "${household.name}", seeding...`);
        await seedRewards(household.id);
        console.log(`  ✓ Added rewards for household "${household.name}"`);
      } else {
        console.log(`✓ Rewards for "${household.name}": ${rewardsCount} found`);
      }

      // Składniki
      const ingredientsCount = await prisma.globalIngredient.count({
        where: { householdId: household.id },
      });

      if (ingredientsCount === 0) {
        console.log(`🥕 No ingredients found for household "${household.name}", seeding...`);
        await autoSeedIngredients(household.id);
        console.log(`  ✓ Added ingredients for household "${household.name}"`);
      } else {
        console.log(`✓ Ingredients for "${household.name}": ${ingredientsCount} found`);
      }
    }

    console.log("✅ Database seeds check complete!\n");
  } catch (error) {
    console.error("❌ Error checking seeds:", error);
    // Nie przerywaj startu serwera - tylko loguj błąd
  }
}

async function seedRoutineTemplates() {
  const templates = [
    {
      name: "Poranna rutyna",
      description: "Codzienne czynności poranne",
      icon: "☀️",
      category: "morning",
      tasks: [
        { title: "Wstać z łóżka", time: "07:00", priority: "HIGH" },
        { title: "Umyć zęby", time: "07:05", priority: "HIGH" },
        { title: "Prysznic", time: "07:10", priority: "MEDIUM" },
        { title: "Śniadanie", time: "07:30", priority: "HIGH" },
      ],
      isPublic: true,
    },
    {
      name: "Wieczorna rutyna",
      description: "Czynności przed snem",
      icon: "🌙",
      category: "evening",
      tasks: [
        { title: "Przygotować ubranie na jutro", time: "21:00", priority: "LOW" },
        { title: "Umyć zęby", time: "21:30", priority: "HIGH" },
        { title: "Medytacja", time: "21:45", priority: "MEDIUM" },
        { title: "Iść spać", time: "22:00", priority: "HIGH" },
      ],
      isPublic: true,
    },
    {
      name: "Sprzątanie tygodniowe",
      description: "Cotygodniowe sprzątanie domu",
      icon: "🧹",
      category: "weekly",
      tasks: [
        { title: "Odkurzyć pokoje", time: "10:00", priority: "HIGH" },
        { title: "Umyć podłogi", time: "10:30", priority: "HIGH" },
        { title: "Wyczyścić łazienkę", time: "11:00", priority: "HIGH" },
        { title: "Wymienić pościel", time: "11:30", priority: "MEDIUM" },
      ],
      isPublic: true,
    },
    {
      name: "Trening",
      description: "Regularna aktywność fizyczna",
      icon: "💪",
      category: "morning",
      tasks: [
        { title: "Rozgrzewka", time: "06:00", priority: "HIGH" },
        { title: "Trening siłowy", time: "06:10", priority: "HIGH" },
        { title: "Cardio", time: "06:40", priority: "MEDIUM" },
        { title: "Rozciąganie", time: "06:55", priority: "MEDIUM" },
      ],
      isPublic: true,
    },
    {
      name: "Medytacja",
      description: "Codzienna praktyka mindfulness",
      icon: "🧘",
      category: "morning",
      tasks: [
        { title: "Przygotować miejsce", time: "06:00", priority: "LOW" },
        { title: "Medytacja", time: "06:05", priority: "HIGH" },
        { title: "Notatki", time: "06:20", priority: "LOW" },
      ],
      isPublic: true,
    },
  ];

  for (const template of templates) {
    await prisma.routineTemplate.create({
      data: template,
    });
  }

  console.log(`  ✓ Added ${templates.length} global routine templates`);
}

