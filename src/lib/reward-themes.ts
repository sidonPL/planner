/**
 * System motywów dla nagród gamifikacyjnych
 * Każdy motyw ma unikalny zestaw kolorów i stylów
 */

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    border: string;
    muted: string;
    mutedForeground: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  borderRadius?: string;
}

export const REWARD_THEMES: Record<string, ThemeDefinition> = {
  // Domyślny motyw
  default: {
    id: 'default',
    name: 'Domyślny',
    description: 'Standardowy motyw aplikacji',
    colors: {
      primary: 'hsl(var(--primary))',
      secondary: 'hsl(var(--secondary))',
      accent: 'hsl(var(--accent))',
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: 'hsl(var(--card))',
      cardForeground: 'hsl(var(--card-foreground))',
      border: 'hsl(var(--border))',
      muted: 'hsl(var(--muted))',
      mutedForeground: 'hsl(var(--muted-foreground))',
    },
  },

  // Motyw Premium (złoto-czarny)
  premium_dark: {
    id: 'premium_dark',
    name: '💎 Motyw Premium',
    description: 'Luksusowy ciemny motyw ze złotymi akcentami',
    colors: {
      primary: '#FFD700',
      secondary: '#FFA500',
      accent: '#FF8C00',
      background: '#0A0A0A',
      foreground: '#F5F5DC',
      card: '#1A1A1A',
      cardForeground: '#F5F5DC',
      border: '#FFD700',
      muted: '#2A2A2A',
      mutedForeground: '#A0A0A0',
    },
    fonts: {
      heading: '"Playfair Display", serif',
      body: '"Inter", sans-serif',
    },
    borderRadius: '0.75rem',
  },

  // Motyw Ocean (niebieski)
  ocean_blue: {
    id: 'ocean_blue',
    name: '🌊 Motyw Ocean',
    description: 'Spokojny niebieski motyw inspirowany oceanem',
    colors: {
      primary: '#0EA5E9',
      secondary: '#06B6D4',
      accent: '#0284C7',
      background: '#F0F9FF',
      foreground: '#0C4A6E',
      card: '#FFFFFF',
      cardForeground: '#0C4A6E',
      border: '#BAE6FD',
      muted: '#E0F2FE',
      mutedForeground: '#475569',
    },
    borderRadius: '1rem',
  },

  // Motyw Forest (zielony)
  forest_green: {
    id: 'forest_green',
    name: '🌲 Motyw Las',
    description: 'Naturalny zielony motyw lasu',
    colors: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#047857',
      background: '#F0FDF4',
      foreground: '#064E3B',
      card: '#FFFFFF',
      cardForeground: '#064E3B',
      border: '#BBF7D0',
      muted: '#DCFCE7',
      mutedForeground: '#475569',
    },
    borderRadius: '0.5rem',
  },

  // Motyw Sunset (pomarańczowy-różowy)
  sunset_glow: {
    id: 'sunset_glow',
    name: '🌅 Motyw Zachód Słońca',
    description: 'Ciepły motyw z kolorami zachodu słońca',
    colors: {
      primary: '#F97316',
      secondary: '#FB923C',
      accent: '#EA580C',
      background: '#FFF7ED',
      foreground: '#7C2D12',
      card: '#FFFFFF',
      cardForeground: '#7C2D12',
      border: '#FED7AA',
      muted: '#FFEDD5',
      mutedForeground: '#78716C',
    },
    borderRadius: '0.75rem',
  },

  // Motyw Purple Magic (fioletowy)
  purple_magic: {
    id: 'purple_magic',
    name: '✨ Motyw Magiczny',
    description: 'Magiczny fioletowy motyw',
    colors: {
      primary: '#A855F7',
      secondary: '#C084FC',
      accent: '#9333EA',
      background: '#FAF5FF',
      foreground: '#581C87',
      card: '#FFFFFF',
      cardForeground: '#581C87',
      border: '#E9D5FF',
      muted: '#F3E8FF',
      mutedForeground: '#6B7280',
    },
    borderRadius: '1rem',
  },

  // Motyw Cyberpunk (neon)
  cyberpunk_neon: {
    id: 'cyberpunk_neon',
    name: '🎮 Motyw Cyberpunk',
    description: 'Futurystyczny motyw z neonowymi kolorami',
    colors: {
      primary: '#FF00FF',
      secondary: '#00FFFF',
      accent: '#FFFF00',
      background: '#0D0D0D',
      foreground: '#00FF00',
      card: '#1A1A1A',
      cardForeground: '#00FF00',
      border: '#FF00FF',
      muted: '#2D2D2D',
      mutedForeground: '#00FFFF',
    },
    fonts: {
      heading: '"Orbitron", sans-serif',
      body: '"Roboto Mono", monospace',
    },
    borderRadius: '0.25rem',
  },

  // Motyw Cherry Blossom (różowy)
  cherry_blossom: {
    id: 'cherry_blossom',
    name: '🌸 Motyw Wiśnia',
    description: 'Delikatny różowy motyw kwiatu wiśni',
    colors: {
      primary: '#EC4899',
      secondary: '#F472B6',
      accent: '#DB2777',
      background: '#FDF2F8',
      foreground: '#831843',
      card: '#FFFFFF',
      cardForeground: '#831843',
      border: '#FBCFE8',
      muted: '#FCE7F3',
      mutedForeground: '#6B7280',
    },
    borderRadius: '1rem',
  },

  // Motyw Midnight (ciemny niebieski)
  midnight_blue: {
    id: 'midnight_blue',
    name: '🌙 Motyw Północ',
    description: 'Ciemny motyw z niebieskimi akcentami',
    colors: {
      primary: '#3B82F6',
      secondary: '#60A5FA',
      accent: '#2563EB',
      background: '#0F172A',
      foreground: '#E2E8F0',
      card: '#1E293B',
      cardForeground: '#E2E8F0',
      border: '#3B82F6',
      muted: '#334155',
      mutedForeground: '#94A3B8',
    },
    borderRadius: '0.5rem',
  },
};

