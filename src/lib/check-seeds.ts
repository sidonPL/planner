import { AchievementCategory } from '@prisma/client';
import { prisma } from './prisma';
import { checkAndSeedDatabase } from './seed-checker';

/**
 * Automatyczne sprawdzanie i seedowanie danych przy starcie serwera
 */
export async function checkAndSeedOnStartup() {
  console.log('🌱 Sprawdzanie danych w bazie...');

  try {
    // ✨ Nowy system auto-seedowania (enhanced achievements, rewards, ingredients, routine templates)
    await checkAndSeedDatabase();

    // 1. Sprawdź Quest Templates
    const questTemplatesCount = await prisma.questTemplate.count();
    console.log(`📋 Quest Templates: ${questTemplatesCount}`);

    if (questTemplatesCount === 0) {
      console.log('⚠️  Brak quest templates - uruchamiam seed...');
      await seedQuestTemplates();
      console.log('✅ Quest templates zaseedowane!');
    }

    // 2. Sprawdź Tiered Achievements
    const tieredAchievementsCount = await prisma.achievement.count({
      where: { tier: { not: null } },
    });
    console.log(`🏆 Tiered Achievements: ${tieredAchievementsCount}`);

    if (tieredAchievementsCount === 0) {
      console.log('⚠️  Brak tiered achievements - uruchamiam seed...');
      await seedTieredAchievements();
      console.log('✅ Tiered achievements zaseedowane!');
    }

    // 3. Sprawdź czy są jakiekolwiek Achievements
    const achievementsCount = await prisma.achievement.count();
    console.log(`🎯 Wszystkie Achievements: ${achievementsCount}`);

    if (achievementsCount === 0) {
      console.log('⚠️  Brak achievements - może wymagany manual seed');
      console.log('💡 Uruchom: npx tsx prisma/seed-achievements.ts');
    }

    // 4. Sprawdź Global Ingredients
    const ingredientsCount = await prisma.globalIngredient.count();
    console.log(`🥬 Global Ingredients: ${ingredientsCount}`);

    if (ingredientsCount === 0) {
      console.log('⚠️  Brak global ingredients - uruchamiam seed...');
      await seedGlobalIngredients();
      console.log('✅ Global ingredients zaseedowane!');
    }

    // 5. Sprawdź Routine Templates
    const routineTemplatesCount = await prisma.routineTemplate.count({
      where: { isPublic: true },
    });
    console.log(`📅 Public Routine Templates: ${routineTemplatesCount}`);

    if (routineTemplatesCount === 0) {
      console.log('⚠️  Brak public routine templates - uruchamiam seed...');
      await seedRoutineTemplates();
      console.log('✅ Routine templates zaseedowane!');
    }

    console.log('✅ Sprawdzanie zakończone!');
    console.log('');
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania seedów:', error);
  }
}

/**
 * Seed Quest Templates
 */
async function seedQuestTemplates() {
  const questTemplates = [
    // TASKS Category - Daily Productivity
    {
      title: "Ukończ 3 zadania",
      description: "Wykonaj 3 dowolne zadania dzisiaj",
      type: "TASKS",
      requirementValue: 3,
      xpReward: 15,
      category: "DAILY",
      difficulty: "EASY",
      weight: 10,
    },
    {
      title: "Ukończ 5 zadań",
      description: "Wykonaj 5 zadań w ciągu dnia",
      type: "TASKS",
      requirementValue: 5,
      xpReward: 25,
      category: "DAILY",
      difficulty: "MEDIUM",
      weight: 8,
    },
    {
      title: "Ukończ 10 zadań",
      description: "Wykonaj aż 10 zadań dzisiaj!",
      type: "TASKS",
      requirementValue: 10,
      xpReward: 50,
      category: "DAILY",
      difficulty: "HARD",
      weight: 3,
    },
    {
      title: "Produktywny poranek",
      description: "Ukończ 3 zadania przed 10:00",
      type: "TASKS_MORNING",
      requirementValue: 3,
      xpReward: 30,
      category: "DAILY",
      difficulty: "MEDIUM",
      weight: 5,
    },

    // COOKING Category
    {
      title: "Zaplanuj 2 posiłki",
      description: "Dodaj 2 posiłki do planu na ten tydzień",
      type: "MEALS",
      requirementValue: 2,
      xpReward: 15,
      category: "COOKING",
      difficulty: "EASY",
      weight: 8,
    },
    {
      title: "Zaplanuj 5 posiłków",
      description: "Zaplanuj 5 posiłków na nadchodzący tydzień",
      type: "MEALS",
      requirementValue: 5,
      xpReward: 30,
      category: "COOKING",
      difficulty: "MEDIUM",
      weight: 5,
    },
    {
      title: "Stwórz nowy przepis",
      description: "Dodaj własny przepis do kolekcji",
      type: "RECIPES",
      requirementValue: 1,
      xpReward: 25,
      category: "COOKING",
      difficulty: "MEDIUM",
      weight: 6,
    },
    {
      title: "Oceń 3 przepisy",
      description: "Dodaj oceny do 3 przepisów",
      type: "RATING",
      requirementValue: 3,
      xpReward: 20,
      category: "COOKING",
      difficulty: "EASY",
      weight: 7,
    },

    // SHOPPING Category
    {
      title: "Zrób zakupy",
      description: "Ukończ listę zakupów",
      type: "SHOPPING",
      requirementValue: 1,
      xpReward: 20,
      category: "SHOPPING",
      difficulty: "EASY",
      weight: 7,
    },
    {
      title: "Sprawdź inwentarz",
      description: "Aktualizuj stan magazynu składników",
      type: "INVENTORY",
      requirementValue: 5,
      xpReward: 15,
      category: "SHOPPING",
      difficulty: "EASY",
      weight: 6,
    },

    // PLANNING
    {
      title: "Zaplanuj jutro",
      description: "Stwórz plan na jutrzejszy dzień",
      type: "PLAN_TOMORROW",
      requirementValue: 3,
      xpReward: 20,
      category: "PLANNING",
      difficulty: "EASY",
      weight: 7,
    },

    // HEALTH
    {
      title: "Zdrowy dzień",
      description: "Zaplanuj 3 zdrowe posiłki",
      type: "HEALTHY_DAY",
      requirementValue: 3,
      xpReward: 30,
      category: "HEALTH",
      difficulty: "MEDIUM",
      weight: 5,
    },
  ];

  for (const template of questTemplates) {
    await prisma.questTemplate.create({ data: template });
  }
}

