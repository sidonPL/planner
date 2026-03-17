/**
 * Title System
 * System tytułów jako nagrody prestiżowe
 */

export const AVAILABLE_TITLES = {
  // Podstawowe
  none: {
    id: 'none',
    name: 'Brak tytułu',
    description: 'Nie wyświetlaj tytułu pod nazwą',
    icon: '⭕',
    free: true,
    color: 'text-muted-foreground',
    premium: false,
    requirement: undefined,
  },

  // Zadania
  task_novice: {
    id: 'task_novice',
    name: 'Początkujący Wykonawca',
    description: 'Ukończ 10 zadań',
    icon: '📝',
    free: false,
    color: 'text-blue-500',
    requirement: '10 ukończonych zadań',
    premium: false,
  },
  task_master: {
    id: 'task_master',
    name: 'Mistrz Zadań',
    description: 'Ukończ 100 zadań',
    icon: '✅',
    free: false,
    color: 'text-green-500',
    requirement: '100 ukończonych zadań',
    premium: false,
  },
  task_legend: {
    id: 'task_legend',
    name: 'Legenda Produktywności',
    description: 'Ukończ 1000 zadań',
    icon: '👑',
    free: false,
    color: 'text-yellow-500',
    requirement: '1000 ukończonych zadań',
    premium: false,
  },

  // Przepisy
  chef_rookie: {
    id: 'chef_rookie',
    name: 'Nowicjusz Kuchni',
    description: 'Stwórz 10 przepisów',
    icon: '🍳',
    free: false,
    color: 'text-orange-500',
    requirement: '10 przepisów',
    premium: false,
  },
  master_chef: {
    id: 'master_chef',
    name: 'Szef Kuchni',
    description: 'Stwórz 50 przepisów',
    icon: '👨‍🍳',
    free: false,
    color: 'text-red-500',
    requirement: '50 przepisów',
    premium: false,
  },
  culinary_genius: {
    id: 'culinary_genius',
    name: 'Geniusz Kulinarny',
    description: 'Stwórz 200 przepisów',
    icon: '⭐',
    free: false,
    color: 'text-purple-500',
    requirement: '200 przepisów',
    premium: false,
  },

  // Streak
  early_bird: {
    id: 'early_bird',
    name: 'Wczesny Ptaszek',
    description: 'Utrzymaj streak przez 7 dni',
    icon: '🐦',
    free: false,
    color: 'text-sky-500',
    requirement: '7-dniowy streak',
    premium: false,
  },
  consistency_king: {
    id: 'consistency_king',
    name: 'Król Konsekwencji',
    description: 'Utrzymaj streak przez 30 dni',
    icon: '👑',
    free: false,
    color: 'text-amber-500',
    requirement: '30-dniowy streak',
    premium: false,
  },
  eternal_warrior: {
    id: 'eternal_warrior',
    name: 'Wieczny Wojownik',
    description: 'Utrzymaj streak przez 365 dni',
    icon: '⚔️',
    free: false,
    color: 'text-red-600',
    requirement: '365-dniowy streak',
    premium: false,
  },

  // Leveling
  rookie: {
    id: 'rookie',
    name: 'Nowicjusz',
    description: 'Osiągnij poziom 5',
    icon: '🌱',
    free: false,
    color: 'text-green-400',
    requirement: 'Poziom 5',
    premium: false,
  },
  veteran: {
    id: 'veteran',
    name: 'Weteran',
    description: 'Osiągnij poziom 20',
    icon: '🎖️',
    free: false,
    color: 'text-indigo-500',
    requirement: 'Poziom 20',
    premium: false,
  },
  grandmaster: {
    id: 'grandmaster',
    name: 'Wielki Mistrz',
    description: 'Osiągnij poziom 50',
    icon: '💎',
    free: false,
    color: 'text-cyan-400',
    requirement: 'Poziom 50',
    premium: false,
  },

  // Specjalne
  vip: {
    id: 'vip',
    name: 'VIP',
    description: 'Członek VIP',
    icon: '💎',
    free: false,
    color: 'text-purple-600',
    requirement: 'Status VIP',
    premium: true,
  },
  golden_member: {
    id: 'golden_member',
    name: 'Złoty Członek',
    description: 'Członek ze Złotym statusem',
    icon: '👑',
    free: false,
    color: 'text-yellow-600',
    requirement: 'Złoty Status',
    premium: true,
  },
  founder: {
    id: 'founder',
    name: 'Założyciel',
    description: 'Jeden z pierwszych użytkowników',
    icon: '🏆',
    free: false,
    color: 'text-gold-500',
    requirement: 'Specjalne',
    premium: true,
  },
} as const;

export type TitleId = keyof typeof AVAILABLE_TITLES;

/**
 * Pobiera aktywny tytuł użytkownika
 */
export function getActiveTitle(titleId: TitleId | string | null): typeof AVAILABLE_TITLES[TitleId] | null {
  if (!titleId || !AVAILABLE_TITLES[titleId as TitleId]) {
    return null;
  }
  return AVAILABLE_TITLES[titleId as TitleId];
}

/**
 * Sprawdza czy użytkownik ma dostęp do tytułu
 */
export async function hasTitleAccess(userId: string, titleId: TitleId): Promise<boolean> {
  const title = AVAILABLE_TITLES[titleId];

  // Darmowe tytuły są zawsze dostępne
  if (title.free) {
    return true;
  }

  // Sprawdź czy użytkownik ma aktywną nagrodę z tym tytułem
  try {
    const response = await fetch('/api/gamification/active-rewards');
    if (response.ok) {
      const data = await response.json();

      // Sprawdź claimed rewards
      const titleReward = data.activeRewards?.find(
        (r: { reward: { effectData?: { titleId?: string } } }) =>
          r.reward.effectData?.titleId === titleId
      );

      return !!titleReward || data.userSettings?.activeTitle === titleId;
    }
  } catch (error) {
    console.error('Error checking title access:', error);
  }

  return false;
}

