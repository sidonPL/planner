import { prisma } from "@/lib/prisma";
import { AchievementCategory } from "@prisma/client";
import { addXP } from "./xp";

/**
 * Sprawdź i przyznaj osiągnięcia użytkownikowi
 */
export async function checkAchievements(userId: string) {
  try {
    // Pobierz statystyki użytkownika
    const stats = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        completedTasks: {
          select: { id: true },
        },
        currentStreak: true,
      },
    });

    if (!stats) return [];

    const tasksCompleted = stats.completedTasks.length;
    const currentStreak = stats.currentStreak || 0;

    const newAchievements = [];

    // Sprawdź osiągnięcia dla zadań
    const taskAchievements = await prisma.achievement.findMany({
      where: {
        category: AchievementCategory.TASKS,
        requirementType: 'TASKS_COMPLETED',
        requirementValue: { lte: tasksCompleted },
      },
    });

    for (const achievement of taskAchievements) {
      // Sprawdź czy użytkownik już ma to osiągnięcie
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (!existing) {
        // Przyznaj osiągnięcie
        const awarded = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
          include: {
            achievement: true,
          },
        });

        // Dodaj XP
        await addXP(
          userId,
          achievement.xpReward,
          `Osiągnięcie: ${achievement.name}`,
          'BONUS'
        );

        newAchievements.push(awarded);
      }
    }

    // Sprawdź osiągnięcia dla streak
    const streakAchievements = await prisma.achievement.findMany({
      where: {
        category: AchievementCategory.STREAK,
        requirementType: 'STREAK_DAYS',
        requirementValue: { lte: currentStreak },
      },
    });

    for (const achievement of streakAchievements) {
      const existing = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
      });

      if (!existing) {
        const awarded = await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
          include: {
            achievement: true,
          },
        });

        await addXP(
          userId,
          achievement.xpReward,
          `Osiągnięcie: ${achievement.name}`,
          'BONUS'
        );

        newAchievements.push(awarded);
      }
    }

    return newAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Oblicz postęp użytkownika dla danego osiągnięcia
 */
export async function calculateAchievementProgress(
  userId: string,
  requirementType: string
): Promise<number> {
  try {
    switch (requirementType) {
      case 'TASKS_COMPLETED': {
        return await prisma.taskCompletion.count({
          where: {
            userId,
          },
        });
      }
      case 'STREAK_DAYS': {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { currentStreak: true },
        });
        return user?.currentStreak || 0;
      }
      case 'RECIPES_COOKED': {
        // Pobierz wszystkie oceny i filtruj w JS
        const allRatings = await prisma.recipeRating.findMany({
          where: { userId },
          select: { cookedAt: true },
        });
        return allRatings.filter(r => r.cookedAt !== null).length;
      }
      case 'UNIQUE_RECIPES': {
        const allRatings = await prisma.recipeRating.findMany({
          where: { userId },
          select: { recipeId: true, cookedAt: true },
        });
        const uniqueRecipeIds = new Set(
          allRatings.filter(r => r.cookedAt !== null).map(r => r.recipeId)
        );
        return uniqueRecipeIds.size;
      }
      case 'FIVE_STAR_RATINGS': {
        return await prisma.recipeRating.count({
          where: { userId, rating: 5 },
        });
      }
      case 'COOKING_STREAK': {
        // Podobnie jak w checkAndAwardCookingAchievements
        const allRatings = await prisma.recipeRating.findMany({
          where: { userId },
          select: { cookedAt: true },
          orderBy: { cookedAt: 'desc' },
        });

        const cookingHistory = allRatings.filter(r => r.cookedAt !== null);

        if (cookingHistory.length === 0) return 0;

        const sortedDates = cookingHistory
          .map((h) => new Date(h.cookedAt!))
          .sort((a, b) => b.getTime() - a.getTime());

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDate = new Date(sortedDates[0]);
        currentDate.setHours(0, 0, 0, 0);

        if (
          currentDate.getTime() === today.getTime() ||
          currentDate.getTime() === today.getTime() - 86400000
        ) {
          streak = 1;
          for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(sortedDates[i - 1]);
            prevDate.setHours(0, 0, 0, 0);
            const currDate = new Date(sortedDates[i]);
            currDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

            if (daysDiff === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
        return streak;
      }
      case 'COOKING_TIME_HOURS': {
        const allRatings = await prisma.recipeRating.findMany({
          where: { userId },
          include: {
            recipe: {
              select: {
                prepTime: true,
                cookTime: true,
              },
            },
          },
        });

        const cookingHistory = allRatings.filter(r => r.cookedAt !== null);

        const totalMinutes = cookingHistory.reduce((sum, item) => {
          return sum + (item.recipe.prepTime || 0) + (item.recipe.cookTime || 0);
        }, 0);

        return Math.floor(totalMinutes / 60);
      }
      case 'CATEGORY_BREAKFAST':
      case 'CATEGORY_LUNCH':
      case 'CATEGORY_DINNER':
      case 'CATEGORY_DESSERT':
      case 'CATEGORY_SNACK': {
        const category = requirementType.replace('CATEGORY_', '');
        const allRatings = await prisma.recipeRating.findMany({
          where: {
            userId,
            recipe: {
              category,
            },
          },
          select: { cookedAt: true },
        });
        return allRatings.filter(r => r.cookedAt !== null).length;
      }
      default:
        return 0;
    }
  } catch (error) {
    console.error('Error calculating achievement progress:', error);
    return 0;
  }
}

