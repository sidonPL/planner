import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Interfejsy dla danych pogodowych
interface ForecastDay {
  date: string;
  dateIso: string;
  tempMin: number;
  tempMax: number;
  description: string;
  icon: string;
  humidity: number;
}

interface HourlyForecastItem {
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
  sunrise?: number;
  sunset?: number;
  isDemo: boolean;
  forecast?: ForecastDay[];
  dailyAll?: ForecastDay[];
  hourly?: HourlyForecastItem[];
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

interface OpenWeatherMapResponse {
  main: {
    temp: number;
    temp_min: number;
    temp_max: number;
    feels_like: number;
    humidity: number;
  };
  wind: {
    speed: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  name: string;
  sys: {
    sunrise: number;
    sunset: number;
  };
}

interface ForecastListResponse {
  list: Array<{
    dt: number;
    main: {
      temp: number;
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      description: string;
      icon: string;
    }>;
  }>;
}

interface OpenWeatherErrorResponse {
  message?: string;
}

// Cache dla danych pogodowych (5 minut)
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatForecastDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pobierz ustawienia użytkownika
    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    const destination = request.nextUrl.searchParams.get("destination");

    const weatherLocationMode =
      ((settings as (typeof settings & { weatherLocationMode?: string }) | null)?.weatherLocationMode === "gps"
        ? "gps"
        : "city");

    const weatherLatitude =
      (settings as (typeof settings & { weatherLatitude?: number | null }) | null)?.weatherLatitude ?? null;
    const weatherLongitude =
      (settings as (typeof settings & { weatherLongitude?: number | null }) | null)?.weatherLongitude ?? null;

    const city = destination || settings?.weatherCity || "Warsaw";
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;
    const useGps = !destination && weatherLocationMode === "gps" && weatherLatitude !== null && weatherLongitude !== null;

