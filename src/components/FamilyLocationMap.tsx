"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface FamilyMember {
  id: string;
  name: string | null;
  color: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
}

interface FamilyLocationMapProps {
  members: FamilyMember[];
  height?: string;
}

export function FamilyLocationMap({ members, height = "400px" }: FamilyLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Inicjalizacja mapy
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("family-location-map", {
        center: [52.229676, 21.012229], // Warszawa domyślnie
        zoom: 13,
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
  }, []);

  // Aktualizacja markerów
  useEffect(() => {
    if (!mapRef.current) return;

    // Usuń stare markery
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Dodaj nowe markery
    if (members.length > 0) {
      members.forEach((member) => {
        // Kolor markera na podstawie koloru użytkownika
        const iconColor = member.color || "#3B82F6";

        const icon = L.divIcon({
          className: "custom-marker",
          html: `
            <div style="
              width: 30px;
              height: 30px;
              background-color: ${iconColor};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 14px;
            ">
              ${(member.name || "?")[0].toUpperCase()}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
        });

        const marker = L.marker([member.latitude, member.longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="text-align: center;">
              <strong>${member.name || "Nieznany"}</strong><br/>
              <small>${new Date(member.lastUpdate).toLocaleString("pl-PL")}</small>
            </div>
          `);

        markersRef.current.set(member.id, marker);
      });

      // Wyśrodkuj mapę na wszystkich użytkowników
      const bounds = L.latLngBounds(members.map((m) => [m.latitude, m.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [members]);

  return (
    <div>
      <div id="family-location-map" style={{ height, width: "100%", borderRadius: "8px" }} />
    </div>
  );
}

