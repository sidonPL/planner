'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Gauge, Car, Bike, Footprints } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  visitOrder: number;
}

interface RouteInfo {
  distance: number; // w metrach
  duration: number; // w sekundach
  steps: RouteStep[];
}

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface TripNavigationPanelProps {
  places: Place[];
  className?: string;
}

export function TripNavigationPanel({ places, className }: TripNavigationPanelProps) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [transportMode, setTransportMode] = useState<'driving' | 'cycling' | 'walking'>('driving');

  const sortedPlaces = [...places].sort((a, b) => a.visitOrder - b.visitOrder);

  const calculateRoute = async (mode: 'driving' | 'cycling' | 'walking' = 'driving') => {
    if (sortedPlaces.length < 2) return;

    setLoading(true);
    setTransportMode(mode);

    try {
      // Build coordinates string
      const coordinates = sortedPlaces
        .map((p) => `${p.longitude},${p.latitude}`)
        .join(';');

      // OSRM API
      const profile = mode === 'driving' ? 'car' : mode === 'cycling' ? 'bike' : 'foot';
      const url = `https://router.project-osrm.org/route/v1/${profile}/${coordinates}?overview=full&steps=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        // Extract steps from all legs
        const allSteps: RouteStep[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        route.legs.forEach((leg: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leg.steps.forEach((step: any) => {
            allSteps.push({
              instruction: step.maneuver.modifier
                ? `${step.maneuver.type} ${step.maneuver.modifier}`
                : step.maneuver.type,
              distance: step.distance,
              duration: step.duration,
            });
          });
        });

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          steps: allSteps,
        });
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sortedPlaces.length >= 2) {
      calculateRoute('driving');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedPlaces.length]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  if (sortedPlaces.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Dodaj miejsca do wycieczki aby zobaczyć trasę</p>
        </CardContent>
      </Card>
    );
  }

  if (sortedPlaces.length === 1) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Miejsce docelowe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-semibold">{sortedPlaces[0].name}</p>
            {sortedPlaces[0].address && (
              <p className="text-sm text-muted-foreground">{sortedPlaces[0].address}</p>
            )}
            <p className="text-sm text-muted-foreground">
              📍 {sortedPlaces[0].latitude.toFixed(6)}, {sortedPlaces[0].longitude.toFixed(6)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Nawigacja
        </CardTitle>
        <CardDescription>
          Trasa przez {sortedPlaces.length} miejsc
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transport Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={transportMode === 'driving' ? 'default' : 'outline'}
            size="sm"
            onClick={() => calculateRoute('driving')}
            disabled={loading}
          >
            <Car className="h-4 w-4 mr-1" />
            Auto
          </Button>
          <Button
            variant={transportMode === 'cycling' ? 'default' : 'outline'}
            size="sm"
            onClick={() => calculateRoute('cycling')}
            disabled={loading}
          >
            <Bike className="h-4 w-4 mr-1" />
            Rower
          </Button>
          <Button
            variant={transportMode === 'walking' ? 'default' : 'outline'}
            size="sm"
            onClick={() => calculateRoute('walking')}
            disabled={loading}
          >
            <Footprints className="h-4 w-4 mr-1" />
            Pieszo
          </Button>
        </div>

        {/* Route Summary */}
        {routeInfo && !loading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Gauge className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Dystans</p>
                <p className="font-semibold">{formatDistance(routeInfo.distance)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Czas</p>
                <p className="font-semibold">{formatDuration(routeInfo.duration)}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Obliczam trasę...
          </div>
        )}

        {/* Tabs for Places and Directions */}
        <Tabs defaultValue="places" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="places">
              Miejsca ({sortedPlaces.length})
            </TabsTrigger>
            <TabsTrigger value="directions">
              Instrukcje
            </TabsTrigger>
          </TabsList>

          <TabsContent value="places">
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {sortedPlaces.map((place, index) => (
                  <div
                    key={place.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                  >
                    <Badge className="mt-1">
                      {index + 1}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-semibold">{place.name}</p>
                      {place.address && (
                        <p className="text-sm text-muted-foreground">{place.address}</p>
                      )}
                    </div>
                    {index < sortedPlaces.length - 1 && routeInfo && (
                      <div className="text-xs text-muted-foreground text-right">
                        <p>↓</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="directions">
            {routeInfo ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {routeInfo.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted"
                    >
                      <Badge variant="outline" className="mt-1">
                        {index + 1}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm">{step.instruction}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistance(step.distance)} • {formatDuration(step.duration)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {loading ? 'Obliczam instrukcje...' : 'Wybierz sposób transportu'}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

