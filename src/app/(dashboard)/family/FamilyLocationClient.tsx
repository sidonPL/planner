"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, MapPin, Shield, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useGeofence } from "@/hooks/useGeofence";

// Dynamiczny import mapy
const FamilyLocationMap = dynamic(
  () => import("@/components/FamilyLocationMap").then((mod) => ({ default: mod.FamilyLocationMap })),
  { ssr: false, loading: () => <div className="h-[400px] bg-muted animate-pulse rounded-lg" /> }
);

interface FamilyMember {
  id: string;
  name: string | null;
  color: string;
  latitude: number;
  longitude: number;
  lastUpdate: Date;
}

interface FamilyLocationClientProps {
  initialSharingEnabled: boolean;
}

export function FamilyLocationClient({ initialSharingEnabled }: FamilyLocationClientProps) {
  const [sharingEnabled, setSharingEnabled] = useState(initialSharingEnabled);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Hook geofence do trackingu lokalizacji
  const { currentLocation } = useGeofence({
    enabled: sharingEnabled,
  });

  // Pobierz lokalizacje rodziny
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/family/location");
      if (response.ok) {
        const data = await response.json();
        setMembers(data.users);
      }
    } catch (error) {
      console.error("Error fetching family locations:", error);
    }
  }, []);

  // Aktualizuj lokalizację gdy się zmieni
  useEffect(() => {
    if (sharingEnabled && currentLocation) {
      const updateLocation = async () => {
        try {
          await fetch("/api/family/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }),
          });
          // Odśwież mapę
          fetchLocations();
        } catch (error) {
          console.error("Error updating location:", error);
        }
      };
      updateLocation();
    }
  }, [currentLocation, sharingEnabled, fetchLocations]);

  // Pobieraj lokalizacje co minutę
  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 60000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  // Toggle udostępniania
  const handleToggleSharing = async (enabled: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/family/location/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setSharingEnabled(enabled);
        toast.success(enabled ? "Udostępnianie włączone" : "Udostępnianie wyłączone");
        if (!enabled) {
          // Odśwież listę
          fetchLocations();
        }
      } else {
        toast.error("Nie udało się zmienić ustawień");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Rodzinne Śledzenie</h1>
        <p className="text-muted-foreground mt-2">
          Zobacz gdzie są członkowie rodziny (za zgodą)
        </p>
      </div>

      {/* Ustawienia prywatności */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Prywatność
          </CardTitle>
          <CardDescription>
            Kontroluj czy chcesz udostępniać swoją lokalizację rodzinie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sharing">Udostępniaj moją lokalizację</Label>
              <p className="text-sm text-muted-foreground">
                Inni członkowie rodziny zobaczą gdzie jesteś
              </p>
            </div>
            <Switch
              id="sharing"
              checked={sharingEnabled}
              onCheckedChange={handleToggleSharing}
              disabled={loading}
            />
          </div>

          {sharingEnabled && currentLocation && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded p-3">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Twoja lokalizacja jest udostępniana rodzinie
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Szerokość: {currentLocation.latitude.toFixed(6)}, Długość:{" "}
                {currentLocation.longitude.toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statystyki */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Członkowie Rodziny</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">
              udostępniają lokalizację
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Twój Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sharingEnabled ? "Włączone" : "Wyłączone"}
            </div>
            <p className="text-xs text-muted-foreground">
              udostępnianie lokalizacji
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mapa Rodziny
              </CardTitle>
              <CardDescription>
                Aktualna lokalizacja członków rodziny
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLocations}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <FamilyLocationMap members={members} height="500px" />
          ) : (
            <div className="h-[400px] border-2 border-dashed rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Brak danych</h3>
                <p className="text-muted-foreground">
                  Nikt nie udostępnia jeszcze lokalizacji
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informacje */}
      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-2">🔐 Prywatność i bezpieczeństwo</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>
              • Lokalizacja jest udostępniana tylko członkom Twojego gospodarstwa
            </li>
            <li>
              • Możesz wyłączyć udostępnianie w dowolnym momencie
            </li>
            <li>
              • Dane lokalizacji są aktualizowane co minutę
            </li>
            <li>
              • Po wyłączeniu, Twoja ostatnia lokalizacja jest usuwana
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

