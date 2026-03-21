import { AVAILABLE_THEMES, ThemeId } from '@/lib/themes';

const LEGACY_THEME_ALIASES: Record<string, ThemeId> = {
  ocean_blue: 'ocean',
  forest_green: 'forest',
  sunset_glow: 'sunset',
  purple_magic: 'lavender',
  cherry_blossom: 'cherry',
  midnight_blue: 'midnight',
  premium_dark: 'golden',
  cyberpunk_neon: 'golden',
};

function normalizeThemeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function resolveThemeIdFromEffectData(effectData: unknown): ThemeId | null {
  if (!effectData || typeof effectData !== 'object') {
    return null;
  }

  const raw = (effectData as { themeId?: unknown }).themeId;
  if (typeof raw !== 'string' || !raw.trim()) {
    return null;
  }

  const token = normalizeThemeToken(raw);
  if (AVAILABLE_THEMES[token as ThemeId]) {
    return token as ThemeId;
  }

  return LEGACY_THEME_ALIASES[token] || null;
}

export function inferThemeIdFromRewardName(name?: string | null): ThemeId | null {
  if (!name) return null;
  const normalized = name.toLowerCase();

  if (normalized.includes('halloween')) return 'midnight';
  if (normalized.includes('wiosen')) return 'lavender';
  if (normalized.includes('animowane tło') || normalized.includes('animowane tlo')) return 'ocean';

  if (normalized.includes('ocean')) return 'ocean';
  if (normalized.includes('las') || normalized.includes('forest')) return 'forest';
  if (normalized.includes('zach') || normalized.includes('sunset')) return 'sunset';
  if (normalized.includes('lawend') || normalized.includes('magicz') || normalized.includes('purple')) return 'lavender';
  if ((normalized.includes('wi') && normalized.includes('ni')) || normalized.includes('cherry')) return 'cherry';
  if (normalized.includes('północ') || normalized.includes('polnoc') || normalized.includes('midnight')) return 'midnight';
  if (normalized.includes('złot') || normalized.includes('zlot') || normalized.includes('gold') || normalized.includes('premium') || normalized.includes('cyberpunk')) return 'golden';

  return null;
}

export function resolveThemeIdFromRewardData(input: { effectData?: unknown; name?: string | null }): ThemeId | null {
  return resolveThemeIdFromEffectData(input.effectData) || inferThemeIdFromRewardName(input.name);
}



