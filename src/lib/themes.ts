/**
 * Theme System
 * System motywów kolorystycznych jako nagrody gamifikacyjne
 */

export const AVAILABLE_THEMES = {
  default: {
    id: 'default',
    name: 'Domyślny',
    description: 'Standardowy motyw aplikacji',
    icon: '🎨',
    free: true,
    cssClass: 'theme-default',
    colors: undefined,
    premium: false,
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Spokojne odcienie błękitu i morza',
    icon: '🌊',
    free: false,
    cssClass: 'theme-ocean',
    premium: false,
    colors: {
      primary: '#0ea5e9', // sky-500
      primaryForeground: '#ffffff',
      secondary: '#06b6d4', // cyan-500
      accent: '#22d3ee', // cyan-400
      background: '#f0f9ff', // sky-50
      foreground: '#0c4a6e', // sky-900
    },
  },
  forest: {
    id: 'forest',
    name: 'Las',
    description: 'Naturalne zielenie i brązy',
    icon: '🌲',
    free: false,
    cssClass: 'theme-forest',
    premium: false,
    colors: {
      primary: '#22c55e', // green-500
      primaryForeground: '#ffffff',
      secondary: '#84cc16', // lime-500
      accent: '#86efac', // green-300
      background: '#f0fdf4', // green-50
      foreground: '#14532d', // green-900
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Zachód Słońca',
    description: 'Ciepłe pomarańcze i różowe odcienie',
    icon: '🌅',
    free: false,
    cssClass: 'theme-sunset',
    premium: false,
    colors: {
      primary: '#f97316', // orange-500
      primaryForeground: '#ffffff',
      secondary: '#fb923c', // orange-400
      accent: '#fbbf24', // amber-400
      background: '#fff7ed', // orange-50
      foreground: '#7c2d12', // orange-900
    },
  },
  midnight: {
    id: 'midnight',
    name: 'Północ',
    description: 'Głęboki ciemny motyw z fioletowymi akcentami',
    icon: '🌙',
    free: false,
    cssClass: 'theme-midnight',
    premium: false,
    colors: {
      primary: '#8b5cf6', // violet-500
      primaryForeground: '#ffffff',
      secondary: '#6366f1', // indigo-500
      accent: '#a78bfa', // violet-400
      background: '#1e1b4b', // indigo-950
      foreground: '#e0e7ff', // indigo-100
    },
  },
  cherry: {
    id: 'cherry',
    name: 'Wiśnia',
    description: 'Energetyczne róże i czerwienie',
    icon: '🍒',
    free: false,
    cssClass: 'theme-cherry',
    premium: false,
    colors: {
      primary: '#e11d48', // rose-600
      primaryForeground: '#ffffff',
      secondary: '#f43f5e', // rose-500
      accent: '#fb7185', // rose-400
      background: '#fff1f2', // rose-50
      foreground: '#881337', // rose-900
    },
  },
  lavender: {
    id: 'lavender',
    name: 'Lawenda',
    description: 'Delikatne fiolety i pastele',
    icon: '💜',
    free: false,
    cssClass: 'theme-lavender',
    premium: false,
    colors: {
      primary: '#a855f7', // purple-500
      primaryForeground: '#ffffff',
      secondary: '#c084fc', // purple-400
      accent: '#d8b4fe', // purple-300
      background: '#faf5ff', // purple-50
      foreground: '#581c87', // purple-900
    },
  },
  golden: {
    id: 'golden',
    name: 'Złoty',
    description: 'Luksusowe złote i brązowe tony - dla VIP',
    icon: '👑',
    free: false,
    cssClass: 'theme-golden',
    premium: true,
    colors: {
      primary: '#f59e0b', // amber-500
      primaryForeground: '#ffffff',
      secondary: '#d97706', // amber-600
      accent: '#fbbf24', // amber-400
      background: '#fffbeb', // amber-50
      foreground: '#78350f', // amber-900
    },
  },
} as const;

export type ThemeId = keyof typeof AVAILABLE_THEMES;

/**
 * Pobiera aktywny motyw użytkownika
 */
export function getActiveTheme(themeId: ThemeId | null): typeof AVAILABLE_THEMES[ThemeId] {
  if (!themeId || !AVAILABLE_THEMES[themeId]) {
    return AVAILABLE_THEMES.default;
  }
  return AVAILABLE_THEMES[themeId];
}

/**
 * Aplikuje motyw do dokumentu
 */
export function applyTheme(themeId: ThemeId | null) {
  const theme = getActiveTheme(themeId);
  const root = document.documentElement;

  // Usuń wszystkie klasy motywów
  Object.values(AVAILABLE_THEMES).forEach(t => {
    root.classList.remove(t.cssClass);
  });

  // Dodaj klasę aktywnego motywu
  if (theme.cssClass !== 'theme-default') {
    root.classList.add(theme.cssClass);
  }

  // Aplikuj CSS variables jeśli motyw ma custom colors
  if (theme.colors) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
  }
}

/**
 * Sprawdza czy użytkownik ma dostęp do motywu
 */
export async function hasThemeAccess(userId: string, themeId: ThemeId): Promise<boolean> {
  const theme = AVAILABLE_THEMES[themeId];

  // Darmowe motywy są zawsze dostępne
  if (theme.free) {
    return true;
  }

  // Sprawdź czy użytkownik ma aktywną nagrodę z tym motywem
  try {
    const response = await fetch('/api/gamification/active-rewards');
    if (response.ok) {
      const data = await response.json();
      const userSettings = data.userSettings;

      // Sprawdź claimed rewards
      const themeReward = data.activeRewards?.find(
        (r: any) => r.reward.effectData?.themeId === themeId
      );

      return !!themeReward || userSettings?.activeTheme === themeId;
    }
  } catch (error) {
    console.error('Error checking theme access:', error);
  }

  return false;
}

