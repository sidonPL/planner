"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix dla ikon Leaflet w Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
  color: string | null;
}

interface GeofenceMapProps {
  zones: Zone[];
  currentLocation?: { latitude: number; longitude: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
  selectedZoneId?: string | null;
  height?: string;
}

export function GeofenceMap({
  zones,
  currentLocation,
  onMapClick,
  selectedZoneId,
  height = "500px",
}: GeofenceMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circlesRef = useRef<L.Circle[]>([]);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  // Inicjalizacja mapy
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("geofence-map", {
        center: [52.229676, 21.012229], // Warszawa jako domyślna
        zoom: 13,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // Event click na mapie
      if (onMapClick) {
        map.on("click", (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;
    }

    return () => {
      // Cleanup przy unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapClick]);

  // Aktualizacja stref
  useEffect(() => {
    if (!mapRef.current) return;

    // Usuń stare markery i okręgi
    markersRef.current.forEach((m) => m.remove());
    circlesRef.current.forEach((c) => c.remove());
    markersRef.current = [];
    circlesRef.current = [];

    // Dodaj strefy
    zones.forEach((zone) => {
      const color = zone.color || getZoneColor(zone.type);
      const isSelected = selectedZoneId === zone.id;

      // Okrąg reprezentujący strefę
      const circle = L.circle([zone.latitude, zone.longitude], {
        color: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.3 : 0.15,
        radius: zone.radius,
        weight: isSelected ? 3 : 2,
      }).addTo(mapRef.current!);

      // Marker z nazwą
      const marker = L.marker([zone.latitude, zone.longitude])
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="text-align: center;">
            <strong>${zone.name}</strong><br/>
            <span style="color: ${color};">● ${getZoneTypeLabel(zone.type)}</span><br/>
            Promień: ${zone.radius}m
          </div>`
        );

      if (isSelected) {
        marker.openPopup();
      }

      markersRef.current.push(marker);
      circlesRef.current.push(circle);
    });

    // Wyśrodkuj mapę jeśli są strefy
    if (zones.length > 0) {
      const bounds = L.latLngBounds(zones.map((z) => [z.latitude, z.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [zones, selectedZoneId]);

  // Aktualizacja aktualnej lokalizacji
  useEffect(() => {
    if (!mapRef.current) return;

    // Usuń stary marker lokalizacji
    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.remove();
      currentLocationMarkerRef.current = null;
    }

    // Dodaj nowy marker lokalizacji
    if (currentLocation) {
      const icon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      currentLocationMarkerRef.current = L.marker([currentLocation.latitude, currentLocation.longitude], { icon })
        .addTo(mapRef.current!)
        .bindPopup("<strong>Twoja lokalizacja</strong>");

      // Wyśrodkuj na lokalizacji
      mapRef.current.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  }, [currentLocation]);

  return <div id="geofence-map" style={{ height, width: "100%", borderRadius: "8px" }} />;
}

// Pomocnicze funkcje
function getZoneColor(type: string): string {
  const colors: Record<string, string> = {
    HOME: "#10B981",
    WORK: "#3B82F6",
    SCHOOL: "#F59E0B",
    OTHER: "#6B7280",
  };
  return colors[type] || colors.OTHER;
}

function getZoneTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    HOME: "Dom",
    WORK: "Praca",
    SCHOOL: "Szkoła",
    OTHER: "Inne",
  };
  return labels[type] || labels.OTHER;
}

