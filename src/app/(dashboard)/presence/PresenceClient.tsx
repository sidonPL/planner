"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Home,
  MapPin,
  Clock,
  History,
  Plus,
  Trash2,
  Briefcase,
  GraduationCap,
  Navigation,
  ArrowRight,
  ArrowLeft,
  Power,
  PowerOff,
  Map,
  Download,
  BarChart3,
  Flame,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import type { Presence } from "@prisma/client";
import { cn } from "@/lib/utils";
import { getCurrentPosition, formatCoordinates } from "@/lib/geolocation";
import { useGeofenceTracking } from "@/hooks/useGeofenceTracking";
import { useSSEEvent } from "@/hooks/useSSE";
import {
  getPresenceStatusInfo,
  manualPresenceStatuses,
  type PresenceChangePayload,
} from "@/lib/presence-events";

// Dynamiczny import mapy (Leaflet wymaga window)
const GeofenceMap = dynamic(() => import("@/components/GeofenceMap").then(mod => ({ default: mod.GeofenceMap })), {
  ssr: false,
  loading: () => <div className="h-[500px] bg-muted animate-pulse rounded-lg" />,
});

type MemberWithPresence = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  color: string;
  presenceRecords: Presence[];
};

type PresenceWithUser = Presence & {
  user: {
    id: string;
    name: string | null;
    color: string;
  };
};

interface Zone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
  color: string | null;
  isActive: boolean;
  _count: {
    events: number;
  };
}

interface GeofenceEvent {
  id: string;
  type: string;
  timestamp: Date;
  zone: {
    id: string;
    name: string;
    type: string;
    color: string | null;
  };
  user: {
    id: string;
    name: string | null;
    color: string;
  };
}

type ZoneType = "HOME" | "WORK" | "SCHOOL" | "OTHER";

interface ZoneFormState {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  radiusInput: string;
  type: ZoneType;
}

interface EditZoneFormState extends ZoneFormState {
  isActive: boolean;
}

interface PresenceClientProps {
  members: MemberWithPresence[];
  presenceHistory: PresenceWithUser[];
  geofenceZones: Zone[];
  geofenceEvents: GeofenceEvent[];
  currentUserId: string;
  householdId: string;
}

const zoneTypeConfig = {
  HOME: { icon: Home, label: "Dom", color: "#10B981" },
  WORK: { icon: Briefcase, label: "Praca", color: "#3B82F6" },
  SCHOOL: { icon: GraduationCap, label: "Szkoła", color: "#F59E0B" },
  OTHER: { icon: MapPin, label: "Inne", color: "#6B7280" },
};

const radiusPresets = [50, 100, 200, 500] as const;

