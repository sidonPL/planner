'use client';

import { useEffect } from 'react';
import { applyTheme, ThemeId } from '@/lib/themes';

interface RewardThemeProviderProps {
  activeTheme: string | null;
  children: React.ReactNode;
}

/**
 * Provider dla motywów nagród
 * Automatycznie aplikuje aktywny motyw użytkownika
 */
export function RewardThemeProvider({ activeTheme, children }: RewardThemeProviderProps) {
  useEffect(() => {
    applyTheme((activeTheme as ThemeId | null) ?? 'default');
  }, [activeTheme]);

  return <>{children}</>;
}

