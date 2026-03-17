'use client';

import { useEffect } from 'react';
import { applyRewardTheme } from '@/lib/reward-themes';

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
    applyRewardTheme(activeTheme);
  }, [activeTheme]);

  return <>{children}</>;
}