export function PresenceClient({
  members: initialMembers,
  presenceHistory: initialHistory,
  geofenceZones: initialZones,
  geofenceEvents: initialGeofenceEvents,
  currentUserId,
}: PresenceClientProps) {
  const [members, setMembers] = useState(initialMembers);
  const [history, setHistory] = useState(initialHistory);
  const [zones, setZones] = useState(initialZones);
  const [geofenceEvents] = useState(initialGeofenceEvents);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [activeTab, setActiveTab] = useState("manual");
  const [addressTab, setAddressTab] = useState<"coords" | "address">("coords");
  const [searchAddress, setSearchAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [newZone, setNewZone] = useState<ZoneFormState>({
    name: "",
    latitude: 0,
    longitude: 0,
    radius: 100,
    radiusInput: "100",
    type: "HOME",
  });

  const [editZone, setEditZone] = useState<EditZoneFormState>({
    name: "",
    latitude: 0,
    longitude: 0,
    radius: 100,
    radiusInput: "100",
    type: "HOME",
    isActive: true,
  });

  const parseRadius = (value: string): number | null => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const normalized = Math.round(parsed);
    if (normalized < 10 || normalized > 10000) return null;
    return normalized;
  };

  const { enabled: geofenceEnabled, isTracking, currentLocation, error: geofenceError, startTracking, stopTracking, checkNow } = useGeofenceTracking();

  const getGeofenceErrorInfo = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("odmówił") || normalized.includes("odmowil") || normalized.includes("permission")) {
      return {
        title: "Brak dostępu do lokalizacji",
        hint: "Włącz uprawnienie lokalizacji dla tej strony w ustawieniach przeglądarki i spróbuj ponownie.",
      };
    }

    if (normalized.includes("czas") || normalized.includes("timeout")) {
      return {
        title: "Limit czasu pobierania lokalizacji",
        hint: "Sprawdź sygnał GPS/internet i spróbuj ponownie za chwilę.",
      };
    }

    if (normalized.includes("nie jest dostępna") || normalized.includes("niedostępna") || normalized.includes("unavailable")) {
      return {
        title: "Lokalizacja chwilowo niedostępna",
        hint: "Upewnij się, że urządzenie ma aktywne usługi lokalizacji.",
      };
    }

    return {
      title: "Problem z geolokalizacją",
      hint: "Sprawdź ustawienia lokalizacji i spróbuj ponownie.",
    };
  };

  const handlePresenceChange = useCallback((data: PresenceChangePayload) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === data.userId
          ? {
              ...member,
              presenceRecords: [
                {
                  id: data.id,
                  userId: data.userId,
                  status: data.status as Presence["status"],
                  note: null,
                  timestamp: new Date(data.timestamp),
                },
              ],
            }
          : member
      )
    );

    setHistory((prev) => {
      if (prev.some((entry) => entry.id === data.id)) {
        return prev;
      }

      const member = initialMembers.find((entry) => entry.id === data.userId);
      return [
        {
          id: data.id,
          userId: data.userId,
          status: data.status as Presence["status"],
          note: null,
          timestamp: new Date(data.timestamp),
          user: {
            id: data.userId,
            name: data.userName,
            color: member?.color || "#6366f1",
          },
        },
        ...prev.filter((entry) => entry.id !== data.id),
      ];
    });
  }, [initialMembers]);

  useSSEEvent<PresenceChangePayload>("presence_change", handlePresenceChange);

  const handleSetPresence = async (userId: string, status: Presence["status"]) => {
    const member = members.find((m) => m.id === userId);
    if (!member) return;

    if (member.presenceRecords[0]?.status === status) {
      return;
    }

    try {
      const response = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          status,
        }),
      });

      if (response.ok) {
        const newPresence = await response.json();
        handlePresenceChange({
          id: newPresence.id,
          userId,
          userName: member.name || "Użytkownik",
          status: newPresence.status,
          timestamp: new Date(newPresence.timestamp).toISOString(),
        });

        toast.success(`Status: ${getPresenceStatusInfo(status).label}`);
      } else {
        const errorBody = await response.json().catch(() => null);
        toast.error(errorBody?.error || "Nie udało się zaktualizować statusu");
      }
    } catch {
      toast.error("Nie udało się zaktualizować statusu");
    }
  };

  const getStatusInfo = (status: string, zoneName?: string) => {
    const base = getPresenceStatusInfo(status);
    switch (status) {
      case "HOME":
        return { ...base, icon: Home };
      case "WORK":
        return {
          ...base,
          label: zoneName ? `W pracy (${zoneName})` : base.label,
          icon: Briefcase,
        };
      case "SCHOOL":
        return {
          ...base,
          label: zoneName ? `W szkole (${zoneName})` : base.label,
          icon: GraduationCap,
        };
      case "VACATION":
        return { ...base, icon: MapPin };
      case "AWAY":
      default:
        return { ...base, icon: MapPin };
    }
  };

  const homeCount = members.filter(
    (m) => m.presenceRecords[0]?.status === "HOME"
  ).length;

  // Dodaj strefę
  const handleAddZone = async () => {
    const parsedRadius = parseRadius(newZone.radiusInput);

    if (!newZone.name || newZone.latitude === 0) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    if (parsedRadius === null) {
      toast.error("Promień musi być liczbą od 10 do 10000 metrów");
      return;
    }

    try {
      const payload = {
        name: newZone.name,
        latitude: newZone.latitude,
        longitude: newZone.longitude,
        radius: parsedRadius,
        type: newZone.type,
      };

      const response = await fetch("/api/geofence/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const zone = await response.json();
        // Upewnij się, że nowa strefa ma strukturę _count
        const zoneWithCount = {
          ...zone,
          _count: zone._count || { events: 0 }
        };
        setZones([zoneWithCount, ...zones]);
        setIsAddDialogOpen(false);
        setNewZone({ name: "", latitude: 0, longitude: 0, radius: 100, radiusInput: "100", type: "HOME" });
        setSearchAddress(""); // Wyczyść adres
        setAddressTab("coords"); // Przywróć domyślną zakładkę
        toast.success("Strefa dodana");
      } else {
        toast.error("Nie udało się dodać strefy");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  const handleOpenEditZone = (zone: Zone) => {
    setEditingZoneId(zone.id);
    setEditZone({
      name: zone.name,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radius: zone.radius,
      radiusInput: String(zone.radius),
      type: zone.type as ZoneType,
      isActive: zone.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateZone = async () => {
    if (!editingZoneId) return;

    const parsedRadius = parseRadius(editZone.radiusInput);
    if (!editZone.name || editZone.latitude === 0) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }
    if (parsedRadius === null) {
      toast.error("Promień musi być liczbą od 10 do 10000 metrów");
      return;
    }

    try {
      const response = await fetch(`/api/geofence/zones/${editingZoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editZone.name,
          latitude: editZone.latitude,
          longitude: editZone.longitude,
          radius: parsedRadius,
          type: editZone.type,
          isActive: editZone.isActive,
        }),
      });

      if (response.ok) {
        const updatedZone = await response.json();
        setZones((prev) => prev.map((z) => (z.id === editingZoneId ? { ...z, ...updatedZone } : z)));
        setIsEditDialogOpen(false);
        setEditingZoneId(null);
        toast.success("Strefa zaktualizowana");
      } else {
        toast.error("Nie udało się zaktualizować strefy");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  // Usuń strefę
  const handleDeleteZone = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę strefę?")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/geofence/zones/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setZones(zones.filter((z) => z.id !== id));
        toast.success("Strefa usunięta");
      } else {
        toast.error("Nie udało się usunąć strefy");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  // Pobierz aktualną lokalizację
  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const coords = await getCurrentPosition();
      setNewZone({
        ...newZone,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      toast.success("Lokalizacja pobrana");
    } catch (error) {
      toast.error("Nie udało się pobrać lokalizacji");
      console.error(error);
    } finally {
      setGettingLocation(false);
    }
  };

  // Geokodowanie adresu na współrzędne
  const handleGeocodeAddress = async () => {
    if (!searchAddress.trim()) {
      toast.error("Wprowadź adres");
      return;
    }

    setIsGeocoding(true);
    try {
      // Używamy Nominatim API (OpenStreetMap) - darmowe, bez klucza API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'PlannerApp/1.0' // Wymagane przez Nominatim
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        setNewZone({
          ...newZone,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          name: newZone.name || result.display_name.split(',')[0], // Użyj pierwszej części adresu jeśli nazwa jest pusta
        });
        toast.success("Lokalizacja znaleziona!");
      } else {
        toast.error("Nie znaleziono adresu. Spróbuj być bardziej szczegółowy.");
      }
    } catch (error) {
      toast.error("Nie udało się znaleźć adresu");
      console.error(error);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Kliknięcie na mapie
  const handleMapClick = (lat: number, lng: number) => {
    if (isAddDialogOpen) {
      setNewZone({
        ...newZone,
        latitude: lat,
        longitude: lng,
      });
      toast.success("Lokalizacja ustawiona z mapy");
    }
  };

  // Eksport do CSV
  const handleExport = async () => {
    try {
      const response = await fetch("/api/geofence/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `geofence-export-${format(new Date(), "yyyy-MM-dd", { locale: pl })}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Dane wyeksportowane do CSV");
      } else {
        toast.error("Nie udało się wyeksportować danych");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  const renderManualTab = () => (
    <>
      {/* Karty domowników */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => {
          const currentStatus = member.presenceRecords[0]?.status || "AWAY";
          const statusInfo = getStatusInfo(currentStatus);
          const lastUpdate = member.presenceRecords[0]?.timestamp;
          const isCurrentUser = member.id === currentUserId;

          return (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div
                  className={cn(
                    "h-2",
                    statusInfo.color
                  )}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={member.avatar || undefined} />
                          <AvatarFallback
                            style={{ backgroundColor: member.color }}
                            className="text-white"
                          >
                            {member.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white",
                            statusInfo.color
                          )}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {member.name}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Ty
                            </Badge>
                          )}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <statusInfo.icon className="h-3 w-3" />
                          {statusInfo.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  {lastUpdate && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(lastUpdate), {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </div>
                  )}

                  {isCurrentUser ? (
                    <Select
                      value={currentStatus}
                      onValueChange={(value) =>
                        handleSetPresence(member.id, value as Presence["status"])
                      }
                    >
                      <SelectTrigger className="w-full mt-4">
                        <SelectValue placeholder="Wybierz status" />
                      </SelectTrigger>
                      <SelectContent>
                        {manualPresenceStatuses.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-4 text-xs text-muted-foreground text-center">
                      Status ustawiany przez domownika
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Historia obecności */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Historia aktywności
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak historii aktywności
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 20).map((entry) => {
                const statusInfo = getStatusInfo(entry.status);

                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        statusInfo.color
                      )}
                    />
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        style={{ backgroundColor: entry.user.color }}
                        className="text-white text-xs"
                      >
                        {entry.user.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1">
                      <strong>{entry.user.name}</strong>{" "}
                      {entry.status === "HOME" ? "wrócił/a do domu" : "wyszedł/wyszła"}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(entry.timestamp), "d MMM, HH:mm", { locale: pl })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );

  const renderGeofencingTab = () => (
    <>
      {/* Alert o braku uprawnień do lokalizacji */}
      {geofenceError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{getGeofenceErrorInfo(geofenceError.message).title}</AlertTitle>
          <AlertDescription>
            {geofenceError.message}. {getGeofenceErrorInfo(geofenceError.message).hint}
          </AlertDescription>
        </Alert>
      )}

      {!isTracking && currentLocation === null && !geofenceError && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700 dark:text-yellow-400">
            Lokalizacja wyłączona
          </AlertTitle>
          <AlertDescription className="text-yellow-600 dark:text-yellow-500">
            Aby korzystać z automatycznego geofencingu, włącz monitorowanie lokalizacji poniżej.
            Aplikacja będzie sprawdzać czy jesteś w zdefiniowanych strefach i automatycznie aktualizować Twoją obecność.
          </AlertDescription>
        </Alert>
      )}

      {/* Kontrolki monitorowania */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Status Monitorowania GPS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{geofenceEnabled ? "Monitorowanie aktywne" : "Monitorowanie wyłączone"}</p>
              {currentLocation && (
                <p className="text-sm text-muted-foreground">
                  Ostatnia lokalizacja: {formatCoordinates(currentLocation)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {geofenceEnabled ? (
                <Button variant="destructive" onClick={stopTracking}>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Wyłącz
                </Button>
              ) : (
                <Button onClick={startTracking}>
                  <Power className="h-4 w-4 mr-2" />
                  Włącz
                </Button>
              )}
              <Button variant="outline" onClick={checkNow}>
                <Navigation className="h-4 w-4 mr-2" />
                Sprawdź teraz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Akcje */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj strefę
        </Button>
        <Button variant="outline" onClick={() => setShowMap(!showMap)}>
          <Map className="h-4 w-4 mr-2" />
          {showMap ? "Ukryj mapę" : "Pokaż mapę"}
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Eksport CSV
        </Button>
        <Link href="/presence/reports">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Raporty tygodniowe
          </Button>
        </Link>
        <Link href="/presence/heatmap">
          <Button variant="outline">
            <Flame className="h-4 w-4 mr-2" />
            Heatmap
          </Button>
        </Link>
      </div>

      {/* Mapa interaktywna */}
      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Mapa stref
            </CardTitle>
            <CardDescription>
              Kliknij na mapie aby dodać nową strefę lub wybierz istniejącą
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GeofenceMap
              zones={zones}
              currentLocation={currentLocation ? { latitude: currentLocation.latitude, longitude: currentLocation.longitude } : null}
              onMapClick={handleMapClick}
              selectedZoneId={selectedZoneId}
              height="500px"
            />
          </CardContent>
        </Card>
      )}

      {/* Lista stref */}
      {zones.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Strefy ({zones.length})</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {zones.map((zone) => {
              const config = zoneTypeConfig[zone.type as keyof typeof zoneTypeConfig] || zoneTypeConfig.OTHER;
              const Icon = config.icon;

              return (
                <Card
                  key={zone.id}
                  className={selectedZoneId === zone.id ? "ring-2 ring-primary" : "cursor-pointer hover:bg-accent"}
                  onClick={() => setSelectedZoneId(selectedZoneId === zone.id ? null : zone.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: config.color }} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{zone.name}</CardTitle>
                          <CardDescription>{config.label}</CardDescription>
                        </div>
                      </div>
                      {zone.isActive && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Aktywna
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Promień:</span>
                        <p className="font-medium">{zone.radius}m</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Wydarzenia:</span>
                        <p className="font-medium">{zone._count?.events || 0}</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      📍 {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditZone(zone);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteZone(zone.id);
                        }}
                        disabled={deletingId === zone.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Historia geofencingu */}
      {geofenceEvents.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ostatnie Wydarzenia GPS</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {geofenceEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-center gap-4 p-4">
                    {event.type === "ENTER" ? (
                      <ArrowRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowLeft className="h-5 w-5 text-orange-600" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">
                        {event.user.name} {event.type === "ENTER" ? "wszedł" : "wyszedł"}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.zone.name}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {format(new Date(event.timestamp), "HH:mm", { locale: pl })}
                      <br />
                      {format(new Date(event.timestamp), "d MMM", { locale: pl })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Brak stref */}
      {zones.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak stref</h3>
            <p className="text-muted-foreground mb-4">
              Dodaj pierwszą strefę aby włączyć automatyczne monitorowanie obecności
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwszą strefę
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );

  const renderAddZoneDialog = () => (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dodaj strefę geofencing</DialogTitle>
          <DialogDescription>
            Określ lokalizację i promień strefy. Gdy wejdziesz lub wyjdziesz, status obecności zmieni się automatycznie.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nazwa</Label>
            <Input
              placeholder="np. Mój dom"
              value={newZone.name}
              onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={newZone.type}
              onValueChange={(v) => setNewZone({ ...newZone, type: v as typeof newZone.type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME">🏠 Dom</SelectItem>
                <SelectItem value="WORK">💼 Praca</SelectItem>
                <SelectItem value="SCHOOL">🎓 Szkoła</SelectItem>
                <SelectItem value="OTHER">📍 Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Zakładki: Współrzędne / Adres */}
          <Tabs value={addressTab} onValueChange={(v) => setAddressTab(v as "coords" | "address")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="coords">
                <MapPin className="mr-2 h-4 w-4" />
                Współrzędne GPS
              </TabsTrigger>
              <TabsTrigger value="address">
                <Navigation className="mr-2 h-4 w-4" />
                Wyszukaj adres
              </TabsTrigger>
            </TabsList>

            <TabsContent value="coords" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Szerokość (Latitude)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newZone.latitude}
                    onChange={(e) => setNewZone({ ...newZone, latitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Długość (Longitude)</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newZone.longitude}
                    onChange={(e) => setNewZone({ ...newZone, longitude: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
              >
                <Navigation className="h-4 w-4 mr-2" />
                {gettingLocation ? "Pobieranie..." : "Użyj mojej lokalizacji"}
              </Button>
            </TabsContent>

            <TabsContent value="address" className="space-y-4">
              <div className="space-y-2">
                <Label>Adres</Label>
                <Input
                  placeholder="np. Plac Defilad 1, Warszawa lub Szkoła Podstawowa nr 5, Kraków"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleGeocodeAddress();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Im bardziej szczegółowy adres, tym lepsze wyniki
                </p>
              </div>
              <Button
                variant="default"
                className="w-full"
                onClick={handleGeocodeAddress}
                disabled={isGeocoding || !searchAddress.trim()}
              >
                <MapPin className="h-4 w-4 mr-2" />
                {isGeocoding ? "Wyszukiwanie..." : "Znajdź lokalizację"}
              </Button>
              {newZone.latitude !== 0 && newZone.longitude !== 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Lokalizacja znaleziona: {newZone.latitude.toFixed(6)}, {newZone.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Promień (metry)</Label>
            <div className="flex flex-wrap gap-2">
              {radiusPresets.map((preset) => (
                <Button
                  key={`new-radius-${preset}`}
                  type="button"
                  variant={parseRadius(newZone.radiusInput) === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewZone({ ...newZone, radius: preset, radiusInput: String(preset) })}
                >
                  {preset} m
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min="10"
              max="10000"
              value={newZone.radiusInput}
              onChange={(e) => setNewZone({ ...newZone, radiusInput: e.target.value })}
              onBlur={() => {
                const parsedRadius = parseRadius(newZone.radiusInput);
                if (parsedRadius !== null) {
                  setNewZone({ ...newZone, radius: parsedRadius, radiusInput: String(parsedRadius) });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              10m - 10km (zalecane: 100-200m dla domu, 50-100m dla miejsca pracy/szkoły)
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            setIsAddDialogOpen(false);
            setSearchAddress("");
            setAddressTab("coords");
            setNewZone({ name: "", latitude: 0, longitude: 0, radius: 100, radiusInput: "100", type: "HOME" });
          }}>
            Anuluj
          </Button>
          <Button onClick={handleAddZone} disabled={!newZone.name || newZone.latitude === 0}>
            Dodaj strefę
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderEditZoneDialog = () => (
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj strefę geofencing</DialogTitle>
          <DialogDescription>
            Zmień dane strefy, promień lub aktywność monitorowania dla tej lokalizacji.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nazwa</Label>
            <Input
              value={editZone.name}
              onChange={(e) => setEditZone({ ...editZone, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Typ</Label>
            <Select
              value={editZone.type}
              onValueChange={(v) => setEditZone({ ...editZone, type: v as typeof editZone.type })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HOME">🏠 Dom</SelectItem>
                <SelectItem value="WORK">💼 Praca</SelectItem>
                <SelectItem value="SCHOOL">🎓 Szkoła</SelectItem>
                <SelectItem value="OTHER">📍 Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Szerokość (Latitude)</Label>
              <Input
                type="number"
                step="0.000001"
                value={editZone.latitude}
                onChange={(e) => setEditZone({ ...editZone, latitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Długość (Longitude)</Label>
              <Input
                type="number"
                step="0.000001"
                value={editZone.longitude}
                onChange={(e) => setEditZone({ ...editZone, longitude: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Promień (metry)</Label>
            <div className="flex flex-wrap gap-2">
              {radiusPresets.map((preset) => (
                <Button
                  key={`edit-radius-${preset}`}
                  type="button"
                  variant={parseRadius(editZone.radiusInput) === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditZone({ ...editZone, radius: preset, radiusInput: String(preset) })}
                >
                  {preset} m
                </Button>
              ))}
            </div>
            <Input
              type="number"
              min="10"
              max="10000"
              value={editZone.radiusInput}
              onChange={(e) => setEditZone({ ...editZone, radiusInput: e.target.value })}
              onBlur={() => {
                const parsedRadius = parseRadius(editZone.radiusInput);
                if (parsedRadius !== null) {
                  setEditZone({ ...editZone, radius: parsedRadius, radiusInput: String(parsedRadius) });
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">Aktywna strefa</p>
              <p className="text-xs text-muted-foreground">Wyłączenie strefy zatrzyma wykrywanie wejść/wyjść dla tej lokalizacji.</p>
            </div>
            <Button
              type="button"
              variant={editZone.isActive ? "default" : "outline"}
              onClick={() => setEditZone((prev) => ({ ...prev, isActive: !prev.isActive }))}
            >
              {editZone.isActive ? "Włączona" : "Wyłączona"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditDialogOpen(false);
              setEditingZoneId(null);
            }}
          >
            Anuluj
          </Button>
          <Button onClick={handleUpdateZone} disabled={!editZone.name || editZone.latitude === 0}>
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Obecność i Lokalizacja</h1>
          <p className="text-muted-foreground">
            {homeCount} z {members.length} domowników w domu • {zones.length} stref geofencing
          </p>
        </div>
      </div>

      {/* Tabs - Manual vs Geofencing */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">
            <Home className="mr-2 h-4 w-4" />
            Ręczna kontrola
          </TabsTrigger>
          <TabsTrigger value="geofencing">
            <Navigation className="mr-2 h-4 w-4" />
            Geofencing
          </TabsTrigger>
        </TabsList>

        {/* Manual Presence Tab */}
        <TabsContent value="manual" className="space-y-6">{renderManualTab()}</TabsContent>

        {/* Geofencing Tab */}
        <TabsContent value="geofencing" className="space-y-6">{renderGeofencingTab()}</TabsContent>
      </Tabs>

      {/* Dialogs */}
      {renderAddZoneDialog()}
      {renderEditZoneDialog()}
    </div>
  );
}
