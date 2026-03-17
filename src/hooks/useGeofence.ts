"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { getCurrentPosition, watchPosition, clearWatch, type Coordinates } from "@/lib/geolocation";

interface UseGeofenceOptions {
  enabled?: boolean;
  interval?: number; // Jak często sprawdzać (ms), domyślnie 60000 (1 min)
  onLocationChange?: (coords: Coordinates) => void;
  onError?: (error: Error) => void;
}

interface GeofenceState {
  isTracking: boolean;
  currentLocation: Coordinates | null;
  error: Error | null;
  lastCheck: Date | null;
}

export function useGeofence(options: UseGeofenceOptions = {}) {
  const {
    enabled = false,
    interval = 60000, // 1 minuta
    onLocationChange,
    onError,
  } = options;

  const [state, setState] = useState<GeofenceState>({
    isTracking: false,
    currentLocation: null,
    error: null,
    lastCheck: null,
  });

  const watchIdRef = useRef<number>(-1);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Sprawdź lokalizację i wyślij do API
  const checkLocation = useCallback(async (coords: Coordinates) => {
    try {
      const response = await fetch("/api/geofence/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });

      if (response.ok) {
        const result = await response.json();

        // Powiadomienie gdy status się zmienił
        if (result.statusChanged) {
          const statusLabels: Record<string, string> = {
            HOME: "w domu",
            WORK: "w pracy",
            SCHOOL: "w szkole",
            AWAY: "poza domem",
          };

          const statusMessage = statusLabels[result.presenceStatus] || result.presenceStatus;
          toast.success(`Status zmieniony: ${statusMessage}`);

          // Wyślij powiadomienie push
          if (result.event) {
            const isEnter = result.event.type === "ENTER";
            const zoneName = result.event.zone?.name || "strefy";

            try {
              await fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: isEnter ? `📍 Wejście do ${zoneName}` : `🚶 Wyjście z ${zoneName}`,
                  message: `Twój status zmienił się na: ${statusMessage}`,
                  url: "/presence",
                  tag: `geofence-${result.event.id}`,
                }),
              });
            } catch (pushError) {
              console.error("Failed to send push notification:", pushError);
            }
          }
        }

        setState((prev) => ({
          ...prev,
          lastCheck: new Date(),
        }));
      }
    } catch (error) {
      console.error("Error checking location:", error);
    }
  }, []);

  // Callback przy zmianie lokalizacji
  const handleLocationUpdate = useCallback(
    (coords: Coordinates) => {
      setState((prev) => ({
        ...prev,
        currentLocation: coords,
        error: null,
      }));

      onLocationChange?.(coords);
      checkLocation(coords);
    },
    [onLocationChange, checkLocation]
  );

  // Callback przy błędzie
  const handleError = useCallback(
    (error: Error) => {
      setState((prev) => ({
        ...prev,
        error,
        isTracking: false,
      }));
      onError?.(error);
    },
    [onError]
  );

  // Rozpocznij tracking
  const startTracking = useCallback(async () => {
    try {
      // Pobierz początkową lokalizację
      const initialPosition = await getCurrentPosition();
      handleLocationUpdate(initialPosition);

      // Rozpocznij ciągły monitoring
      const watchId = watchPosition(handleLocationUpdate, handleError);
      watchIdRef.current = watchId;

      // Periodyczne sprawdzanie (na wypadek gdyby watch przestał działać)
      const intervalId = setInterval(async () => {
        try {
          const position = await getCurrentPosition();
          handleLocationUpdate(position);
        } catch (error) {
          console.error("Periodic check failed:", error);
        }
      }, interval);

      intervalIdRef.current = intervalId;

      setState((prev) => ({
        ...prev,
        isTracking: true,
      }));

      toast.success("Monitorowanie lokalizacji włączone");
    } catch (error) {
      handleError(error as Error);
      toast.error("Nie udało się włączyć monitorowania lokalizacji");
    }
  }, [interval, handleLocationUpdate, handleError]);

  // Zatrzymaj tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== -1) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = -1;
    }

    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isTracking: false,
    }));

    toast.info("Monitorowanie lokalizacji wyłączone");
  }, []);

  // Ręczne sprawdzenie lokalizacji
  const checkNow = useCallback(async () => {
    try {
      const position = await getCurrentPosition();
      handleLocationUpdate(position);
      toast.success("Lokalizacja sprawdzona");
    } catch (error) {
      handleError(error as Error);
      toast.error("Nie udało się pobrać lokalizacji");
    }
  }, [handleLocationUpdate, handleError]);

  // Auto-start/stop w zależności od opcji
  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    checkNow,
  };
}

