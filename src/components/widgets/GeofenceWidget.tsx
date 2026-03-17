"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ArrowRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GeofenceEvent {
  id: string;
  type: string;
  timestamp: Date;
  zone: {
    name: string;
    type: string;
    color: string | null;
  };
  user: {
    name: string | null;
    color: string;
  };
}

interface GeofenceWidgetProps {
  events: GeofenceEvent[];
}

export function GeofenceWidget({ events }: GeofenceWidgetProps) {
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Geofencing
          </CardTitle>
          <CardDescription>Ostatnie wejścia i wyjścia ze stref</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Brak wydarzeń geofencing</p>
            <Link href="/presence">
              <Button variant="link" size="sm" className="mt-2">
                Skonfiguruj strefy
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geofencing
        </CardTitle>
        <CardDescription>Ostatnie wejścia i wyjścia ze stref</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="flex items-center gap-3">
              <div className="shrink-0">
                {event.type === "ENTER" ? (
                  <div className="p-2 rounded-full bg-green-500/10">
                    <ArrowRight className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-orange-500/10">
                    <ArrowLeft className="h-4 w-4 text-orange-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {event.user.name} {event.type === "ENTER" ? "wszedł" : "wyszedł"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{event.zone.name}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground shrink-0">
                <div>{format(new Date(event.timestamp), "HH:mm", { locale: pl })}</div>
                <div>{format(new Date(event.timestamp), "d MMM", { locale: pl })}</div>
              </div>
            </div>
          ))}
        </div>
        <Link href="/presence">
          <Button variant="outline" size="sm" className="w-full mt-4">
            Zobacz wszystkie
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