/**
 * Seed Tiered Achievements
 */
async function seedTieredAchievements() {
  const tieredAchievements = [
    // PIZZA MASTER SERIES
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

    // TASK MASTER SERIES
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

    // STREAK MASTER SERIES
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
  ];

  const createdAchievements = [];
  for (const achievement of tieredAchievements) {
    const created = await prisma.achievement.create({ data: achievement });
    createdAchievements.push(created);
  }

  // Link tiers
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
}

/**
 * Seed Global Ingredients (popularnych składników)
 */
async function seedGlobalIngredients() {
  const popularIngredients = [
    // Mąki i skrobie
    { name: "mąka pszenna", category: "mąki", commonUnit: "g" },
    { name: "mąka kukurydziana", category: "mąki", commonUnit: "g" },
    { name: "mąka ziemniaczana", category: "mąki", commonUnit: "g" },

    // Nabiał
    { name: "mleko", category: "nabiał", commonUnit: "ml" },
    { name: "śmietana", category: "nabiał", commonUnit: "ml" },
    { name: "masło", category: "nabiał", commonUnit: "g" },
    { name: "ser żółty", category: "nabiał", commonUnit: "g" },
    { name: "jogurt naturalny", category: "nabiał", commonUnit: "g" },

    // Mięso i ryby
    { name: "pierś z kurczaka", category: "mięso", commonUnit: "g" },
    { name: "mięso mielone", category: "mięso", commonUnit: "g" },
    { name: "łosoś", category: "ryby", commonUnit: "g" },

    // Warzywa
    { name: "cebula", category: "warzywa", commonUnit: "szt" },
    { name: "czosnek", category: "warzywa", commonUnit: "ząbek" },
    { name: "pomidor", category: "warzywa", commonUnit: "szt" },
    { name: "papryka", category: "warzywa", commonUnit: "szt" },
    { name: "marchew", category: "warzywa", commonUnit: "szt" },
    { name: "ziemniak", category: "warzywa", commonUnit: "szt" },

    // Przyprawy
    { name: "sól", category: "przyprawy", commonUnit: "szczypta" },
    { name: "pieprz", category: "przyprawy", commonUnit: "szczypta" },
    { name: "cukier", category: "dodatki", commonUnit: "g" },
    { name: "oliwa z oliwek", category: "oleje", commonUnit: "ml" },
    { name: "olej", category: "oleje", commonUnit: "ml" },

    // Makarony i ryż
    { name: "makaron", category: "makarony", commonUnit: "g" },
    { name: "ryż", category: "ryże", commonUnit: "g" },
    { name: "kasza", category: "kasze", commonUnit: "g" },

    // Jaja
    { name: "jajko", category: "jaja", commonUnit: "szt" },

    // Przyprawy i zioła
    { name: "papryka słodka", category: "przyprawy", commonUnit: "łyżeczka" },
    { name: "kurkuma", category: "przyprawy", commonUnit: "łyżeczka" },
    { name: "bazylia", category: "zioła", commonUnit: "łyżeczka" },
    { name: "oregano", category: "zioła", commonUnit: "łyżeczka" },
  ];

  // Pobierz wszystkie gospodarstwa
  const households = await prisma.household.findMany({
    select: { id: true },
  });

  for (const household of households) {
    for (const ingredient of popularIngredients) {
      // Sprawdź czy już istnieje
      const existing = await prisma.globalIngredient.findUnique({
        where: {
          householdId_name: {
            householdId: household.id,
            name: ingredient.name,
          },
        },
      });

      if (!existing) {
        await prisma.globalIngredient.create({
          data: {
            ...ingredient,
            householdId: household.id,
            usageCount: 0,
          },
        });
      }
    }
  }
}

