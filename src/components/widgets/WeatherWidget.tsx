"use client";

import { useEffect, useState, useCallback } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, RefreshCw, MapPin, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  humidity: number;
}

interface HourlyForecast {
  time: string;
  dateIso: string;
  temp: number;
  description: string;
  icon: string;
  humidity: number;
}

interface WeatherData {
  temperature: number;
  dayTemperature?: number;
  nightTemperature?: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city: string;
  isDemo?: boolean;
  forecast?: ForecastDay[];
  hourly?: HourlyForecast[];
}

type WidgetDensity = "compact" | "comfortable";
type WidgetAccent = "default" | "ocean" | "sunset";

function getInitialWidgetPrefs(): { density: WidgetDensity; accent: WidgetAccent } {
  if (typeof window === "undefined") {
    return { density: "comfortable", accent: "default" };
  }

  try {
    const raw = window.localStorage.getItem("dashboard-weather-widget-prefs");
    if (!raw) {
      return { density: "comfortable", accent: "default" };
    }

    const parsed = JSON.parse(raw) as { density?: WidgetDensity; accent?: WidgetAccent };
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      accent: parsed.accent === "ocean" || parsed.accent === "sunset" ? parsed.accent : "default",
    };
  } catch {
    return { density: "comfortable", accent: "default" };
  }
}

const weatherIcons: Record<string, React.ElementType> = {
  "01d": Sun,
  "01n": Sun,
  "02d": Cloud,
  "02n": Cloud,
  "03d": Cloud,
  "03n": Cloud,
  "04d": Cloud,
  "04n": Cloud,
  "09d": CloudRain,
  "09n": CloudRain,
  "10d": CloudRain,
  "10n": CloudRain,
  "11d": CloudRain,
  "11n": CloudRain,
  "13d": CloudSnow,
  "13n": CloudSnow,
  "50d": Wind,
  "50n": Wind,
};

