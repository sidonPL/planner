/**
 * Hook do powiadomień o stanie inwentarza
 * Sprawdza:
 * - Niskie zapasy (quantity <= minQuantity)
 * - Wygasające produkty (expiry <= 3 dni)
 * - Przeterminowane produkty
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { differenceInDays, isPast } from "date-fns";

const STORAGE_KEY = "inventory-last-check";
const SETTINGS_KEY = "inventory-notification-settings";

interface NotificationSettings {
  enabled: boolean;
  frequency: "daily" | "every3days" | "weekly";
  types: {
    lowStock: boolean;
    expiringSoon: boolean;
    expired: boolean;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  frequency: "daily",
  types: {
    lowStock: true,
    expiringSoon: true,
    expired: true,
  },
};

const FREQUENCY_INTERVALS = {
  daily: 24 * 60 * 60 * 1000,        // 24 godziny
  every3days: 3 * 24 * 60 * 60 * 1000, // 3 dni
  weekly: 7 * 24 * 60 * 60 * 1000,    // 7 dni
};

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string | null;
  minQuantity: number | null;
  expiryDate: Date | null;
}

export function useInventoryNotifications() {
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  useEffect(() => {
    // Załaduj ostatnie sprawdzenie z localStorage
    const loadLastCheck = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setLastCheck(parseInt(stored));
        }
      } catch (error) {
        console.error("Error loading last check:", error);
      }
    };

    loadLastCheck();
  }, []);

  const checkInventory = async () => {
    try {
      // Pobierz ustawienia
      const settingsStr = localStorage.getItem(SETTINGS_KEY);
      const settings: NotificationSettings = settingsStr
        ? JSON.parse(settingsStr)
        : DEFAULT_SETTINGS;

      // Jeśli wyłączone, nie sprawdzaj
      if (!settings.enabled) {
        return;
      }

      const response = await fetch("/api/inventory");
      if (!response.ok) return;

      const items: InventoryItem[] = await response.json();

      // Sprawdź niskie zapasy (jeśli włączone)
      if (settings.types.lowStock) {
        const lowStock = items.filter(
          (item) => item.minQuantity && item.quantity <= item.minQuantity
        );

        if (lowStock.length > 0) {
          toast.warning(`Niskie zapasy: ${lowStock.length} produkt(ów)`, {
            description: lowStock.slice(0, 3).map(i => i.name).join(", ") +
                        (lowStock.length > 3 ? "..." : ""),
            duration: 10000,
            action: {
              label: "Zobacz",
              onClick: () => {
                window.location.href = "/inventory";
              },
            },
          });
        }
      }

      // Sprawdź wygasające (<=3 dni) (jeśli włączone)
      if (settings.types.expiringSoon) {
        const expiringSoon = items.filter((item) => {
          if (!item.expiryDate) return false;
          const days = differenceInDays(new Date(item.expiryDate), new Date());
          return days >= 0 && days <= 3;
        });

        if (expiringSoon.length > 0) {
          toast.error(`⚠️ Wygasa wkrótce: ${expiringSoon.length} produkt(ów)`, {
            description: expiringSoon.slice(0, 3).map(i => `${i.name} (${differenceInDays(new Date(i.expiryDate!), new Date())} dni)`).join(", "),
            duration: 15000,
            action: {
              label: "Zobacz",
              onClick: () => {
                window.location.href = "/inventory";
              },
            },
          });
        }
      }

      // Sprawdź przeterminowane (jeśli włączone)
      if (settings.types.expired) {
        const expired = items.filter(
          (item) => item.expiryDate && isPast(new Date(item.expiryDate))
        );

        if (expired.length > 0) {
          toast.error(`🗑️ Przeterminowane: ${expired.length} produkt(ów)`, {
            description: "Usuń przeterminowane produkty z inwentarza",
            duration: 20000,
            action: {
              label: "Zobacz",
              onClick: () => {
                window.location.href = "/inventory";
              },
            },
          });
        }
      }

      // Zapisz czas sprawdzenia
      const now = Date.now();
      setLastCheck(now);
      localStorage.setItem(STORAGE_KEY, now.toString());
    } catch (error) {
      console.error("Error checking inventory:", error);
    }
  };

  useEffect(() => {
    // Pobierz ustawienia dla interwału
    const settingsStr = localStorage.getItem(SETTINGS_KEY);
    const settings: NotificationSettings = settingsStr
      ? JSON.parse(settingsStr)
      : DEFAULT_SETTINGS;

    const checkInterval = FREQUENCY_INTERVALS[settings.frequency];

    // Sprawdź czy minął wymagany czas od ostatniego sprawdzenia
    const shouldCheck = !lastCheck || (Date.now() - lastCheck) > checkInterval;

    if (shouldCheck && settings.enabled) {
      // Opóźnij o 2 sekundy aby nie blokować initial render
      const timer = setTimeout(() => {
        void checkInventory();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [lastCheck]);

  return { checkInventory };
}