/**
 * Seed Routine Templates (publicznych szablonów)
 */
async function seedRoutineTemplates() {
  const templates = [
    {
      name: 'Poranna rutyna',
      description: 'Standardowa rutyna poranna',
      icon: '🌅',
      category: 'morning',
      isPublic: true,
      tasks: [
        { title: 'Wziąć prysznic', time: '07:00', priority: 'MEDIUM' },
        { title: 'Zrobić kawę', time: '07:15', priority: 'MEDIUM' },
        { title: 'Zjeść śniadanie', time: '07:30', priority: 'HIGH' },
        { title: 'Umyć zęby', time: '07:45', priority: 'HIGH' },
      ],
    },
    {
      name: 'Wieczorna rutyna',
      description: 'Rutyna wieczorna',
      icon: '🌙',
      category: 'evening',
      isPublic: true,
      tasks: [
        { title: 'Kolacja', time: '19:00', priority: 'MEDIUM' },
        { title: 'Posprzątać kuchnię', time: '19:30', priority: 'LOW' },
        { title: 'Higiena wieczorna', time: '21:00', priority: 'HIGH' },
        { title: 'Przygotować plan na jutro', time: '21:30', priority: 'MEDIUM' },
      ],
    },
    {
      name: 'Sprzątanie cotygodniowe',
      description: 'Pełne sprzątanie mieszkania',
      icon: '🧹',
      category: 'weekly',
      isPublic: true,
      tasks: [
        { title: 'Odkurzyć wszystkie pokoje', time: '10:00', priority: 'HIGH' },
        { title: 'Umyć podłogi', time: '10:30', priority: 'HIGH' },
        { title: 'Wyczyścić łazienkę', time: '11:00', priority: 'HIGH' },
      ],
    },
    {
      name: 'Przegląd finansów',
      description: 'Comiesięczny przegląd budżetu',
      icon: '💰',
      category: 'monthly',
      isPublic: true,
      tasks: [
        { title: 'Sprawdzić saldo konta', time: '09:00', priority: 'HIGH' },
        { title: 'Przejrzeć wydatki', time: '09:20', priority: 'HIGH' },
        { title: 'Zaplanować budżet na kolejny miesiąc', time: '09:40', priority: 'HIGH' },
      ],
    },
    {
      name: 'Rutyna zdrowotna',
      description: 'Dbanie o zdrowie',
      icon: '💊',
      category: 'morning',
      isPublic: true,
      tasks: [
        { title: 'Wypić szklankę wody', time: '08:00', priority: 'MEDIUM' },
        { title: 'Zażyć witaminy', time: '08:05', priority: 'HIGH' },
        { title: 'Krótka rozgrzewka', time: '08:15', priority: 'MEDIUM' },
      ],
    },
  ];

  // Pobierz pierwsze gospodarstwo dla publicznych szablonów
  const firstHousehold = await prisma.household.findFirst();

  if (!firstHousehold) {
    console.log('⚠️  Brak gospodarstw - pomijam routine templates');
    return;
  }

  // Pobierz pierwszego użytkownika z tego gospodarstwa
  const firstUser = await prisma.user.findFirst({
    where: { householdId: firstHousehold.id },
  });

  if (!firstUser) {
    console.log('⚠️  Brak użytkowników - pomijam routine templates');
    return;
  }

  for (const template of templates) {
    // Sprawdź czy już istnieje
    const existing = await prisma.routineTemplate.findFirst({
      where: {
        name: template.name,
        isPublic: true,
      },
    });

    if (!existing) {
      await prisma.routineTemplate.create({
        data: {
          ...template,
          householdId: firstHousehold.id,
          createdBy: firstUser.id,
        },
      });
      continue;
    }

    const existingTasks = Array.isArray(existing.tasks) ? existing.tasks : [];
    if (existingTasks.length === 0) {
      await prisma.routineTemplate.update({
        where: { id: existing.id },
        data: {
          tasks: template.tasks,
        },
      });
    }
  }
}
