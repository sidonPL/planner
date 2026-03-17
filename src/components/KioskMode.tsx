"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface KioskModeProps {
  children: React.ReactNode;
  className?: string;
}

export function KioskMode({ children, className }: KioskModeProps) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wake Lock i fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = !!document.fullscreenElement;

      // Aktualizuj padding przez DOM (bez state)
      if (containerRef.current) {
        const innerDiv = containerRef.current.querySelector('div') as HTMLDivElement;
        if (innerDiv) {
          if (isFullscreen) {
            innerDiv.classList.add('p-6', 'text-lg');
          } else {
            innerDiv.classList.remove('p-6', 'text-lg');
          }
        }
      }

      // Wake Lock
      if (isFullscreen && "wakeLock" in navigator) {
        navigator.wakeLock.request("screen")
          .then(wakeLock => {
            wakeLockRef.current = wakeLock;
            console.log("Wake Lock activated");
          })
          .catch(err => {
            console.log("Wake Lock error:", err);
          });
      } else if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    // Ponownie żądaj wake lock po powrocie z tła
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && document.fullscreenElement && "wakeLock" in navigator) {
        navigator.wakeLock.request("screen")
          .then(wakeLock => {
            wakeLockRef.current = wakeLock;
          })
          .catch(err => {
            console.log("Wake Lock error:", err);
          });
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)} suppressHydrationWarning>
      <div className="transition-all duration-300">
        {children}
      </div>
    </div>
  );
}


