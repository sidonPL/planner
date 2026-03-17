/**
 * Hook do zarządzania powiadomieniami o nowych możliwościach gotowania
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "cookable-last-count";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minut

export function useCookableNotifications() {
  const [lastCount, setLastCount] = useState<number | null>(null);

  useEffect(() => {
    // Załaduj ostatnią liczbę z localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setLastCount(parseInt(stored));
      }
    } catch (error) {
      console.error("Error loading last count:", error);
    }
  }, []);

  const checkForNewRecipes = async () => {
    try {
      const response = await fetch("/api/recipes/cookable?mode=all&minAvailability=100&maxResults=100");
      if (!response.ok) return;

      const data = await response.json();
      const currentCount = data.perfectMatches?.length || 0;

      // Jeśli mamy zapisaną poprzednią liczbę i jest różna
      if (lastCount !== null && currentCount > lastCount) {
        const newRecipes = currentCount - lastCount;

        // Pokaż powiadomienie
        toast.success(`🎉 Nowe możliwości!`, {
          description: `Możesz teraz ugotować ${newRecipes} ${
            newRecipes === 1 ? "nowy przepis" : "nowe przepisy"
          }!`,
          duration: 10000,
          action: {
            label: "Zobacz",
            onClick: () => {
              // Trigger otwarcia dialogu poprzez event
              window.dispatchEvent(new CustomEvent("open-cookable-dialog"));
            },
          },
        });
      }

      // Zapisz aktualną liczbę
      setLastCount(currentCount);
      localStorage.setItem(STORAGE_KEY, currentCount.toString());
    } catch (error) {
      console.error("Error checking for new recipes:", error);
    }
  };

  useEffect(() => {
    // Sprawdź od razu przy mount
    void checkForNewRecipes();

    // Sprawdzaj co jakiś czas
    const interval = setInterval(() => {
      void checkForNewRecipes();
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCount]);

  return { checkForNewRecipes };
}

