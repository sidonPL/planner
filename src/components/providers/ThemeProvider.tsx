'use client';

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, loading } = useTheme();

  // Theme is applied by the hook
  // This component just ensures the hook runs at the app level

  return <>{children}</>;
}