    // Sprawdź cache
    const cacheKey = useGps
      ? `gps:${weatherLatitude},${weatherLongitude}`
      : `city:${city.toLowerCase()}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Jeśli nie ma API key, zwróć dane demo
    if (!apiKey) {
      const demoDailyAll: ForecastDay[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateIso = toLocalDateKey(d);
        return {
          date: formatForecastDate(d),
          dateIso,
          tempMin: Math.round(-1 + Math.random() * 6),
          tempMax: Math.round(4 + Math.random() * 9),
          description: ["Chmurnie", "Opad deszczu", "Pochmurnie", "Przejaśnienia", "Słonecznie"][i % 5],
          icon: ["03d", "10d", "04d", "02d", "01d"][i % 5],
          humidity: Math.round(60 + Math.random() * 30),
        };
      });

      const demoHourly: HourlyForecastItem[] = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setHours(d.getHours() + i * 3);
        return {
          time: d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
          dateIso: toLocalDateKey(d),
          temp: Math.round(2 + Math.random() * 12),
          description: ["Chmurnie", "Lekki deszcz", "Pochmurnie", "Przejaśnienia"][i % 4],
          icon: ["03d", "10d", "04d", "02d"][i % 4],
          humidity: Math.round(55 + Math.random() * 35),
        };
      });

      const demoData: WeatherData = {
        temperature: Math.round(5 + Math.random() * 10),
        dayTemperature: Math.round(7 + Math.random() * 8),
        nightTemperature: Math.round(-1 + Math.random() * 5),
        feelsLike: Math.round(2 + Math.random() * 8),
        humidity: Math.round(60 + Math.random() * 30),
        windSpeed: Math.round(10 + Math.random() * 20),
        description: "Częściowe zachmurzenie",
        icon: "03d",
        city: city,
        isDemo: true,
        forecast: demoDailyAll.slice(1, 6),
        dailyAll: demoDailyAll,
        hourly: demoHourly,
      };
      return NextResponse.json(demoData);
    }

    // Pobierz dane z OpenWeatherMap - weather endpoint + forecast dla prognozy
    let weatherUrl: string;
    let forecastUrl: string;
    
    if (useGps) {
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${weatherLatitude}&lon=${weatherLongitude}&appid=${apiKey}&units=metric&lang=pl`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${weatherLatitude}&lon=${weatherLongitude}&appid=${apiKey}&units=metric&lang=pl`;
    } else {
      // Najpierw pobierz koordinaty dla miasta
      const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
      const geoResponse = await fetch(geoUrl);
      
      if (!geoResponse.ok) {
        console.error("Geo API error:", geoResponse.status);
        return NextResponse.json(
          { error: "Nie znaleziono miasta" },
          { status: 404 }
        );
      }
      
      const geoData = await geoResponse.json() as Array<{ lat: number; lon: number; name: string }>;
      if (geoData.length === 0) {
        return NextResponse.json(
          { error: "Nie znaleziono miasta" },
          { status: 404 }
        );
      }
      
      const { lat, lon } = geoData[0];
      weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pl`;
      forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=pl`;
    }

    // Pobierz aktualne dane pogody
    const response = await fetch(weatherUrl);

    if (!response.ok) {
      const error = await response.json() as OpenWeatherErrorResponse;
      console.error("Weather API error:", error);
      return NextResponse.json(
        { error: error.message || "Nie udało się pobrać pogody" },
        { status: response.status }
      );
    }

    const data = await response.json() as OpenWeatherMapResponse;

    // Pobierz prognozę na kolejne dni
    let forecast: ForecastDay[] = [];
    let dailyAll: ForecastDay[] = [];
    let hourly: HourlyForecastItem[] = [];
    try {
      const forecastResponse = await fetch(forecastUrl);
      if (forecastResponse.ok) {
        const forecastData = await forecastResponse.json() as ForecastListResponse;
        
         // Pobierz prognozy dla każdego dnia (co 24 godziny w przybliżeniu)
         if (forecastData.list && Array.isArray(forecastData.list)) {
          const dailyForecasts: Record<string, ForecastListResponse["list"]> = {};
          const todayKey = toLocalDateKey(new Date());

          hourly = forecastData.list.slice(0, 16).map((item) => {
            const itemDate = new Date(item.dt * 1000);
            return {
              time: itemDate.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }),
              dateIso: toLocalDateKey(itemDate),
              temp: Math.round(item.main.temp),
              description: item.weather[0]?.description || "Brak danych",
              icon: item.weather[0]?.icon || "01d",
              humidity: item.main.humidity,
            };
          });
          
          // Grupuj prognozy po dniach
          forecastData.list.forEach((item) => {
            const itemDate = new Date(item.dt * 1000);
            const dateKey = toLocalDateKey(itemDate);
            if (!dailyForecasts[dateKey]) {
              dailyForecasts[dateKey] = [];
            }
            dailyForecasts[dateKey].push(item);
          });
          
          dailyAll = Object.entries(dailyForecasts)
            .slice(0, 6)
            .map(([dateStr, items]) => {
              const midItem = items[Math.floor(items.length / 2)];
              return {
                date: formatForecastDate(new Date(midItem.dt * 1000)),
                dateIso: dateStr,
                tempMin: Math.round(Math.min(...items.map((i) => i.main.temp_min))),
                tempMax: Math.round(Math.max(...items.map((i) => i.main.temp_max))),
                description: midItem.weather[0]?.description || "Brak danych",
                icon: midItem.weather[0]?.icon || "01d",
                humidity: Math.round(items.reduce((sum, i) => sum + i.main.humidity, 0) / items.length),
              };
            });

          // Kompatybilność: dashboard oczekuje, że forecast zaczyna się od jutra.
          forecast = dailyAll
            .filter((day) => day.dateIso !== todayKey)
            .slice(0, 5);
        }
       }
    } catch (forecastError) {
      console.error("Forecast fetch error:", forecastError);
      // Kontynuuj bez prognozy jeśli się nie uda
    }

    const weatherData: WeatherData = {
      temperature: Math.round(data.main.temp),
      dayTemperature: Math.round(data.main.temp_max),
      nightTemperature: Math.round(data.main.temp_min),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s -> km/h
      description: data.weather[0]?.description || 'Brak danych',
      icon: data.weather[0]?.icon || '01d',
      city: useGps ? `${data.name} (GPS)` : data.name,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      isDemo: false,
      forecast: forecast.length > 0 ? forecast : undefined,
      dailyAll: dailyAll.length > 0 ? dailyAll : undefined,
      hourly: hourly.length > 0 ? hourly : undefined,
    };

    // Zapisz w cache
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error("Error fetching weather:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać danych pogodowych" },
      { status: 500 }
    );
  }
}