export function WeatherWidget() {
  const initialPrefs = getInitialWidgetPrefs();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [selectedForecastIndex, setSelectedForecastIndex] = useState(0);
  const [showHourly, setShowHourly] = useState(false);
  const [showAllHourly, setShowAllHourly] = useState(false);
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [density, setDensity] = useState<WidgetDensity>(initialPrefs.density);
  const [accent, setAccent] = useState<WidgetAccent>(initialPrefs.accent);

  // Aktualizuj czas co sekundę
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Pobierz pogodę z naszego API
  const fetchWeather = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    
    try {
      const response = await fetch("/api/weather");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nie udało się pobrać pogody");
      }

      const data = await response.json();
      setWeather(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać pogody");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather();

    // Odświeżaj pogodę co 10 minut
    const interval = setInterval(() => fetchWeather(), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  useEffect(() => {
    window.localStorage.setItem("dashboard-weather-widget-prefs", JSON.stringify({ density, accent }));
  }, [density, accent]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatHourlyDay = (dateIso: string) => {
    const targetDate = new Date(`${dateIso}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) {
      return dateIso;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const toDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const targetKey = toDateKey(targetDate);
    if (targetKey === toDateKey(today)) return "Dzisiaj";
    if (targetKey === toDateKey(tomorrow)) return "Jutro";

    return targetDate.toLocaleDateString("pl-PL", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const WeatherIcon = weather ? weatherIcons[weather.icon] || Cloud : Cloud;
  const selectedForecastDay = weather?.forecast?.[selectedForecastIndex] ?? null;
  
  const getForecastLabel = (index: number, rawDate: string) => {
    if (index === 0) return "Jutro";
    if (index === 1) return "Pojutrze";
    return rawDate;
  };

  useEffect(() => {
    if (!weather?.forecast?.length) {
      setSelectedForecastIndex(0);
      return;
    }

    if (selectedForecastIndex >= weather.forecast.length) {
      setSelectedForecastIndex(0);
    }
  }, [weather?.forecast, selectedForecastIndex]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <Cloud className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchWeather(true)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    );
  }

  const accentClass =
    accent === "ocean"
      ? "border-cyan-300/40 bg-cyan-50/40 dark:bg-cyan-950/20"
      : accent === "sunset"
        ? "border-orange-300/40 bg-orange-50/40 dark:bg-orange-950/20"
        : "";

  const hourlyItems = weather?.hourly?.slice(0, showAllHourly ? 16 : 12) ?? [];
  const hourlyGroups = hourlyItems.reduce<Record<string, HourlyForecast[]>>((acc, item) => {
    if (!acc[item.dateIso]) {
      acc[item.dateIso] = [];
    }
    acc[item.dateIso].push(item);
    return acc;
  }, {});
  const orderedHourlyDays = Object.keys(hourlyGroups).sort();

  return (
    <Card className={`overflow-hidden ${accentClass}`}>
      <CardContent className="p-0">
        {/* Czas i data */}
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-4">
          <div className="text-4xl font-bold tabular-nums">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm opacity-90 capitalize">
            {formatDate(currentTime)}
          </div>
        </div>

        {/* Pogoda */}
        {weather && (
          <div className={density === "compact" ? "p-3 space-y-2" : "p-4 space-y-3"}>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowStyleOptions((prev) => !prev)}
                aria-label="Dostosuj wygląd widgetu pogody"
              >
                <Palette className="h-4 w-4" />
              </Button>
            </div>

            {showStyleOptions && (
              <div className="rounded-md border bg-muted/40 p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-24">Układ</span>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant={density === "comfortable" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setDensity("comfortable")}>
                      Wygodny
                    </Button>
                    <Button type="button" size="sm" variant={density === "compact" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setDensity("compact")}>
                      Kompakt
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground min-w-24">Motyw</span>
                  <div className="flex gap-1">
                    <Button type="button" size="sm" variant={accent === "default" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAccent("default")}>
                      Domyślny
                    </Button>
                    <Button type="button" size="sm" variant={accent === "ocean" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAccent("ocean")}>
                      Ocean
                    </Button>
                    <Button type="button" size="sm" variant={accent === "sunset" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAccent("sunset")}>
                      Sunset
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <WeatherIcon className="h-8 w-8 text-primary" />
                  <span className="text-3xl font-bold">{weather.temperature}°C</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Dzień: {weather.dayTemperature ?? weather.temperature}°</Badge>
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Noc: {weather.nightTemperature ?? weather.temperature}°</Badge>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {weather.description}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  {weather.city}
                  {weather.isDemo && (
                    <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                      Demo
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mb-2"
                  onClick={() => fetchWeather(true)}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1 justify-end">
                    <Thermometer className="h-3 w-3" />
                    {weather.feelsLike}°C
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Droplets className="h-3 w-3" />
                    {weather.humidity}%
                  </div>
                  <div className="flex items-center gap-1 justify-end">
                    <Wind className="h-3 w-3" />
                    {weather.windSpeed} km/h
                  </div>
                </div>
              </div>
            </div>

            {weather.forecast && weather.forecast.length > 0 && (
              <div className="pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-between px-2 text-xs"
                  onClick={() => {
                    setShowForecast((prev) => !prev);
                    setSelectedForecastIndex(0);
                  }}
                >
                  <span>Prognoza na kolejne dni</span>
                  {showForecast ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>

                {showForecast && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {weather.forecast.slice(0, 5).map((day, index) => {
                        const isActive = selectedForecastIndex === index;
                        return (
                          <Button
                            key={`${day.date}-${index}`}
                            type="button"
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="h-auto min-w-[90px] flex-col items-start px-2 py-1 text-left"
                            onClick={() => setSelectedForecastIndex(index)}
                          >
                            <span className="text-[10px] opacity-80">{getForecastLabel(index, day.date)}</span>
                            <span className="text-xs font-medium truncate w-full">{day.date}</span>
                          </Button>
                         );
                       })}
                    </div>

                    {selectedForecastDay && (
                      <div className="rounded-md border bg-muted/40 p-2.5 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{selectedForecastDay.date}</p>
                            <p className="text-muted-foreground capitalize truncate">{selectedForecastDay.description}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold">{selectedForecastDay.tempMax}° / {selectedForecastDay.tempMin}°</p>
                            <p className="text-muted-foreground">Wilg. {selectedForecastDay.humidity}%</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                          {(() => {
                            const SelectedIcon = weatherIcons[selectedForecastDay.icon] || Cloud;
                            return <SelectedIcon className="h-4 w-4 text-primary" />;
                          })()}
                          <span>
                            Amplituda: {selectedForecastDay.tempMax - selectedForecastDay.tempMin}°C
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {hourlyItems.length > 0 && (
              <div className="pt-2 border-t space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full justify-between px-2 text-xs"
                  onClick={() => setShowHourly((prev) => !prev)}
                >
                  <span>Prognoza godzinowa</span>
                  {showHourly ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>

                {showHourly && (
                  <div className="space-y-2">
                    <div className="space-y-2">
                      {orderedHourlyDays.map((dayKey) => (
                        <div key={dayKey} className="rounded-md border bg-muted/20 p-2">
                          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                            {formatHourlyDay(dayKey)}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {hourlyGroups[dayKey].map((hour, index) => (
                              <div key={`${dayKey}-${hour.time}-${index}`} className="rounded-md bg-muted/40 p-2 text-xs">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium">{hour.time}</span>
                                  <span>{hour.temp}°C</span>
                                </div>
                                <p className="text-muted-foreground capitalize truncate">{hour.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {(weather?.hourly?.length ?? 0) > 12 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 w-full text-xs"
                        onClick={() => setShowAllHourly((prev) => !prev)}
                      >
                        {showAllHourly ? "Pokaż mniej godzin" : "Pokaż więcej godzin"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {(!weather.forecast || weather.forecast.length === 0) && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Prognoza na kolejne dni jest chwilowo niedostępna. Sprawdź klucz OpenWeather i odśwież widget.
                </p>
              </div>
            )}

            {weather.isDemo && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                💡 Skonfiguruj miasto w <a href="/settings" className="text-primary hover:underline">Ustawieniach</a> aby zobaczyć prawdziwą pogodę
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
