"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useGeofence } from "@/hooks/useGeofence";
import type { Coordinates } from "@/lib/geolocation";

const GEOFENCE_ENABLED_STORAGE_KEY = "planner:geofence-enabled";

interface GeofenceTrackingContextValue {
  enabled: boolean;
  isTracking: boolean;
  currentLocation: Coordinates | null;
  error: Error | null;
  startTracking: () => void;
  stopTracking: () => void;
  checkNow: () => Promise<void>;
}

const GeofenceTrackingContext = createContext<GeofenceTrackingContextValue | null>(null);

interface GeofenceTrackingProviderProps {
  children: React.ReactNode;
}

export function GeofenceTrackingProvider({ children }: GeofenceTrackingProviderProps) {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.localStorage.getItem(GEOFENCE_ENABLED_STORAGE_KEY) === "true";
  });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === GEOFENCE_ENABLED_STORAGE_KEY) {
        setEnabled(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GEOFENCE_ENABLED_STORAGE_KEY, String(enabled));
  }, [enabled]);

  const {
    isTracking,
    currentLocation,
    error,
    checkNow,
  } = useGeofence({
    enabled,
  });

  const startTracking = useCallback(() => {
    setEnabled(true);
  }, []);

  const stopTracking = useCallback(() => {
    setEnabled(false);
  }, []);

  const value = useMemo(
    () => ({
      enabled,
      isTracking,
      currentLocation,
      error,
      startTracking,
      stopTracking,
      checkNow,
    }),
    [enabled, isTracking, currentLocation, error, startTracking, stopTracking, checkNow]
  );

  return <GeofenceTrackingContext.Provider value={value}>{children}</GeofenceTrackingContext.Provider>;
}

export function useGeofenceTracking() {
  const context = useContext(GeofenceTrackingContext);
  if (!context) {
    throw new Error("useGeofenceTracking must be used within GeofenceTrackingProvider");
  }
  return context;
}


