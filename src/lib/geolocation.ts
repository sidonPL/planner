/**
 * Biblioteka do obliczeń geograficznych i geofencing
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // w metrach
}

/**
 * Oblicza odległość między dwoma punktami geograficznymi używając wzoru Haversine
 * @param point1 Pierwszy punkt (lat, lon)
 * @param point2 Drugi punkt (lat, lon)
 * @returns Odległość w metrach
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371e3; // Promień Ziemi w metrach
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Odległość w metrach
}

/**
 * Sprawdza czy punkt znajduje się w strefie geofencing
 * @param point Punkt do sprawdzenia
 * @param zone Strefa geofencing
 * @returns true jeśli punkt jest w strefie
 */
export function isPointInZone(point: Coordinates, zone: GeofenceZone): boolean {
  const distance = calculateDistance(point, {
    latitude: zone.latitude,
    longitude: zone.longitude,
  });

  return distance <= zone.radius;
}

/**
 * Znajduje wszystkie strefy w których znajduje się punkt
 * @param point Punkt do sprawdzenia
 * @param zones Lista stref
 * @returns Lista stref zawierających punkt
 */
export function getActiveZones(point: Coordinates, zones: GeofenceZone[]): GeofenceZone[] {
  return zones.filter((zone) => isPointInZone(point, zone));
}

/**
 * Pobiera aktualną lokalizację użytkownika z przeglądarki
 * @returns Promise z współrzędnymi lub błąd
 */
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolokalizacja nie jest wspierana przez przeglądarkę"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let errorMessage = "Nie udało się pobrać lokalizacji";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Użytkownik odmówił dostępu do lokalizacji";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Lokalizacja nie jest dostępna";
            break;
          case error.TIMEOUT:
            errorMessage = "Przekroczono czas oczekiwania na lokalizację";
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Monitoruje lokalizację użytkownika
 * @param onUpdate Callback wywoływany przy zmianie lokalizacji
 * @returns ID watchera (do zatrzymania monitorowania)
 */
export function watchPosition(
  onUpdate: (position: Coordinates) => void,
  onError?: (error: Error) => void
): number {
  if (!navigator.geolocation) {
    onError?.(new Error("Geolokalizacja nie jest wspierana przez przeglądarkę"));
    return -1;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      let errorMessage = "Błąd monitorowania lokalizacji";
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Użytkownik odmówił dostępu do lokalizacji";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Lokalizacja nie jest dostępna";
          break;
        case error.TIMEOUT:
          errorMessage = "Przekroczono czas oczekiwania na lokalizację";
          break;
      }
      onError?.(new Error(errorMessage));
    },
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000, // Akceptuj lokalizację starszą niż 10 sekund
    }
  );
}

/**
 * Zatrzymuje monitorowanie lokalizacji
 * @param watchId ID zwrócony przez watchPosition
 */
export function clearWatch(watchId: number): void {
  if (navigator.geolocation && watchId !== -1) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Formatuje współrzędne do wyświetlenia
 * @param coords Współrzędne
 * @param precision Precyzja (liczba miejsc po przecinku)
 * @returns Sformatowany string
 */
export function formatCoordinates(coords: Coordinates, precision: number = 6): string {
  return `${coords.latitude.toFixed(precision)}, ${coords.longitude.toFixed(precision)}`;
}

/**
 * Sprawdza czy użytkownik ma uprawnienia do geolokalizacji
 * @returns Promise z statusem uprawnień
 */
export async function checkGeolocationPermission(): Promise<PermissionState> {
  if (!navigator.permissions) {
    // Fallback - spróbuj pobrać lokalizację
    try {
      await getCurrentPosition();
      return "granted";
    } catch {
      return "denied";
    }
  }

  const permission = await navigator.permissions.query({ name: "geolocation" });
  return permission.state;
}

