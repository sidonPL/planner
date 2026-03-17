"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Dostępne kolory akcentu - format oklch zgodny z Tailwind CSS v4
export const accentColors = [
  {
    name: "blue",
    label: "Niebieski",
    oklch: "0.631 0.197 254.604",
    oklchDark: "0.631 0.197 254.604",
    hex: "#3B82F6"
  },
  {
    name: "green",
    label: "Zielony",
    oklch: "0.589 0.178 152.236",
    oklchDark: "0.589 0.178 152.236",
    hex: "#16A34A"
  },
  {
    name: "purple",
    label: "Fioletowy",
    oklch: "0.648 0.251 293.756",
    oklchDark: "0.648 0.251 293.756",
    hex: "#8B5CF6"
  },
  {
    name: "orange",
    label: "Pomarańczowy",
    oklch: "0.705 0.196 49.324",
    oklchDark: "0.705 0.196 49.324",
    hex: "#F97316"
  },
  {
    name: "pink",
    label: "Różowy",
    oklch: "0.657 0.242 352.141",
    oklchDark: "0.657 0.242 352.141",
    hex: "#EC4899"
  },
  {
    name: "teal",
    label: "Turkusowy",
    oklch: "0.675 0.131 188.423",
    oklchDark: "0.675 0.131 188.423",
    hex: "#14B8A6"
  },
  {
    name: "red",
    label: "Czerwony",
    oklch: "0.627 0.257 29.234",
    oklchDark: "0.627 0.257 29.234",
    hex: "#EF4444"
  },
  {
    name: "yellow",
    label: "Żółty",
    oklch: "0.769 0.188 70.08",
    oklchDark: "0.769 0.188 70.08",
    hex: "#EAB308"
  },
  {
    name: "indigo",
    label: "Indygo",
    oklch: "0.592 0.209 283.75",
    oklchDark: "0.592 0.209 283.75",
    hex: "#6366F1"
  },
  {
    name: "cyan",
    label: "Cyjan",
    oklch: "0.715 0.121 215.111",
    oklchDark: "0.715 0.121 215.111",
    hex: "#06B6D4"
  },
] as const;

export type AccentColorName = typeof accentColors[number]["name"];

export function useAccentColor() {
  const { data: session, status } = useSession();
  const [accentColor, setAccentColorState] = useState<AccentColorName>("blue");
  const [isLoading, setIsLoading] = useState(true);

  // Załaduj kolor akcentu z sesji lub localStorage
  useEffect(() => {
    if (status === "loading") return;

    // Najpierw sprawdź localStorage (dla szybszego ładowania)
    const savedColor = localStorage.getItem("accentColor") as AccentColorName | null;
    if (savedColor && accentColors.some(c => c.name === savedColor)) {
      setAccentColorState(savedColor);
      applyAccentColor(savedColor);
    }

    // Następnie pobierz z API jeśli zalogowany
    if (session?.user) {
      fetchAccentColor();
    } else {
      setIsLoading(false);
    }
  }, [session, status]);

  // Nasłuchuj zmian motywu (dark/light) i ponownie aplikuj kolory
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          // Motyw się zmienił, ponownie aplikuj kolor
          if (accentColor) {
            applyAccentColor(accentColor);
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [accentColor]);

  const fetchAccentColor = async () => {
    try {
      const response = await fetch("/api/user/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.accentColor && accentColors.some(c => c.name === data.accentColor)) {
          setAccentColorState(data.accentColor);
          applyAccentColor(data.accentColor);
          localStorage.setItem("accentColor", data.accentColor);
        }
      }
    } catch (error) {
      console.error("Error fetching accent color:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAccentColor = async (color: AccentColorName) => {
    setAccentColorState(color);
    applyAccentColor(color);
    localStorage.setItem("accentColor", color);

    // Zapisz na serwerze jeśli zalogowany
    if (session?.user) {
      try {
        await fetch("/api/user/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accentColor: color }),
        });
      } catch (error) {
        console.error("Error saving accent color:", error);
      }
    }
  };

  return {
    accentColor,
    setAccentColor,
    isLoading,
    accentColors,
  };
}

// Aplikuj kolor akcentu do CSS variables
function applyAccentColor(colorName: AccentColorName) {
  const color = accentColors.find(c => c.name === colorName);
  if (!color) return;

  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  // Ustaw kolor główny w formacie oklch
  const primaryColor = isDark ? color.oklchDark : color.oklch;
  root.style.setProperty("--primary", `oklch(${primaryColor})`);

  // Kolor foreground - biały dla ciemnego tła, ciemny dla jasnego
  root.style.setProperty("--primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");

  // Zaktualizuj ring (używany przy focus) - nieco jaśniejszy
  root.style.setProperty("--ring", `oklch(${primaryColor})`);

  // Sidebar colors
  root.style.setProperty("--sidebar-primary", `oklch(${primaryColor})`);
  root.style.setProperty("--sidebar-primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");
  root.style.setProperty("--sidebar-ring", `oklch(${primaryColor})`);
}

