'use client';

import { useTheme } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme is applied by the hook
  useTheme();

  return <>{children}</>;
}

