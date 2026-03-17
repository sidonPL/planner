import { prisma } from './prisma';
import { addXP } from './xp';
import { DailyQuestType } from '@prisma/client';

// Quest templates - generowane codziennie
const QUEST_TEMPLATES: Array<{
  title: string;
  description: string;
  type: DailyQuestType;
  target: number;
  reward: number;
}> = [
  // Existing quests
  {
    title: 'Wykonaj 3 zadania',
    description: 'Ukończ dowolne 3 zadania z listy',
    type: DailyQuestType.TASKS,
    target: 3,
    reward: 30,
  },
  {
    title: 'Dodaj przepis',
    description: 'Dodaj nowy przepis do bazy',
    type: DailyQuestType.RECIPES,
    target: 1,
    reward: 20,
  },
  {
    title: 'Zaplanuj posiłki',
    description: 'Zaplanuj 2 posiłki na dziś',
    type: DailyQuestType.MEALS,
    target: 2,
    reward: 25,
  },
  {
    title: 'Zrób zakupy',
    description: 'Zaznacz zakupy jako zrobione',
    type: DailyQuestType.SHOPPING,
    target: 1,
    reward: 15,
  },
  {
    title: 'Sprawdź inwentarz',
    description: 'Dodaj lub zaktualizuj produkt w inwentarzu',
    type: DailyQuestType.INVENTORY,
    target: 1,
    reward: 10,
  },
  // NEW QUESTS 🆕
  {
    title: 'Oceń przepis',
    description: 'Wystaw ocenę po ugotowaniu przepisu',
    type: DailyQuestType.RATING,
    target: 1,
    reward: 15,
  },
  {
    title: 'Pomóż rodzinie',
    description: 'Wykonaj zadanie przypisane do innej osoby',
    type: DailyQuestType.HELP,
    target: 1,
    reward: 25,
  },
  {
    title: 'Zero waste',
    description: 'Wykorzystaj składniki wygasające wkrótce',
    type: DailyQuestType.EXPIRING,
    target: 1,
    reward: 30,
  },
  {
    title: 'Perfect day',
    description: 'Ukończ wszystkie zadania zaplanowane na dziś',
    type: DailyQuestType.PERFECT_DAY,
    target: 1,
    reward: 50,
  },
  {
    title: 'Early bird',
    description: 'Ukończ pierwsze zadanie przed 9:00',
    type: DailyQuestType.EARLY,
    target: 1,
    reward: 20,
  },
  {
    title: 'Dodaj zdjęcie',
    description: 'Dodaj zdjęcie do przepisu lub posiłku',
    type: DailyQuestType.PHOTO,
    target: 1,
    reward: 15,
  },
  {
    title: 'Zaplanuj jutro',
    description: 'Zaplanuj posiłki na jutrzejszy dzień',
    type: DailyQuestType.PLAN_TOMORROW,
    target: 2,
    reward: 20,
  },
  {
    title: 'Gotowanie wieczorne',
    description: 'Ugotuj coś po 18:00',
    type: DailyQuestType.EVENING_COOK,
    target: 1,
    reward: 15,
  },
  {
    title: 'Zdrowy dzień',
    description: 'Zaplanuj tylko zdrowe posiłki dziś',
    type: DailyQuestType.HEALTHY_DAY,
    target: 3,
    reward: 35,
  },
  {
    title: 'Nowy przepis',
    description: 'Ugotuj przepis, którego nigdy nie robiłeś',
    type: DailyQuestType.NEW_RECIPE,
    target: 1,
    reward: 30,
  },
  {
    title: 'Szybki lunch',
    description: 'Przygotuj posiłek w mniej niż 20 minut',
    type: DailyQuestType.QUICK_MEAL,
    target: 1,
    reward: 25,
  },
  {
    title: 'Komentarz',
    description: 'Dodaj komentarz do przepisu rodziny',
    type: DailyQuestType.COMMENT,
    target: 1,
    reward: 10,
  },
];

// Generate daily quests for household
export async function generateDailyQuests(householdId: string) {
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
    return { message: 'Quests already exist for today' };
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

// Get today's quests for user
export async function getTodayQuests(userId: string, householdId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const quests = await prisma.dailyQuest.findMany({
    where: {
      householdId,
      date: today,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          userId,
        },
      },
    },
  });

  return quests.map((quest) => ({
    ...quest,
    userProgress: quest.completions[0]?.progress || 0,
    userCompleted: quest.completions[0]?.completed || false,
  }));
}

// Update quest progress
export async function updateQuestProgress(
  userId: string,
  questType: DailyQuestType | string,
  increment: number = 1
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find user's quest completion for this type today
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { householdId: true },
  });

  if (!user?.householdId) return null;

  const quest = await prisma.dailyQuest.findFirst({
    where: {
      householdId: user.householdId,
      date: today,
      type: questType as DailyQuestType,
      isActive: true,
    },
  });

  if (!quest) return null;

  const completion = await prisma.dailyQuestCompletion.findUnique({
    where: {
      questId_userId: {
        questId: quest.id,
        userId,
      },
    },
  });

  if (!completion || completion.completed) return null;

  const newProgress = Math.min(completion.progress + increment, quest.target);
  const isNowCompleted = newProgress >= quest.target;

  const updated = await prisma.dailyQuestCompletion.update({
    where: {
      questId_userId: {
        questId: quest.id,
        userId,
      },
    },
    data: {
      progress: newProgress,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date() : null,
    },
  });

  // If completed, award XP
  if (isNowCompleted && !completion.completed) {
    await addXP(
      userId,
      quest.reward,
      `Ukończono daily quest: ${quest.title}`,
      'BONUS'
    );
  }

  return {
    ...updated,
    quest,
    justCompleted: isNowCompleted && !completion.completed,
  };
}

