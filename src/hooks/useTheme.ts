'use client';

import { useEffect, useState } from 'react';
import { ThemeId, applyTheme } from '@/lib/themes';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeId>('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      // Najpierw spróbuj z localStorage (instant)
      const cached = localStorage.getItem('activeTheme') as ThemeId;
      if (cached) {
        applyTheme(cached);
        setTheme(cached);
      }

      // Potem pobierz z API (authoritative)
      const response = await fetch('/api/gamification/theme');
      if (response.ok) {
        const data = await response.json();
        const themeId = data.themeId as ThemeId;

        if (themeId !== cached) {
          applyTheme(themeId);
          setTheme(themeId);
          localStorage.setItem('activeTheme', themeId);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeTheme = async (themeId: ThemeId) => {
    try {
      // Optimistic update
      applyTheme(themeId);
      setTheme(themeId);
      localStorage.setItem('activeTheme', themeId);

      // Save to backend
      const response = await fetch('/api/gamification/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to save theme');
      }

      return true;
    } catch (error) {
      console.error('Error changing theme:', error);
      return false;
    }
  };

  return {
    theme,
    loading,
    changeTheme,
    refreshTheme: loadTheme,
  };
}

