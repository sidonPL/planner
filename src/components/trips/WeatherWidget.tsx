"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, CloudSnow, Wind, Droplets } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
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
          });
        } else if (data.temperature !== undefined) {
          // Our custom format (from existing endpoint)
          setWeather({
            temp: data.temperature,
            description: data.description,
            icon: data.icon,
            humidity: data.humidity,
            windSpeed: data.windSpeed,
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
  }, [destination]);

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {getWeatherIcon(weather.icon)}
          Pogoda w {destination}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold">{weather.temp}°C</span>
          <Badge variant="outline">{weather.description}</Badge>
        </div>
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
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Zabierz lekką kurtkę - możliwa mgła
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