/**
 * Pobierz osiągnięcia użytkownika z postępem
 */
export async function getUserAchievements(userId: string) {
  try {
    const [allAchievements, userAchievements] = await Promise.all([
      prisma.achievement.findMany({
        orderBy: [{ category: 'asc' }, { requirementValue: 'asc' }],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: {
          achievementId: true,
          unlockedAt: true,
        },
      }),
    ]);

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));
    const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua.unlockedAt]));

    // Oblicz postęp dla każdego osiągnięcia
    return await Promise.all(
      allAchievements.map(async (achievement) => {
        const isUnlocked = unlockedIds.has(achievement.id);
        const progress = isUnlocked
          ? achievement.requirementValue
          : await calculateAchievementProgress(userId, achievement.requirementType);
        const percentage = Math.min(
          Math.round((progress / achievement.requirementValue) * 100),
          100
        );

        return {
          ...achievement,
          isUnlocked,
          progress,
          percentage,
          unlockedAt: unlockedMap.get(achievement.id) || null,
        };
      })
    );
  } catch (error) {
    console.error('Error getting user achievements:', error);
    return [];
  }
}

/**
 * Inicjalizuj podstawowe osiągnięcia
 */
export async function initializeAchievements() {
  const achievements: Array<{
    name: string;
    description: string;
    icon: string;
    category: AchievementCategory;
    requirementType: string;
    requirementValue: number;
    xpReward: number;
    isSecret: boolean;
  }> = [
    // TASKS
    {
      name: '🎯 Pierwsze kroki',
      description: 'Ukończ pierwsze zadanie',
      icon: '🎯',
      category: AchievementCategory.TASKS,
      requirementType: 'TASKS_COMPLETED',
      requirementValue: 1,
      xpReward: 10,
      isSecret: false,
    },
    {
      name: '✅ Uczeń zadań',
      description: 'Ukończ 10 zadań',
      icon: '✅',
      category: AchievementCategory.TASKS,
      requirementType: 'TASKS_COMPLETED',
      requirementValue: 10,
      xpReward: 50,
      isSecret: false,
    },
    {
      name: '🏆 Mistrz produktywności',
      description: 'Ukończ 100 zadań',
      icon: '🏆',
      category: AchievementCategory.TASKS,
      requirementType: 'TASKS_COMPLETED',
      requirementValue: 100,
      xpReward: 200,
      isSecret: false,
    },

    // RECIPES
    {
      name: '📖 Pierwszy przepis',
      description: 'Dodaj pierwszy przepis do bazy',
      icon: '📖',
      category: AchievementCategory.RECIPES,
      requirementType: 'RECIPES_ADDED',
      requirementValue: 1,
      xpReward: 15,
      isSecret: false,
    },
    {
      name: '👨‍🍳 Kucharz domowy',
      description: 'Dodaj 10 przepisów',
      icon: '👨‍🍳',
      category: AchievementCategory.RECIPES,
      requirementType: 'RECIPES_ADDED',
      requirementValue: 10,
      xpReward: 75,
      isSecret: false,
    },

    // MEALS
    {
      name: '🍽️ Pierwszy posiłek',
      description: 'Zaplanuj pierwszy posiłek',
      icon: '🍽️',
      category: AchievementCategory.MEALS,
      requirementType: 'MEALS_PLANNED',
      requirementValue: 1,
      xpReward: 10,
      isSecret: false,
    },
    {
      name: '📅 Planer tygodnia',
      description: 'Zaplanuj 20 posiłków',
      icon: '📅',
      category: AchievementCategory.MEALS,
      requirementType: 'MEALS_PLANNED',
      requirementValue: 20,
      xpReward: 50,
      isSecret: false,
    },

    // SHOPPING
    {
      name: '🛒 Pierwsze zakupy',
      description: 'Ukończ pierwszą listę zakupów',
      icon: '🛒',
      category: AchievementCategory.SHOPPING,
      requirementType: 'SHOPPING_COMPLETED',
      requirementValue: 1,
      xpReward: 15,
      isSecret: false,
    },
    {
      name: '🛍️ Zakupoholik',
      description: 'Ukończ 10 list zakupów',
      icon: '🛍️',
      category: AchievementCategory.SHOPPING,
      requirementType: 'SHOPPING_COMPLETED',
      requirementValue: 10,
      xpReward: 60,
      isSecret: false,
    },

    // INVENTORY
    {
      name: '📦 Początek organizacji',
      description: 'Dodaj 10 produktów do inwentarza',
      icon: '📦',
      category: AchievementCategory.INVENTORY,
      requirementType: 'INVENTORY_ITEMS',
      requirementValue: 10,
      xpReward: 20,
      isSecret: false,
    },
    {
      name: '🗄️ Zarządca zapasów',
      description: 'Dodaj 50 produktów do inwentarza',
      icon: '🗄️',
      category: AchievementCategory.INVENTORY,
      requirementType: 'INVENTORY_ITEMS',
      requirementValue: 50,
      xpReward: 80,
      isSecret: false,
    },

    // STREAK
    {
      name: '🔥 Starter',
      description: 'Utrzymaj 3-dniową serię',
      icon: '🔥',
      category: AchievementCategory.STREAK,
      requirementType: 'STREAK_DAYS',
      requirementValue: 3,
      xpReward: 30,
      isSecret: false,
    },
    {
      name: '⚡ Konsekwentny',
      description: 'Utrzymaj 7-dniową serię',
      icon: '⚡',
      category: AchievementCategory.STREAK,
      requirementType: 'STREAK_DAYS',
      requirementValue: 7,
      xpReward: 70,
      isSecret: false,
    },
    {
      name: '💪 Nieustępliwy',
      description: 'Utrzymaj 30-dniową serię',
      icon: '💪',
      category: AchievementCategory.STREAK,
      requirementType: 'STREAK_DAYS',
      requirementValue: 30,
      xpReward: 300,
      isSecret: false,
    },

    // SOCIAL
    {
      name: '🤝 Pomocna dłoń',
      description: 'Ukończ 5 zadań przypisanych przez innych',
      icon: '🤝',
      category: AchievementCategory.SOCIAL,
      requirementType: 'TASKS_FROM_OTHERS',
      requirementValue: 5,
      xpReward: 25,
      isSecret: false,
    },
    {
      name: '👥 Gracz zespołowy',
      description: 'Ukończ 25 zadań przypisanych przez innych',
      icon: '👥',
      category: AchievementCategory.SOCIAL,
      requirementType: 'TASKS_FROM_OTHERS',
      requirementValue: 25,
      xpReward: 100,
      isSecret: false,
    },

    // MASTER
    {
      name: '🌟 Wszechstronny',
      description: 'Zdobądź 10 różnych osiągnięć',
      icon: '🌟',
      category: AchievementCategory.MASTER,
      requirementType: 'DIVERSE_ACHIEVEMENTS',
      requirementValue: 10,
      xpReward: 100,
      isSecret: false,
    },
    {
      name: '👑 Mistrz Plannera',
      description: 'Zdobądź 50 różnych osiągnięć',
      icon: '👑',
      category: AchievementCategory.MASTER,
      requirementType: 'DIVERSE_ACHIEVEMENTS',
      requirementValue: 50,
      xpReward: 500,
      isSecret: false,
    },
  ];

  for (const achievement of achievements) {
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

  return achievements.length;
}

/**
 * Pobierz postęp użytkownika w zdobywaniu odznak
 */
export async function getUserBadgeProgress(userId: string) {
  try {
    const progress = await prisma.badgeProgress.findMany({
      where: { userId },
      include: {
        badge: true,
      },
      orderBy: { percentage: 'desc' },
    });

    return progress;
  } catch (error) {
    console.error('Error getting badge progress:', error);
    return [];
  }
}

/**
 * Sprawdź i przyznaj osiągnięcia kulinarne użytkownikowi
 */
export async function checkAndAwardCookingAchievements(userId: string) {
  try {
    // Pobierz statystyki użytkownika
    const cookingHistory = await prisma.recipeRating.findMany({
      where: { userId },
      include: {
        recipe: {
          select: {
            category: true,
            prepTime: true,
            cookTime: true,
          },
        },
      },
    });

    const totalCooked = cookingHistory.length;
    const uniqueRecipes = new Set(cookingHistory.map((h) => h.recipeId)).size;
    const fiveStarRatings = cookingHistory.filter((h) => h.rating === 5).length;

    // Kategorie
    const categoryCount = cookingHistory.reduce((acc, item) => {
      const cat = item.recipe.category || "OTHER";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Łączny czas
    const totalMinutes = cookingHistory.reduce((sum, item) => {
      return sum + (item.recipe.prepTime || 0) + (item.recipe.cookTime || 0);
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);

    // Streak (simplified - można to rozbudować)
    const sortedDates = cookingHistory
      .map((h) => new Date(h.cookedAt))
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 0;
    if (sortedDates.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentDate = sortedDates[0];
      currentDate.setHours(0, 0, 0, 0);

      if (currentDate.getTime() === today.getTime() || currentDate.getTime() === today.getTime() - 86400000) {
        streak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
          const prevDate = sortedDates[i - 1];
          const currDate = sortedDates[i];
          const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

          if (daysDiff === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Lista osiągnięć do sprawdzenia
    const achievementChecks = [
      // Liczba gotowań
      { type: "RECIPES_COOKED", value: totalCooked },
      { type: "UNIQUE_RECIPES", value: uniqueRecipes },
      { type: "FIVE_STAR_RATINGS", value: fiveStarRatings },
      { type: "COOKING_TIME_HOURS", value: totalHours },
      { type: "COOKING_STREAK", value: streak },
      // Kategorie
      { type: "CATEGORY_BREAKFAST", value: categoryCount.BREAKFAST || 0 },
      { type: "CATEGORY_LUNCH", value: categoryCount.LUNCH || 0 },
      { type: "CATEGORY_DESSERT", value: categoryCount.DESSERT || 0 },
    ];

    const awardedAchievements: Array<{
      id: string;
      userId: string;
      achievementId: string;
      unlockedAt: Date;
      achievement: {
        id: string;
        name: string;
        description: string;
        icon: string;
        category: string;
        requirementType: string;
        requirementValue: number;
        xpReward: number;
        isSecret: boolean;
        createdAt: Date;
      };
    }> = [];

    // Sprawdź każde osiągnięcie
    for (const check of achievementChecks) {
      const achievements = await prisma.achievement.findMany({
        where: {
          requirementType: check.type,
          requirementValue: { lte: check.value },
        },
      });

      for (const achievement of achievements) {
        // Sprawdź czy użytkownik już ma to osiągnięcie
        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId,
              achievementId: achievement.id,
            },
          },
        });

        if (!existing) {
          // Przyznaj osiągnięcie
          const awarded = await prisma.userAchievement.create({
            data: {
              userId,
              achievementId: achievement.id,
            },
            include: {
              achievement: true,
            },
          });

          // Dodaj XP z boostami
          await addXP(
            userId,
            achievement.xpReward,
            `Osiągnięcie: ${achievement.name}`,
            'BONUS'
          );

          awardedAchievements.push(awarded);
        }
      }
    }

    // Sprawdź poziom (każde 100 XP = 1 poziom)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true, longestStreak: true },
    });

    if (user) {
      const newLevel = Math.floor(user.xp / 100) + 1;
      if (newLevel > user.level) {
        await prisma.user.update({
          where: { id: userId },
          data: { level: newLevel },
        });
      }
    }

    // Zaktualizuj streak w User
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak,
        longestStreak: {
          set: Math.max(user?.longestStreak || 0, streak),
        },
      },
    });

    return {
      awarded: awardedAchievements,
      stats: {
        totalCooked,
        uniqueRecipes,
        streak,
        totalHours,
      },
    };
  } catch (error) {
    console.error("Error checking achievements:", error);
    return { awarded: [], stats: {} };
  }
}
