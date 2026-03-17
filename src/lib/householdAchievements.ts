import { prisma } from "./prisma";
import { startOfDay, endOfDay } from "date-fns";

// Definicje osiągnięć zespołowych
export const HOUSEHOLD_ACHIEVEMENTS = {
  ALL_TASKS_TODAY: {
    id: "all-tasks-today",
    name: "Wszyscy na pokładzie!",
    description: "Wszyscy członkowie ukończyli swoje zadania dziś",
    icon: "users",
    points: 100,
    type: "daily",
  },
  PERFECT_WEEK: {
    id: "perfect-week",
    name: "Perfekcyjny tydzień",
    description: "Wszyscy członkowie ukończyli wszystkie zadania przez 7 dni",
    icon: "trophy",
    points: 500,
    type: "weekly",
  },
  SHOPPING_CLEARED: {
    id: "shopping-cleared",
    name: "Pusta lista",
    description: "Zakupiono wszystkie produkty z listy w jeden dzień",
    icon: "shopping-cart",
    points: 50,
    type: "daily",
  },
  BUDGET_GOAL: {
    id: "budget-goal",
    name: "Oszczędni",
    description: "Gospodarstwo nie przekroczyło budżetu w tym miesiącu",
    icon: "piggy-bank",
    points: 200,
    type: "monthly",
  },
  MEAL_PLANNERS: {
    id: "meal-planners",
    name: "Zorganizowani kucharze",
    description: "Zaplanowano wszystkie posiłki na tydzień",
    icon: "utensils",
    points: 75,
    type: "weekly",
  },
};

// Sprawdź i przyznaj osiągnięcia zespołowe
export async function checkHouseholdAchievements(householdId: string) {
  const achievements: string[] = [];

  // 1. Wszyscy ukończyli zadania dziś
  const allTasksToday = await checkAllTasksCompletedToday(householdId);
  if (allTasksToday) {
    achievements.push(HOUSEHOLD_ACHIEVEMENTS.ALL_TASKS_TODAY.id);
    await awardHouseholdAchievement(
      householdId,
      HOUSEHOLD_ACHIEVEMENTS.ALL_TASKS_TODAY
    );
  }

  // 2. Lista zakupów pusta
  const shoppingCleared = await checkShoppingListCleared(householdId);
  if (shoppingCleared) {
    achievements.push(HOUSEHOLD_ACHIEVEMENTS.SHOPPING_CLEARED.id);
    await awardHouseholdAchievement(
      householdId,
      HOUSEHOLD_ACHIEVEMENTS.SHOPPING_CLEARED
    );
  }

  // 3. Wszystkie posiłki zaplanowane na tydzień
  const mealsPlanners = await checkAllMealsPlanned(householdId);
  if (mealsPlanners) {
    achievements.push(HOUSEHOLD_ACHIEVEMENTS.MEAL_PLANNERS.id);
    await awardHouseholdAchievement(
      householdId,
      HOUSEHOLD_ACHIEVEMENTS.MEAL_PLANNERS
    );
  }

  return achievements;
}

// Sprawdź czy wszyscy członkowie ukończyli swoje zadania dziś
async function checkAllTasksCompletedToday(householdId: string): Promise<boolean> {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Pobierz wszystkich aktywnych członków (bez dzieci)
  const members = await prisma.user.findMany({
    where: { householdId, role: { not: "CHILD" } },
  });

  if (members.length === 0) return false;

  // Sprawdź zadania dla każdego członka (bez rutyn)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const member of members) {
    const memberTasks = await prisma.task.findMany({
      where: {
        householdId,
        assigneeId: member.id,
        dueDate: { gte: today, lte: todayEnd },
        isRecurring: false, // Wyklucz rutyny
      },
    });

    // Jeśli członek ma zadania
    if (memberTasks.length > 0) {
      const completedTasks = memberTasks.filter((t) => t.status === "COMPLETED");

      // Jeśli nie wszystkie ukończone - fail
      if (completedTasks.length < memberTasks.length) {
        return false;
      }
    }
  }

  return true;
}

// Sprawdź czy lista zakupów jest pusta (wszystko kupione dziś)
async function checkShoppingListCleared(householdId: string): Promise<boolean> {
  const today = startOfDay(new Date());

  // Sprawdź czy wszystkie produkty dodane dziś zostały kupione
  const todayItems = await prisma.shoppingItem.findMany({
    where: {
      householdId,
      createdAt: { gte: today },
    },
  });

  if (todayItems.length === 0) return false;

  const purchasedItems = todayItems.filter((item) => item.isPurchased);

  return purchasedItems.length === todayItems.length;
}

// Sprawdź czy wszystkie posiłki na tydzień są zaplanowane
async function checkAllMealsPlanned(householdId: string): Promise<boolean> {
  const today = startOfDay(new Date());
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const meals = await prisma.meal.findMany({
    where: {
      householdId,
      date: { gte: today, lt: weekFromNow },
    },
  });

  // Minimum 21 posiłków (3 dziennie x 7 dni)
  return meals.length >= 21;
}

// Przyznaj osiągnięcie zespołowe
async function awardHouseholdAchievement(
  householdId: string,
  achievement: typeof HOUSEHOLD_ACHIEVEMENTS[keyof typeof HOUSEHOLD_ACHIEVEMENTS]
) {
  const today = startOfDay(new Date());

  // Sprawdź czy osiągnięcie już zostało przyznane dziś
  const existing = await prisma.householdAchievement.findFirst({
    where: {
      householdId,
      achievementId: achievement.id,
      earnedAt: { gte: today },
    },
  });

  if (existing) return;

  // Utwórz osiągnięcie
  await prisma.householdAchievement.create({
    data: {
      householdId,
      achievementId: achievement.id,
      name: achievement.name,
      description: achievement.description,
      points: achievement.points,
      icon: achievement.icon,
    },
  });

  // Dodaj punkty wszystkim członkom
  const members = await prisma.user.findMany({
    where: { householdId },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const member of members) {
    // Dodaj punkty jako bonus
    // (Można zaimplementować system punktów bonusowych)
  }
}

// Pobierz osiągnięcia gospodarstwa
export async function getHouseholdAchievements(householdId: string) {
  return await prisma.householdAchievement.findMany({
    where: { householdId },
    orderBy: { earnedAt: "desc" },
    take: 20,
  });
}

// Statystyki osiągnięć
export async function getHouseholdAchievementStats(householdId: string) {
  const achievements = await prisma.householdAchievement.findMany({
    where: { householdId },
  });

  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const totalAchievements = achievements.length;

  // Grupuj po typie
  const byType = achievements.reduce((acc, a) => {
    const type = Object.values(HOUSEHOLD_ACHIEVEMENTS).find(
      (ha) => ha.id === a.achievementId
    )?.type || "other";

    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalPoints,
    totalAchievements,
    byType,
    recentAchievements: achievements.slice(0, 5),
  };
}


