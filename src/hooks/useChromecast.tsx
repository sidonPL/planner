"use client";

import { useState, useEffect, useCallback } from "react";

interface UseChromecastReturn {
  isAvailable: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  connect: () => void;
  disconnect: () => void;
  cast: (mediaUrl: string, metadata?: MediaMetadata) => void;
  error: string | null;
}

interface MediaMetadata {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
}

// Definicje typów dla Google Cast API
declare global {
  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    chrome?: {
      cast?: {
        isAvailable: boolean;
        SessionRequest: new (appId: string) => unknown;
        ApiConfig: new (
          sessionRequest: unknown,
          sessionListener: (session: unknown) => void,
          receiverListener: (availability: string) => void
        ) => unknown;
        initialize: (
          apiConfig: unknown,
          onSuccess: () => void,
          onError: (error: { code: string; description: string }) => void
        ) => void;
        requestSession: (
          onSuccess: (session: unknown) => void,
          onError: (error: { code: string; description: string }) => void
        ) => void;
        ReceiverAvailability: {
          AVAILABLE: string;
          UNAVAILABLE: string;
        };
      };
    };
  }
}

const CAST_APP_ID = "CC1AD845"; // Default Media Receiver App ID

export function useChromecast(): UseChromecastReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<unknown>(null);

  const initializeCastApi = useCallback(() => {
    if (!window.chrome?.cast) return;

    const cast = window.chrome.cast;

    const sessionRequest = new cast.SessionRequest(CAST_APP_ID);

    const apiConfig = new cast.ApiConfig(
      sessionRequest,
      (session: unknown) => {
        console.log("Cast session started", session);
        setSession(session);
        setIsConnected(true);
        setIsConnecting(false);
        // @ts-expect-error - Cast API types
        setDeviceName(session?.receiver?.friendlyName || "Chromecast");
      },
      (availability: string) => {
        if (availability === cast.ReceiverAvailability.AVAILABLE) {
          setIsAvailable(true);
          console.log("Chromecast devices available");
        } else {
          setIsAvailable(false);
          console.log("No Chromecast devices available");
        }
      }
    );

    cast.initialize(
      apiConfig,
      () => {
        console.log("Cast API initialized successfully");
      },
      (error: { code: string; description: string }) => {
        console.error("Cast API initialization error:", error);
        setError(`Błąd inicjalizacji: ${error.description}`);
      }
    );
  }, []);

  // Inicjalizacja Cast API
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Sprawdź czy Cast API jest już załadowane
    if (window.chrome?.cast?.isAvailable) {
      initializeCastApi();
    } else {
      // Załaduj Cast SDK
      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";
      script.async = true;

      window.__onGCastApiAvailable = (isAvailable) => {
        if (isAvailable) {
          initializeCastApi();
        }
      };

      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [initializeCastApi]);

  const connect = useCallback(() => {
    if (!window.chrome?.cast) {
      setError("Cast API niedostępne");
      return;
    }

    setIsConnecting(true);
    setError(null);

    window.chrome.cast.requestSession(
      (newSession: unknown) => {
        console.log("Connected to Chromecast", newSession);
        setSession(newSession);
        setIsConnected(true);
        setIsConnecting(false);
        // @ts-expect-error - Cast API types
        setDeviceName(newSession?.receiver?.friendlyName || "Chromecast");
      },
      (error: { code: string; description: string }) => {
        console.error("Cast connection error:", error);
        setIsConnecting(false);
        setError(`Nie udało się połączyć: ${error.description}`);
      }
    );
  }, []);

  const disconnect = useCallback(() => {
    if (session) {
      // @ts-expect-error - Cast API types
      session.stop(
        () => {
          console.log("Chromecast disconnected");
          setIsConnected(false);
          setSession(null);
          setDeviceName(null);
        },
        (error: { code: string; description: string }) => {
          console.error("Disconnect error:", error);
          setError(`Błąd rozłączania: ${error.description}`);
        }
      );
    }
  }, [session]);

  const cast = useCallback(
    (mediaUrl: string, metadata?: MediaMetadata) => {
      if (!session || !isConnected) {
        setError("Brak połączenia z Chromecast");
        return;
      }

      // @ts-expect-error - Cast API types
      const mediaInfo = new chrome.cast.media.MediaInfo(mediaUrl, "video/mp4");

      if (metadata) {
        // @ts-expect-error - Cast API types
        const castMetadata = new chrome.cast.media.GenericMediaMetadata();
        if (metadata.title) castMetadata.title = metadata.title;
        if (metadata.subtitle) castMetadata.subtitle = metadata.subtitle;
        if (metadata.imageUrl) {
          // @ts-expect-error - Cast API types
          castMetadata.images = [new chrome.cast.Image(metadata.imageUrl)];
        }
        mediaInfo.metadata = castMetadata;
      }

      // @ts-expect-error - Cast API types
      const request = new chrome.cast.media.LoadRequest(mediaInfo);

      // @ts-expect-error - Cast API types
      session.loadMedia(
        request,
        () => {
          console.log("Media loaded on Chromecast");
        },
        (error: { code: string; description: string }) => {
          console.error("Media load error:", error);
          setError(`Błąd odtwarzania: ${error.description}`);
        }
      );
    },
    [session, isConnected]
  );

  return {
    isAvailable,
    isConnected,
    isConnecting,
    deviceName,
    connect,
    disconnect,
    cast,
    error,
  };
}

