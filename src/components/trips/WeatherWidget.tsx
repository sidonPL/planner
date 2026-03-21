"use client";

import { useState, useEffect, useMemo } from "react";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets, ChevronDown, ChevronUp, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ForecastDay {
  date: string;
  dateIso?: string;
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
  temp: number;
  currentTemp?: number;
  primaryDateLabel?: string;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  forecast?: ForecastDay[];
  dailyAll?: ForecastDay[];
  hourly?: HourlyForecast[];
}

interface OneCallDailyItem {
  dt: number;
  temp: {
    min: number;
    max: number;
  };
  humidity: number;
  weather?: Array<{
    description?: string;
    icon?: string;
  }>;
}

interface WeatherWidgetProps {
  destination: string;
  startDate: Date;
  endDate: Date;
}

export function WeatherWidget({ destination, startDate, endDate }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showHourly, setShowHourly] = useState(false);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [accent, setAccent] = useState<"default" | "ocean" | "sunset">("default");
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const tripDurationDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const tripDateKeys = useMemo(() => {
    const keys: string[] = [];
    const cursor = new Date(startDate);
    const end = new Date(endDate);
    cursor.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    while (cursor <= end) {
      keys.push(toLocalDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return keys;
  }, [startDate, endDate]);

  const primaryDateKey = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    if (tripDateKeys.includes(todayKey)) {
      return todayKey;
    }
    return tripDateKeys[0] ?? todayKey;
  }, [tripDateKeys]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("trip-weather-widget-prefs");
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        density?: "compact" | "comfortable";
        accent?: "default" | "ocean" | "sunset";
      };
      if (parsed.density === "compact" || parsed.density === "comfortable") {
        setDensity(parsed.density);
      }
      if (parsed.accent === "default" || parsed.accent === "ocean" || parsed.accent === "sunset") {
        setAccent(parsed.accent);
      }
    } catch {
      // Ignoruj błędy localStorage, widżet działa na wartościach domyślnych.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("trip-weather-widget-prefs", JSON.stringify({ density, accent }));
  }, [density, accent]);

  useEffect(() => {
    if (!destination) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(`/api/weather?destination=${encodeURIComponent(destination)}`);

        if (!response.ok) {
          throw new Error('Weather fetch failed');
        }

        const data = await response.json();

        // Transform API response to our format
        if (data.current) {
          // OpenWeatherMap OneCall API format
          setWeather({
            temp: Math.round(data.current.temp),
            description: data.current.weather[0]?.description || 'Brak danych',
            icon: data.current.weather[0]?.icon || '01d',
            humidity: data.current.humidity,
            windSpeed: Math.round(data.current.wind_speed * 3.6), // m/s to km/h
            forecast: Array.isArray(data.daily)
              ? (data.daily as OneCallDailyItem[])
                  .map((day) => {
                    const dayDate = new Date(day.dt * 1000);
                    return {
                      date: dayDate.toLocaleDateString("pl-PL", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      }),
                      dateIso: toLocalDateKey(dayDate),
                      tempMin: Math.round(day.temp.min),
                      tempMax: Math.round(day.temp.max),
                      description: day.weather?.[0]?.description || "Brak danych",
                      icon: day.weather?.[0]?.icon || "01d",
                      humidity: day.humidity,
                    };
                  })
                  .filter((day) => tripDateKeys.includes(day.dateIso!))
                  .slice(0, tripDurationDays)
                  .map((day) => ({
                    date: day.date,
                    dateIso: day.dateIso,
                    tempMin: day.tempMin,
                    tempMax: day.tempMax,
                    description: day.description,
                    icon: day.icon,
                    humidity: day.humidity,
                  }))
              : undefined,
          });
        } else if (data.temperature !== undefined) {
          // Our custom format (from existing endpoint)
          const mappedForecast: ForecastDay[] = Array.isArray(data.forecast)
            ? (data.forecast as ForecastDay[])
            : [];

          const tripForecast = mappedForecast.filter((day) =>
            day.dateIso ? tripDateKeys.includes(day.dateIso) : false
          );

          const fallbackForecast = mappedForecast.slice(0, tripDurationDays);

          const mappedDailyAll: ForecastDay[] = Array.isArray(data.dailyAll)
            ? (data.dailyAll as ForecastDay[])
            : [];
          const tripDailyAll = mappedDailyAll.filter((day) =>
            day.dateIso ? tripDateKeys.includes(day.dateIso) : false
          );
          const primaryDay = tripDailyAll.find((day) => day.dateIso === primaryDateKey);

          const mappedHourly: HourlyForecast[] = Array.isArray(data.hourly)
            ? (data.hourly as HourlyForecast[])
            : [];
          const tripHourly = mappedHourly.filter((hour) => hour.dateIso === primaryDateKey);

          setWeather({
            temp: primaryDay ? Math.round((primaryDay.tempMin + primaryDay.tempMax) / 2) : data.temperature,
            currentTemp: data.temperature,
            primaryDateLabel: primaryDay?.date,
            description: primaryDay?.description || data.description,
            icon: primaryDay?.icon || data.icon,
            humidity: primaryDay?.humidity ?? data.humidity,
            windSpeed: data.windSpeed,
            forecast: (tripForecast.length > 0 ? tripForecast : fallbackForecast).slice(0, tripDurationDays),
            dailyAll: tripDailyAll.length > 0 ? tripDailyAll : undefined,
            hourly: tripHourly.length > 0 ? tripHourly.slice(0, 8) : mappedHourly.slice(0, 8),
          });
        }

        setLoading(false);
      } catch (err) {
        console.error("Weather fetch error:", err);
        setError(true);
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination, tripDurationDays, tripDateKeys, primaryDateKey]);

  const getWeatherIcon = (iconCode: string) => {
    if (iconCode.startsWith("01")) return <Sun className="h-6 w-6 text-yellow-500" />;
    if (iconCode.startsWith("02") || iconCode.startsWith("03")) return <Cloud className="h-6 w-6 text-gray-500" />;
    if (iconCode.startsWith("09") || iconCode.startsWith("10")) return <CloudRain className="h-6 w-6 text-blue-500" />;
    if (iconCode.startsWith("13")) return <CloudSnow className="h-6 w-6 text-cyan-300" />;
    return <Sun className="h-6 w-6 text-yellow-500" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Cloud className="h-6 w-6 animate-pulse text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ładowanie pogody...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weather) {
    return null; // Don't show widget if error
  }

  const accentClass =
    accent === "ocean"
      ? "border-cyan-300/40 bg-cyan-50/40 dark:bg-cyan-950/20"
      : accent === "sunset"
        ? "border-orange-300/40 bg-orange-50/40 dark:bg-orange-950/20"
        : "";

  return (
    <Card className={accentClass}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {getWeatherIcon(weather.icon)}
            Pogoda w {destination}
          </CardTitle>
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
      </CardHeader>
      <CardContent className={density === "compact" ? "space-y-2" : "space-y-3"}>
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

        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold">{weather.temp}°C</span>
          <Badge variant="outline">{weather.description}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {weather.primaryDateLabel ? `Główna pogoda dla: ${weather.primaryDateLabel}` : "Główna pogoda dla dnia wyjazdu"}
          {typeof weather.currentTemp === "number" ? ` (teraz: ${weather.currentTemp}°C)` : ""}
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Droplets className="h-4 w-4" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="h-4 w-4" />
            <span>{weather.windSpeed} km/h</span>
          </div>
        </div>

        {/* Prognoza */}
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-auto p-2"
              onClick={() => setShowForecast(!showForecast)}
            >
              <span className="text-xs font-medium">Prognoza na kolejne dni</span>
              {showForecast ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showForecast && (
              <div className="space-y-2">
                {weather.forecast.map((day, index) => (
                  <div key={index} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 flex-1">
                      {getWeatherIcon(day.icon)}
                      <div className="min-w-fit">
                        <p className="font-medium">{day.date}</p>
                        <p className="text-muted-foreground capitalize">{day.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{day.tempMax}°C / {day.tempMin}°C</p>
                      <p className="text-muted-foreground flex items-center gap-1 justify-end">
                        <Droplets className="h-3 w-3" />
                        {day.humidity}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {weather.hourly && weather.hourly.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between h-auto p-2"
              onClick={() => setShowHourly((prev) => !prev)}
            >
              <span className="text-xs font-medium">Prognoza godzinowa</span>
              {showHourly ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {showHourly && (
              <div className="grid grid-cols-2 gap-2">
                {weather.hourly.map((hour, index) => (
                  <div key={`${hour.time}-${index}`} className="rounded-md bg-muted/40 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{hour.time}</span>
                      <span>{hour.temp}°C</span>
                    </div>
                    <p className="text-muted-foreground capitalize truncate">{hour.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Zabierz lekką kurtkę - możliwa mgła
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
