import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Cache dla danych pogodowych (5 minut)
const weatherCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minut

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

    const city = settings?.weatherCity || "Warsaw";
    const apiKey = settings?.weatherApiKey || process.env.OPENWEATHERMAP_API_KEY;

    // Sprawdź cache
    const cacheKey = city.toLowerCase();
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Jeśli nie ma API key, zwróć dane demo
    if (!apiKey) {
      const demoData = {
        temperature: Math.round(5 + Math.random() * 10),
        feelsLike: Math.round(2 + Math.random() * 8),
        humidity: Math.round(60 + Math.random() * 30),
        windSpeed: Math.round(10 + Math.random() * 20),
        description: "Częściowe zachmurzenie",
        icon: "03d",
        city: city,
        isDemo: true,
      };
      return NextResponse.json(demoData);
    }

    // Pobierz dane z OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pl`
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || "Nie udało się pobrać pogody" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const weatherData = {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // m/s -> km/h
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      city: data.name,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      isDemo: false,
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

