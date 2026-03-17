"use client";

import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeStatusProps {
  connected: boolean;
  className?: string;
}

export function RealtimeStatus({ connected, className }: RealtimeStatusProps) {
  return (
    <Badge
      variant={connected ? "default" : "outline"}
      className={cn(
        "gap-1 transition-all",
        connected ? "bg-green-600 hover:bg-green-700" : "border-gray-300",
        className
      )}
    >
      {connected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span className="text-xs">Real-time ON</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="text-xs">Offline</span>
        </>
      )}
    </Badge>
  );
}