/**
 * Generuje CSS variables dla danego motywu
 */
export function generateThemeCSS(themeId: string): string {
  const theme = REWARD_THEMES[themeId];
  if (!theme) return '';

  const cssVars = Object.entries(theme.colors)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `  --${cssKey}: ${value};`;
    })
    .join('\n');

  let css = `:root[data-reward-theme="${themeId}"] {\n${cssVars}\n`;

  if (theme.fonts?.heading) {
    css += `  --font-heading: ${theme.fonts.heading};\n`;
  }
  if (theme.fonts?.body) {
    css += `  --font-body: ${theme.fonts.body};\n`;
  }
  if (theme.borderRadius) {
    css += `  --radius: ${theme.borderRadius};\n`;
  }

  css += '}\n';

  return css;
}

/**
 * Aplikuje motyw do dokumentu
 */
export function applyRewardTheme(themeId: string | null) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  if (!themeId || themeId === 'default') {
    root.removeAttribute('data-reward-theme');
    return;
  }

  const theme = REWARD_THEMES[themeId];
  if (!theme) {
    console.warn(`Theme ${themeId} not found`);
    return;
  }

  root.setAttribute('data-reward-theme', themeId);

  // Aplikuj CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    root.style.setProperty(`--${cssKey}`, value);
  });

  if (theme.fonts?.heading) {
    root.style.setProperty('--font-heading', theme.fonts.heading);
  }
  if (theme.fonts?.body) {
    root.style.setProperty('--font-body', theme.fonts.body);
  }
  if (theme.borderRadius) {
    root.style.setProperty('--radius', theme.borderRadius);
  }
}

/**
 * Pobiera listę dostępnych motywów
 */
export function getAvailableThemes(): ThemeDefinition[] {
  return Object.values(REWARD_THEMES);
}

