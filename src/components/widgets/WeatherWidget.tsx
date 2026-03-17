"use client";

import { useEffect, useState, useCallback } from "react";
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, RefreshCw, Settings, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  city: string;
  isDemo?: boolean;
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
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const WeatherIcon = weather ? weatherIcons[weather.icon] || Cloud : Cloud;

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

  return (
    <Card className="overflow-hidden">
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
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <WeatherIcon className="h-8 w-8 text-primary" />
                  <span className="text-3xl font-bold">{weather.temperature}°C</span>
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

