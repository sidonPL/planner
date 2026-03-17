/**
 * Hook dla keyboard shortcuts
 * Obsługuje:
 * - + lub = : Zwiększ ilość wybranego produktu
 * - - : Zmniejsz ilość wybranego produktu
 * - / : Focus na search
 * - n : Nowy produkt
 */

import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onIncrease?: () => void;
  onDecrease?: () => void;
  onSearch?: () => void;
  onNew?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onIncrease,
  onDecrease,
  onSearch,
  onNew,
  enabled = true,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignoruj jeśli user pisze w input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Wyjątek dla slash (search)
        if (event.key !== "/") {
          return;
        }
      }

      switch (event.key) {
        case "+":
        case "=":
          event.preventDefault();
          onIncrease?.();
          break;
        case "-":
          event.preventDefault();
          onDecrease?.();
          break;
        case "/":
          event.preventDefault();
          onSearch?.();
          break;
        case "n":
        case "N":
          // Tylko jeśli Ctrl/Cmd nie jest wciśnięty (unikamy Ctrl+N = nowa karta)
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            onNew?.();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onIncrease, onDecrease, onSearch, onNew, enabled]);
}

