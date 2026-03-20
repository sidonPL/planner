/**
 * Przykład użycia Chromecast w komponencie
 *
 * Ten plik pokazuje jak zintegrować Chromecast z różnymi funkcjami aplikacji.
 * Możesz go użyć jako referencję lub skopiować kod do swoich komponentów.
 */

 
/* eslint-disable @next/next/no-img-element */

"use client";

import { useChromecast } from "@/hooks/useChromecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cast, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

// Przykład 1: Prosty przycisk Chromecast
export function SimpleChromecastButton() {
  const { isAvailable, isConnected, isConnecting, deviceName, connect, disconnect } = useChromecast();

  // Nie pokazuj przycisku jeśli Chromecast niedostępny
  if (!isAvailable) return null;

  return (
    <Button
      onClick={isConnected ? disconnect : connect}
      disabled={isConnecting}
      variant={isConnected ? "default" : "outline"}
    >
      {isConnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Łączenie...
        </>
      ) : isConnected ? (
        <>
          <X className="mr-2 h-4 w-4" />
          Rozłącz {deviceName}
        </>
      ) : (
        <>
          <Cast className="mr-2 h-4 w-4" />
          Połącz Chromecast
        </>
      )}
    </Button>
  );
}

// Przykład 2: Karta z informacjami i kontrolkami
export function ChromecastCard() {
  const {
    isAvailable,
    isConnected,
    isConnecting,
    deviceName,
    connect,
    disconnect,
    cast,
    error,
  } = useChromecast();

  // Pokaż błędy jako toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cast className="h-5 w-5" />
            Chromecast
          </CardTitle>
          <CardDescription>
            Brak dostępnych urządzeń Chromecast w sieci
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Upewnij się, że Chromecast jest podłączony do tej samej sieci WiFi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cast className="h-5 w-5" />
          Chromecast
        </CardTitle>
        <CardDescription>
          {isConnected
            ? `Połączono z: ${deviceName}`
            : "Gotowy do połączenia"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <span className="text-sm font-medium">Status:</span>
          <span className={`text-sm ${isConnected ? "text-green-600" : "text-muted-foreground"}`}>
            {isConnecting ? "Łączenie..." : isConnected ? "Połączono" : "Rozłączono"}
          </span>
        </div>

        {/* Przyciski kontrolne */}
        <div className="flex gap-2">
          <Button
            onClick={isConnected ? disconnect : connect}
            disabled={isConnecting}
            className="flex-1"
            variant={isConnected ? "outline" : "default"}
          >
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isConnected ? (
              <X className="mr-2 h-4 w-4" />
            ) : (
              <Cast className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? "Łączenie..." : isConnected ? "Rozłącz" : "Połącz"}
          </Button>

          {isConnected && (
            <Button
              onClick={() => {
                // Przykład castowania wideo
                cast("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", {
                  title: "Film Demonstracyjny",
                  subtitle: "Big Buck Bunny",
                  imageUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
                });
                toast.success("Wysłano wideo do Chromecast");
              }}
              variant="secondary"
            >
              Testuj Wideo
            </Button>
          )}
        </div>

        {/* Informacje */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 Chromecast musi być w tej samej sieci WiFi</p>
          <p>🔒 Wymaga HTTPS w produkcji</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Przykład 3: Hook w komponencie z automatycznym powiadomieniem
export function ChromecastPhotoFrame() {
  const { isConnected, cast } = useChromecast();

  const showPhoto = (photoUrl: string, title: string) => {
    if (!isConnected) {
      toast.error("Najpierw połącz się z Chromecast");
      return;
    }

    cast(photoUrl, {
      title: title,
      subtitle: "Galeria rodzinna",
      imageUrl: photoUrl,
    });

    toast.success(`Wyświetlono: ${title}`);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Button
        variant="outline"
        className="aspect-square"
        onClick={() => showPhoto("/photos/family-1.jpg", "Wakacje 2024")}
        disabled={!isConnected}
      >
        🏖️ Wakacje
      </Button>
      <Button
        variant="outline"
        className="aspect-square"
        onClick={() => showPhoto("/photos/birthday.jpg", "Urodziny")}
        disabled={!isConnected}
      >
        🎂 Urodziny
      </Button>
      {/* Więcej zdjęć... */}
    </div>
  );
}

// Przykład 4: Integracja z listą odtwarzania
export function ChromecastPlaylist({ videos }: { videos: Array<{ url: string; title: string; thumbnail: string }> }) {
  const { isConnected, cast } = useChromecast();

  if (!isConnected) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Cast className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Połącz się z Chromecast, aby odtwarzać filmy</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((video, index) => (
        <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardContent
            className="p-4 flex items-center gap-4"
            onClick={() => {
              cast(video.url, {
                title: video.title,
                imageUrl: video.thumbnail,
              });
              toast.success(`Odtwarzanie: ${video.title}`);
            }}
          >
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-24 h-16 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-medium">{video.title}</h3>
              <p className="text-sm text-muted-foreground">Kliknij, aby odtworzyć</p>
            </div>
            <Cast className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Przykład 5: Status w górnym pasku (jak w Header)
export function ChromecastStatusBadge() {
  const { isAvailable, isConnected, deviceName, connect } = useChromecast();

  if (!isAvailable) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={connect}
      className={isConnected ? "text-primary" : ""}
    >
      <Cast className="h-4 w-4 mr-2" />
      {isConnected ? deviceName : "Cast"}
    </Button>
  );
}

/**
 * Przykłady użycia w różnych scenariuszach:
 *
 * 1. Galeria zdjęć rodzinnych - wyświetlaj zdjęcia na TV
 * 2. Filmy/wideo - odtwarzaj zapisane filmy rodzinne
 * 3. Prezentacje - pokaż plan dnia na dużym ekranie
 * 4. Dashboard kuchenny - przepisy na TV podczas gotowania
 * 5. Kalendarz - wyświetl wydarzenia tygodnia na TV w salonie
 */

