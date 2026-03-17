/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

// Fix default marker icons
// @ts-expect-error - Leaflet internal API
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  visitOrder: number;
}

interface TripRouteMapProps {
  places: Place[];
  className?: string;
}

export function TripRouteMap({ places, className = 'h-[500px] w-full' }: TripRouteMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const routingControlRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Sortuj miejsca po visitOrder
    const sortedPlaces = [...places].sort((a, b) => a.visitOrder - b.visitOrder);

    if (sortedPlaces.length === 0) return;

    // Inicjalizuj mapę
    const map = L.map(mapContainerRef.current).setView(
      [sortedPlaces[0].latitude, sortedPlaces[0].longitude],
      13
    );

    mapRef.current = map;

    // Dodaj tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Jeśli jest więcej niż 1 miejsce, dodaj routing
    if (sortedPlaces.length > 1) {
      const waypoints = sortedPlaces.map((place) =>
        L.latLng(place.latitude, place.longitude)
      );


      const routingControl = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        showAlternatives: true,
        fitSelectedRoutes: true,
        lineOptions: {
          styles: [
            { color: '#3B82F6', opacity: 0.8, weight: 6 },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        altLineOptions: {
          styles: [
            { color: '#9CA3AF', opacity: 0.5, weight: 4 },
          ],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        router: new (L.Routing as any).OSRMv1({
          serviceUrl: 'https://router.project-osrm.org/route/v1',
          profile: 'driving', // car, bike, foot
        }),
      } as any).addTo(map);

      routingControlRef.current = routingControl;

      // Event listeners
      routingControl.on('routesfound', function (e: any) {
        const routes = e.routes;
        const summary = routes[0].summary;

        console.log('Route found:', {
          distance: (summary.totalDistance / 1000).toFixed(2) + ' km',
          time: Math.round(summary.totalTime / 60) + ' min',
        });
      });

      routingControl.on('routingerror', function (e: any) {
        console.error('Routing error:', e);
      });
    } else {
      // Tylko 1 miejsce - dodaj marker
      const place = sortedPlaces[0];
      L.marker([place.latitude, place.longitude])
        .addTo(map)
        .bindPopup(`<strong>${place.name}</strong><br/>${place.address || ''}`)
        .openPopup();
    }

    // Cleanup
    return () => {
      if (routingControlRef.current && mapRef.current) {
        mapRef.current.removeControl(routingControlRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [places]);

  // Update route when places change
  useEffect(() => {
    if (!mapRef.current || !routingControlRef.current) return;

    const sortedPlaces = [...places].sort((a, b) => a.visitOrder - b.visitOrder);

    if (sortedPlaces.length > 1) {
      const waypoints = sortedPlaces.map((place) =>
        L.latLng(place.latitude, place.longitude)
      );

      routingControlRef.current.setWaypoints(waypoints);
    }
  }, [places]);

  return (
    <div ref={mapContainerRef} className={className} />
  );
}

