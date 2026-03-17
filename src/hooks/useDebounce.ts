import { useEffect, useState } from "react";

/**
 * Hook do debounce wartości - opóźnia aktualizację wartości
 * Przydatne dla wyszukiwania, aby uniknąć zbyt wielu rerenderów
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

