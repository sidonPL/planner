"use client";

import { useState, useCallback, useMemo } from "react";
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TripPlace {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isVisited: boolean;
  visitOrder: number | null;
}

interface TripMapViewProps {
  places: TripPlace[];
  tripName: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

const defaultCenter = {
  lat: 52.2297,  // Warsaw
  lng: 21.0122,
};

const categoryColors: Record<string, string> = {
  ATTRACTION: '#8B5CF6',  // purple
  RESTAURANT: '#10B981',  // green
  HOTEL: '#3B82F6',       // blue
  TRANSPORT: '#F59E0B',   // orange
  OTHER: '#6B7280',       // gray
};

export function TripMapView({ places }: TripMapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [selectedPlace, setSelectedPlace] = useState<TripPlace | null>(null);

  const center = useMemo(() => {
    const placesWithCoords = places.filter((p) => p.latitude && p.longitude);
    if (placesWithCoords.length === 0) {
      return defaultCenter;
    }

    const avgLat = placesWithCoords.reduce((sum, p) => sum + (p.latitude || 0), 0) / placesWithCoords.length;
    const avgLng = placesWithCoords.reduce((sum, p) => sum + (p.longitude || 0), 0) / placesWithCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [places]);

  const onLoad = useCallback((map: google.maps.Map) => {
    // Fit bounds to all markers
    const bounds = new window.google.maps.LatLngBounds();
    places.forEach(place => {
      if (place.latitude && place.longitude) {
        bounds.extend({ lat: place.latitude, lng: place.longitude });
      }
    });

    if (places.filter(p => p.latitude && p.longitude).length > 0) {
      map.fitBounds(bounds);
    }

  }, [places]);

  const onUnmount = useCallback(() => {}, []);

  const handleOptimizeRoute = () => {
    // TODO: Implement route optimization using Google Directions API
    alert('Route optimization coming soon!');
  };

  if (loadError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2" />
            <p>Nie udało się załadować mapy</p>
            <p className="text-sm mt-1">Sprawdź konfigurację Google Maps API</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Ładowanie mapy...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const placesWithCoords = places.filter(p => p.latitude && p.longitude);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa miejsc ({placesWithCoords.length})
          </CardTitle>
          {placesWithCoords.length > 1 && (
            <Button size="sm" onClick={handleOptimizeRoute}>
              <Navigation className="h-4 w-4 mr-2" />
              Optymalizuj trasę
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {placesWithCoords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak miejsc z współrzędnymi GPS</p>
            <p className="text-sm mt-1">Dodaj adresy do miejsc aby zobaczyć je na mapie</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={12}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {places.map((place) => {
              if (!place.latitude || !place.longitude) return null;

              const markerColor = categoryColors[place.category] || categoryColors.OTHER;

              return (
                <Marker
                  key={place.id}
                  position={{ lat: place.latitude, lng: place.longitude }}
                  onClick={() => setSelectedPlace(place)}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: markerColor,
                    fillOpacity: place.isVisited ? 0.4 : 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                  }}
                  label={{
                    text: place.visitOrder?.toString() || '',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
              );
            })}

            {selectedPlace && (
              <InfoWindow
                position={{
                  lat: selectedPlace.latitude!,
                  lng: selectedPlace.longitude!,
                }}
                onCloseClick={() => setSelectedPlace(null)}
              >
                <div className="p-2 max-w-xs">
                  <h3 className="font-semibold text-sm">{selectedPlace.name}</h3>
                  {selectedPlace.description && (
                    <p className="text-xs text-gray-600 mt-1">{selectedPlace.description}</p>
                  )}
                  {selectedPlace.address && (
                    <p className="text-xs text-gray-500 mt-1">{selectedPlace.address}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedPlace.category}
                    </Badge>
                    {selectedPlace.isVisited && (
                      <Badge variant="secondary" className="text-xs">
                        Odwiedzone
                      </Badge>
                    )}
                  </div>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        )}
      </CardContent>
    </Card>
  );
}
