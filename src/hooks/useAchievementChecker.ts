'use client';

import { useState, useEffect, useCallback } from 'react';

interface Achievement {
  id: string;
  achievement: {
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  };
}

export function useAchievementChecker(interval: number = 30000) {
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAchievements = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/achievements/check', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newAchievements && data.newAchievements.length > 0) {
          setNewAchievements(data.newAchievements);
          setLastChecked(new Date());
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }, []);

  useEffect(() => {
    // Funkcja wrapper aby uniknąć problemu z async w useEffect
    let mounted = true;

    const runCheck = async () => {
      if (mounted) {
        await checkAchievements();
      }
    };

    // Sprawdź od razu przy montowaniu
    runCheck();

    // Sprawdzaj co interval
    const intervalId = setInterval(() => {
      if (mounted) {
        runCheck();
      }
    }, interval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [checkAchievements, interval]);

  const clearAchievements = useCallback(() => {
    setNewAchievements([]);
  }, []);

  return {
    newAchievements,
    lastChecked,
    checkAchievements,
    clearAchievements,
  };
}

