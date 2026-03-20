import { useCallback, useRef, useMemo } from "react";

/**
 * Hook do throttle funkcji - ogranicza ilość wywołań
 * Przydatne dla scroll handlers, resize listeners
 */
export function useThrottle<TArgs extends readonly unknown[], TReturn>(
  callback: (...args: TArgs) => TReturn,
  delay: number = 100
): (...args: TArgs) => TReturn | undefined {
  const lastCallRef = useRef(0);

  return useCallback((...args: TArgs) => {
    const now = Date.now();

    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      return callback(...args);
    }
    return undefined;
  }, [callback, delay]);
}

/**
 * Hook do ograniczenia ilości wywołań API
 * Cached results dla identycznych requestów
 */
export function useRequestCache<T>(
  cacheTime: number = 5 * 60 * 1000 // 5 minut
) {
  const cache = useMemo(() => new Map<string, { data: T; timestamp: number }>(), []);

  const get = useCallback((key: string): T | null => {
    const cached = cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cacheTime;
    if (isExpired) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }, [cache, cacheTime]);

  const set = useCallback((key: string, data: T) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, [cache]);

  const clear = useCallback(() => {
    cache.clear();
  }, [cache]);

  return { get, set, clear };
}

