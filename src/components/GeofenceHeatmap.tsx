"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// Fix dla ikon Leaflet
type LeafletDefaultIconPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: () => string;
};
const defaultIconPrototype = L.Icon.Default.prototype as LeafletDefaultIconPrototype;
delete defaultIconPrototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity?: number; // Opcjonalna intensywność (domyślnie 1.0)
}

interface GeofenceHeatmapProps {
  points: HeatmapPoint[];
  center?: { latitude: number; longitude: number };
  zoom?: number;
  height?: string;
  radius?: number; // Promień blur heatmap (default 25)
  maxIntensity?: number; // Maksymalna intensywność (default 1.0)
}

export function GeofenceHeatmap({
  points,
  center,
  zoom = 13,
  height = "500px",
  radius = 25,
  maxIntensity = 1.0,
}: GeofenceHeatmapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);

  // Inicjalizacja mapy
  useEffect(() => {
    if (!mapRef.current) {
      const defaultCenter = center || { latitude: 52.229676, longitude: 21.012229 };

      const map = L.map("geofence-heatmap", {
        center: [defaultCenter.latitude, defaultCenter.longitude],
        zoom,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  // Aktualizacja heatmap
  useEffect(() => {
    if (!mapRef.current) return;

    // Usuń stary layer
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }

    // Dodaj nowy layer jeśli są punkty
    if (points.length > 0) {
      // Konwertuj punkty do formatu leaflet.heat
      const heatPoints: [number, number, number][] = points.map((p) => [
        p.latitude,
        p.longitude,
        p.intensity || 1.0,
      ]);

      // Utwórz heatmap layer
      const heatLayer = L.heatLayer(heatPoints, {
        radius,
        blur: radius * 0.8,
        maxZoom: 17,
        max: maxIntensity,
        gradient: {
          0.0: "blue",
          0.3: "cyan",
          0.5: "lime",
          0.7: "yellow",
          1.0: "red",
        },
      });

      heatLayer.addTo(mapRef.current);
      heatLayerRef.current = heatLayer;

      // Wyśrodkuj mapę na punkty
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [points, radius, maxIntensity]);

  return (
    <div>
      <div id="geofence-heatmap" style={{ height, width: "100%", borderRadius: "8px" }} />

      {/* Legenda */}
      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">Intensywność:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "blue" }} />
          <span className="text-xs">Niska</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "lime" }} />
          <span className="text-xs">Średnia</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: "red" }} />
          <span className="text-xs">Wysoka</span>
        </div>
      </div>
    </div>
  );
}

