import { useState, useCallback, useRef, useEffect } from "react";

interface TimerOptions {
  onComplete?: () => void;
  onTick?: (secondsRemaining: number) => void;
  autoStart?: boolean;
}

/**
 * Hook do zarządzania timerem w trybie gotowania
 */
export function useTimer(initialSeconds: number = 0, options: TimerOptions = {}) {
  const { onComplete, onTick, autoStart = false } = options;

  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prevSeconds) => {
        if (prevSeconds <= 1) {
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onComplete?.();
          return 0;
        }

        const newSeconds = prevSeconds - 1;
        onTick?.(newSeconds);
        return newSeconds;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, onComplete, onTick]);

  const start = useCallback(() => {
    if (seconds > 0) {
      setIsRunning(true);
    }
  }, [seconds]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback((newSeconds?: number) => {
    setIsRunning(false);
    setSeconds(newSeconds ?? initialSeconds);
  }, [initialSeconds]);

  const toggle = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const addTime = useCallback((additionalSeconds: number) => {
    setSeconds((prev) => prev + additionalSeconds);
  }, []);

  const formatTime = useCallback(() => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [seconds]);

  const getPercentage = useCallback(() => {
    if (initialSeconds === 0) return 0;
    return ((initialSeconds - seconds) / initialSeconds) * 100;
  }, [seconds, initialSeconds]);

  return {
    seconds,
    isRunning,
    start,
    pause,
    reset,
    toggle,
    addTime,
    formatTime,
    getPercentage,
    isComplete: seconds === 0,
  };
}

/**
 * Hook do zarządzania wieloma timerami (np. dla różnych kroków)
 */
export function useMultipleTimers() {
  const [timers, setTimers] = useState<Map<string, ReturnType<typeof useTimer>>>(new Map());

  const createTimer = useCallback((id: string, seconds: number, options?: TimerOptions) => {
    // Note: This is simplified - in real app you'd need to properly manage timer state
    const timer = {
      seconds,
      isRunning: false,
      // ... other timer methods
    } as ReturnType<typeof useTimer>;

    setTimers((prev) => new Map(prev).set(id, timer));
  }, []);

  const removeTimer = useCallback((id: string) => {
    setTimers((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const getTimer = useCallback((id: string) => {
    return timers.get(id);
  }, [timers]);

  return {
    timers,
    createTimer,
    removeTimer,
    getTimer,
  };
}

