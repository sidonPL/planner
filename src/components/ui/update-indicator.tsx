"use client";

import { useEffect, useState, useRef } from "react";
import { useSSE } from "@/hooks/useSSE";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpdateIndicatorProps {
  className?: string;
}

export function UpdateIndicator({ className }: UpdateIndicatorProps) {
  const { lastEvent, isConnected } = useSSE();
  const [showPulse, setShowPulse] = useState(false);
  const lastEventTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (lastEvent && lastEvent.timestamp !== lastEventTimeRef.current) {
      lastEventTimeRef.current = lastEvent.timestamp;
      const startTimer = setTimeout(() => {
        setShowPulse(true);
      }, 0);

      // Ukryj animację po 2 sekundach
      const timer = setTimeout(() => {
        setShowPulse(false);
      }, 2000);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(timer);
      };
    }
  }, [lastEvent]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Wskaźnik połączenia */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {isConnected ? "Online" : "Offline"}
        </span>
      </div>

      {/* Wskaźnik aktualizacji */}
      {showPulse && (
        <div className="flex items-center gap-1 text-primary animate-pulse">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="text-xs">Aktualizacja...</span>
        </div>
      )}
    </div>
  );
}

