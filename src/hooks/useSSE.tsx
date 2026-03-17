"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from "react";
import { useNotificationTTS } from "@/hooks/useTTS";
import { toast } from "sonner";

interface SSEContextType {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  reconnect: () => void;
}

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

const SSEContext = createContext<SSEContextType | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { speakNotification } = useNotificationTTS();

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Wyczyść timeout reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Zamknij poprzednie połączenie
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource("/api/sse");

    es.onopen = () => {
      console.log("SSE connected");
      setIsConnected(true);
    };

    es.onerror = () => {
      console.log("SSE error, reconnecting...");
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Reconnect po 5 sekundach
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    // Obsługa różnych typów wydarzeń
    es.addEventListener("notification", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "notification", data, timestamp: new Date() });

        // Pokaż toast
        toast(data.title, {
          description: data.message,
        });

        // Odczytaj przez TTS
        speakNotification(data.title, data.message);
      } catch (error) {
        console.error("Error parsing notification event:", error);
      }
    });

    es.addEventListener("task_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "task_update", data, timestamp: new Date() });
      } catch (error) {
        console.error("Error parsing task_update event:", error);
      }
    });

    es.addEventListener("presence_change", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "presence_change", data, timestamp: new Date() });

        // Powiadomienie o zmianie obecności
        const message = data.status === "HOME"
          ? `${data.userName} wrócił do domu`
          : `${data.userName} wyszedł`;

        toast(message);
        speakNotification(message);
      } catch (error) {
        console.error("Error parsing presence_change event:", error);
      }
    });

    es.addEventListener("shopping_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent({ type: "shopping_update", data, timestamp: new Date() });
      } catch (error) {
        console.error("Error parsing shopping_update event:", error);
      }
    });

    es.addEventListener("ping", () => {
      // Keep-alive ping
    });

    eventSourceRef.current = es;
  }, [speakNotification]);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SSEContext.Provider value={{ isConnected, lastEvent, reconnect }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSE must be used within a SSEProvider");
  }
  return context;
}

// Hook do nasłuchiwania konkretnego typu eventu
export function useSSEEvent<T = unknown>(eventType: string, callback: (data: T) => void) {
  const { lastEvent } = useSSE();

  useEffect(() => {
    if (lastEvent && lastEvent.type === eventType) {
      callback(lastEvent.data as T);
    }
  }, [lastEvent, eventType, callback]);
}

