"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";

// Dynamiczny import heatmap (Leaflet wymaga window)
const GeofenceHeatmap = dynamic(
  () => import("@/components/GeofenceHeatmap").then((mod) => ({ default: mod.GeofenceHeatmap })),
  { ssr: false, loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" /> }
);

interface HeatmapData {
  points: Array<{
    latitude: number;
    longitude: number;
    intensity: number;
    count: number;
  }>;
  totalEvents: number;
  uniqueLocations: number;
  maxCount: number;
  periodDays: number;
}

export function HeatmapClient() {
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/geofence/heatmap?days=${days}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        toast.error("Nie udało się pobrać danych");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Heatmap Ruchu</h1>
        <p className="text-muted-foreground mt-2">
          Wizualizacja miejsc gdzie spędzasz najwięcej czasu
        </p>
      </div>

      {/* Filtry */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Okres czasu</Label>
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Ostatnie 7 dni</SelectItem>
                  <SelectItem value="14">Ostatnie 14 dni</SelectItem>
                  <SelectItem value="30">Ostatnie 30 dni</SelectItem>
                  <SelectItem value="90">Ostatnie 3 miesiące</SelectItem>
                  <SelectItem value="180">Ostatnie 6 miesięcy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki */}
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Łączne Wydarzenia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                w ciągu {data.periodDays} dni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unikalne Lokalizacje</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.uniqueLocations}</div>
              <p className="text-xs text-muted-foreground">
                różnych miejsc
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Najczęstsza Lokalizacja</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.maxCount}</div>
              <p className="text-xs text-muted-foreground">
                wydarzeń w tym samym miejscu
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mapa Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa Ciepła
          </CardTitle>
          <CardDescription>
            Im ciemlejszy kolor, tym więcej czasu spędzasz w danym miejscu
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[500px] bg-muted animate-pulse rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Ładowanie...</p>
            </div>
          ) : data && data.points.length > 0 ? (
            <GeofenceHeatmap
              points={data.points}
              height="500px"
              radius={30}
              maxIntensity={1.0}
            />
          ) : (
            <div className="h-[500px] border-2 border-dashed rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Brak danych</h3>
                <p className="text-muted-foreground">
                  Nie znaleziono wydarzeń geofencing w wybranym okresie
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informacje */}
      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">💡 Jak działa heatmap?</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>
              • <strong>Niebieskie obszary</strong> - odwiedzane rzadko
            </li>
            <li>
              • <strong>Zielone/żółte obszary</strong> - odwiedzane średnio często
            </li>
            <li>
              • <strong>Czerwone obszary</strong> - najczęściej odwiedzane miejsca
            </li>
            <li>
              • Dane oparte na historii wydarzeń geofencing (wejścia/wyjścia ze stref)
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
