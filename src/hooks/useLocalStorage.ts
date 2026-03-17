import { useState, useCallback, useEffect } from "react";

/**
 * Hook do localStorage z auto-save
 * Przydatny dla formularzy - zapisuje stan w localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  autoSaveDelay: number = 1000
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function (same API as useState)
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        // Save to localStorage with delay (debounce)
        if (typeof window !== "undefined") {
          const timeoutId = setTimeout(() => {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          }, autoSaveDelay);

          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, autoSaveDelay]
  );

  // Clear localStorage
  const clearValue = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error clearing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, clearValue];
}

/**
 * Hook do auto-save formularza do localStorage
 */
export function useAutoSaveForm<T extends Record<string, any>>(
  formId: string,
  initialData: T,
  saveDelay: number = 2000
) {
  const storageKey = `autosave_form_${formId}`;
  const [formData, setFormData, clearFormData] = useLocalStorage<T>(
    storageKey,
    initialData,
    saveDelay
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Update last saved timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
      }
    }, saveDelay + 100);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, saveDelay]);

  // Update form data and mark as unsaved
  const updateFormData = useCallback(
    (updates: Partial<T>) => {
      setFormData((prev) => ({ ...prev, ...updates }));
      setHasUnsavedChanges(true);
    },
    [setFormData]
  );

  // Clear saved data (e.g., after successful submit)
  const clearSavedData = useCallback(() => {
    clearFormData();
    setLastSaved(null);
    setHasUnsavedChanges(false);
  }, [clearFormData]);

  // Check if there's saved data
  const hasSavedData = useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) !== null;
  }, [storageKey]);

  return {
    formData,
    updateFormData,
    clearSavedData,
    lastSaved,
    hasUnsavedChanges,
    hasSavedData: hasSavedData(),
  };
}

