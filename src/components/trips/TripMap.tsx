"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamicznie importuj mapę (SSR disabled)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div> }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

export interface MapPlace {
  id: string;
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  category?: string;
  isVisited?: boolean;
}

interface TripMapProps {
  places: MapPlace[];
  center?: [number, number];
  zoom?: number;
  onPlaceClick?: (place: MapPlace) => void;
  className?: string;
}

// Kategorie z kolorami markerów
const categoryColors: Record<string, string> = {
  ATTRACTION: "#EF4444",     // czerwony
  RESTAURANT: "#F97316",     // pomarańczowy
  CAFE: "#92400E",           // brązowy
  HOTEL: "#3B82F6",          // niebieski
  BEACH: "#06B6D4",          // cyjan
  MUSEUM: "#8B5CF6",         // fioletowy
  PARK: "#22C55E",           // zielony
  SHOPPING: "#EC4899",       // różowy
  VIEWPOINT: "#F59E0B",      // żółty
  ENTERTAINMENT: "#A855F7",  // purpurowy
  OTHER: "#6B7280",          // szary
};

export function TripMap({
  places,
  center,
  zoom = 12,
  onPlaceClick,
  className = "h-[400px] w-full rounded-lg",
}: TripMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Importuj Leaflet dynamicznie
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  // Oblicz centrum mapy jeśli nie podano
  const mapCenter = center || (() => {
    if (places.length === 0) return [52.2297, 21.0122] as [number, number]; // Warszawa domyślnie
    
    const avgLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
    const avgLng = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;
    return [avgLat, avgLng] as [number, number];
  })();

  if (!isClient || !L) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stwórz customowy marker icon
  const createIcon = (category: string, isVisited: boolean) => {
    const color = isVisited ? "#9CA3AF" : (categoryColors[category] || categoryColors.OTHER);
    
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          background-color: ${color};
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ${isVisited ? 'opacity: 0.6;' : ''}
        ">
          <div style="
            transform: rotate(45deg);
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${isVisited ? '✓' : ''}
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    });
  };

  return (
    <div className={className}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={createIcon(place.category || "OTHER", place.isVisited || false)}
            eventHandlers={{
              click: () => onPlaceClick?.(place),
            }}
          >
            <Popup>
              <div className="min-w-[150px]">
                <h3 className="font-semibold">{place.name}</h3>
                {place.description && (
                  <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                )}
                {place.isVisited && (
                  <span className="text-xs text-green-600 font-medium">✓ Odwiedzone</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

