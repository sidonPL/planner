"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Home,
  Bell,
  Users,
  Save,
  FolderOpen,
  ChevronRight,
  Download,
  UtensilsCrossed,
  X,
  Plus,
  BellRing,
  BellOff,
  Loader2,
  Shield,
  Cloud,
  History,
  Calendar,
  Palette,
  BarChart3,
  Smartphone,
  Zap,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { User as PrismaUser, UserSettings, Household } from "@prisma/client";
import { CalendarIntegrationsManager } from "@/components/settings/CalendarIntegrationsManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { LocateFixed, MapPin, RefreshCw, Volume } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleLabels, roleColors } from "@/lib/permissions";
import { useTTS } from "@/hooks/useTTS";
import { Slider } from "@/components/ui/slider";
import { AppearanceTab } from "@/components/settings/AppearanceTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { DataExportTab } from "@/components/settings/DataExportTab";
import { GamificationSettingsTab } from "@/components/gamification/GamificationSettingsTab";

type UserWithRelations = PrismaUser & {
  settings?: UserSettings | null;
  household: Household | null;
  birthDate: Date | null;
};

type Member = {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  color: string;
  role: string;
};

interface SettingsClientProps {
  user: UserWithRelations | null;
  members: Member[];
  currentUserId: string;
}

function WeatherSettingsCard({ userSettings }: { userSettings: UserSettings | null }) {
  const [weatherCity, setWeatherCity] = useState(userSettings?.weatherCity || "");
  const [weatherLocationMode, setWeatherLocationMode] = useState<"city" | "gps">(
    ((userSettings as UserSettings & { weatherLocationMode?: string } | null)?.weatherLocationMode === "gps"
      ? "gps"
      : "city")
  );
  const [weatherLatitude, setWeatherLatitude] = useState<number | null>(
    (userSettings as UserSettings & { weatherLatitude?: number | null } | null)?.weatherLatitude ?? null
  );
  const [weatherLongitude, setWeatherLongitude] = useState<number | null>(
    (userSettings as UserSettings & { weatherLongitude?: number | null } | null)?.weatherLongitude ?? null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);


  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weatherCity,
          weatherLocationMode,
          weatherLatitude,
          weatherLongitude,
          weatherApiKey: null,
        }),
      });

      if (response.ok) {
        toast.success("Ustawienia pogody zostały zapisane");
      } else {
        toast.error("Nie udało się zapisać ustawień");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    try {
      // Zapisz najpierw ustawienia
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weatherCity,
          weatherLocationMode,
          weatherLatitude,
          weatherLongitude,
          weatherApiKey: null,
        }),
      });

      // Testuj pobieranie pogody
      const response = await fetch("/api/weather");
      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Połączono! Pogoda dla ${data.city}: ${data.temperature}°C, ${data.description}`,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Nie udało się pobrać pogody",
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: "Błąd połączenia",
      });
    }
  };

  const handleDetectGps = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Ta przegladarka nie wspiera geolokalizacji");
      return;
    }

    setIsDetectingGps(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60_000,
        });
      });

      setWeatherLatitude(position.coords.latitude);
      setWeatherLongitude(position.coords.longitude);
      setWeatherLocationMode("gps");
      toast.success("Pobrano lokalizacje GPS");
    } catch {
      toast.error("Nie udalo sie pobrac lokalizacji GPS");
    } finally {
      setIsDetectingGps(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Ustawienia pogody
        </CardTitle>
        <CardDescription>
          Skonfiguruj lokalizację dla widgetu pogody na dashboardzie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Źródło lokalizacji</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={weatherLocationMode === "city" ? "default" : "outline"}
              onClick={() => setWeatherLocationMode("city")}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Miasto
            </Button>
            <Button
              type="button"
              variant={weatherLocationMode === "gps" ? "default" : "outline"}
              onClick={() => setWeatherLocationMode("gps")}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              GPS
            </Button>
          </div>
        </div>

        {/* Miasto */}
        <div className="space-y-2">
          <Label htmlFor="weatherCity" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Miasto
          </Label>
          <Input
            id="weatherCity"
            placeholder="np. Warsaw, Kraków, Gdańsk..."
            value={weatherCity}
            onChange={(e) => setWeatherCity(e.target.value)}
            disabled={weatherLocationMode !== "city"}
          />
          <p className="text-xs text-muted-foreground">
            Wpisz nazwę miasta po angielsku lub polsku (np. Warsaw lub Warszawa)
          </p>
        </div>

        {/* GPS */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <LocateFixed className="h-4 w-4" />
            Lokalizacja GPS
          </Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDetectGps} disabled={isDetectingGps}>
              {isDetectingGps ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
              Pobierz lokalizacje
            </Button>
            {weatherLatitude !== null && weatherLongitude !== null && (
              <Badge variant="secondary">
                {weatherLatitude.toFixed(4)}, {weatherLongitude.toFixed(4)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Nie musisz podawac klucza API w aplikacji - pogoda pobiera dane po stronie serwera.
          </p>
        </div>

        {/* Test result */}
        {testResult && (
          <div
            className={`p-3 rounded-lg text-sm ${
              testResult.success
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
            }`}
          >
            {testResult.message}
          </div>
        )}

        <Separator />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={weatherLocationMode === "city" ? !weatherCity : weatherLatitude === null || weatherLongitude === null}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Testuj połączenie
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            Zapisz ustawienia
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ user, members, currentUserId }: SettingsClientProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Hook do zarządzania TTS
  const {
    enabled: ttsEnabled,
    setEnabled: setTtsEnabled,
    isSupported: ttsSupported,
    voices,
    selectedVoice,
    setVoice,
    rate,
    setRate,
    volume,
    setVolume,
    speak,
  } = useTTS();

  // Hook do zarządzania push notifications
  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    permission: pushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
  } = usePushNotifications();

  const [notificationSettings, setNotificationSettings] = useState({
    pushEnabled: user?.settings?.pushEnabled ?? true,
    emailEnabled: user?.settings?.emailEnabled ?? false,
    emailReports: (user?.settings as { emailReports?: boolean } | null)?.emailReports ?? false,
    ttsEnabled: user?.settings?.ttsEnabled ?? false,
    quietHoursStart: user?.settings?.quietHoursStart || "22:00",
    quietHoursEnd: user?.settings?.quietHoursEnd || "07:00",
  });

  // Preferencje żywieniowe
  const dietaryPrefs = (user?.settings?.dietaryPreferences as { allergies?: string[]; diets?: string[]; dislikes?: string[] } | null) || {};
  const [dietarySettings, setDietarySettings] = useState({
    allergies: dietaryPrefs.allergies || [],
    diets: dietaryPrefs.diets || [],
    dislikes: dietaryPrefs.dislikes || [],
  });
  const [newAllergy, setNewAllergy] = useState("");
  const [newDiet, setNewDiet] = useState("");
  const [newDislike, setNewDislike] = useState("");


  const handleSaveNotifications = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationSettings),
      });

      if (response.ok) {
        toast.success("Ustawienia powiadomień zostały zapisane");
      } else {
        toast.error("Nie udało się zapisać zmian");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDietary = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/user/dietary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dietarySettings),
      });

      if (response.ok) {
        toast.success("Preferencje żywieniowe zostały zapisane");
      } else {
        toast.error("Nie udało się zapisać zmian");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !dietarySettings.allergies.includes(newAllergy.trim())) {
      setDietarySettings({ ...dietarySettings, allergies: [...dietarySettings.allergies, newAllergy.trim()] });
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    setDietarySettings({ ...dietarySettings, allergies: dietarySettings.allergies.filter((a) => a !== allergy) });
  };

  const addDiet = () => {
    if (newDiet.trim() && !dietarySettings.diets.includes(newDiet.trim())) {
      setDietarySettings({ ...dietarySettings, diets: [...dietarySettings.diets, newDiet.trim()] });
      setNewDiet("");
    }
  };

  const removeDiet = (diet: string) => {
    setDietarySettings({ ...dietarySettings, diets: dietarySettings.diets.filter((d) => d !== diet) });
  };

  const addDislike = () => {
    if (newDislike.trim() && !dietarySettings.dislikes.includes(newDislike.trim())) {
      setDietarySettings({ ...dietarySettings, dislikes: [...dietarySettings.dislikes, newDislike.trim()] });
      setNewDislike("");
    }
  };

  const removeDislike = (dislike: string) => {
    setDietarySettings({ ...dietarySettings, dislikes: dietarySettings.dislikes.filter((d) => d !== dislike) });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ustawienia</h1>
        <p className="text-muted-foreground">
          Zarządzaj swoim kontem i preferencjami
        </p>
      </div>

      {/* Link do profilu */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <Link href="/profile">
            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Twój profil</p>
                  <p className="text-sm text-muted-foreground">
                    Zarządzaj swoim kontem, avatarem i danymi osobowymi
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </Link>
        </CardContent>
      </Card>

      <Tabs defaultValue="notifications" className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex h-auto w-max min-w-full flex-nowrap justify-start gap-2 p-1">
          <TabsTrigger value="appearance" className="flex-none items-center gap-2">
            <Palette className="h-4 w-4" />
            Wygląd
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-none items-center gap-2">
            <Bell className="h-4 w-4" />
            Powiadomienia
          </TabsTrigger>
          <TabsTrigger value="gamification" className="flex-none items-center gap-2">
            <Zap className="h-4 w-4" />
            Gamifikacja
          </TabsTrigger>
          <TabsTrigger value="security" className="flex-none items-center gap-2">
            <Shield className="h-4 w-4" />
            Bezpieczeństwo
          </TabsTrigger>
          <TabsTrigger value="dietary" className="flex-none items-center gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Dieta
          </TabsTrigger>
          <TabsTrigger value="household" className="flex-none items-center gap-2">
            <Home className="h-4 w-4" />
            Gospodarstwo
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-none items-center gap-2">
            <Calendar className="h-4 w-4" />
            Integracje
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex-none items-center gap-2">
            <Cloud className="h-4 w-4" />
            Pogoda
          </TabsTrigger>
          <TabsTrigger value="pwa" className="flex-none items-center gap-2">
            <Smartphone className="h-4 w-4" />
            PWA
          </TabsTrigger>
          <TabsTrigger value="data" className="flex-none items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dane
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Wygląd */}
        <TabsContent value="appearance">
          <AppearanceTab userSettings={user?.settings ?? null} />
        </TabsContent>

        {/* Gamifikacja (Dźwięki + Tour) */}
        <TabsContent value="gamification">
          <GamificationSettingsTab />
        </TabsContent>

        {/* Bezpieczeństwo */}
        <TabsContent value="security">
          <SecurityTab userId={currentUserId} />
        </TabsContent>

        {/* Dane & Export */}
        <TabsContent value="data">
          <DataExportTab userId={currentUserId} />
        </TabsContent>


        {/* Powiadomienia */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia powiadomień</CardTitle>
              <CardDescription>
                Skonfiguruj kiedy i jak chcesz otrzymywać powiadomienia
              </CardDescription>
            </CardHeader>
<CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Kanały powiadomień</h4>

                {/* Powiadomienia Push - rozszerzona sekcja */}
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Powiadomienia push</Label>
                      <p className="text-sm text-muted-foreground">
                        Na urządzeniach mobilnych i w przeglądarce
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.pushEnabled}
                      onCheckedChange={(v) =>
                        setNotificationSettings({ ...notificationSettings, pushEnabled: v })
                      }
                    />
                  </div>

                  {/* Status i przycisk aktywacji */}
                  {notificationSettings.pushEnabled && (
                    <div className="pt-2 border-t">
                      {!isPushSupported ? (
                        <p className="text-sm text-muted-foreground">
                          Twoja przeglądarka nie wspiera powiadomień push
                        </p>
                      ) : pushPermission === "denied" ? (
                        <p className="text-sm text-destructive">
                          Powiadomienia są zablokowane w przeglądarce. Odblokuj je w ustawieniach.
                        </p>
                      ) : isPushSubscribed ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <BellRing className="h-4 w-4" />
                            Powiadomienia push są aktywne
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const success = await unsubscribeFromPush();
                              if (success) {
                                toast.success("Wyłączono powiadomienia push");
                              } else {
                                toast.error("Nie udało się wyłączyć powiadomień");
                              }
                            }}
                            disabled={isPushLoading}
                          >
                            {isPushLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <BellOff className="h-4 w-4 mr-2" />
                                Wyłącz
                              </>
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Włącz powiadomienia, aby otrzymywać alerty na tym urządzeniu
                          </p>
                          <Button
                            size="sm"
                            onClick={async () => {
                              const success = await subscribeToPush();
                              if (success) {
                                toast.success("Włączono powiadomienia push");
                              } else {
                                toast.error("Nie udało się włączyć powiadomień");
                              }
                            }}
                            disabled={isPushLoading}
                          >
                            {isPushLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <BellRing className="h-4 w-4 mr-2" />
                                Aktywuj
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Powiadomienia email</Label>
                    <p className="text-sm text-muted-foreground">
                      Podsumowania i ważne alerty
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailEnabled}
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, emailEnabled: v })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Raporty email</Label>
                    <p className="text-sm text-muted-foreground">
                      Otrzymuj tygodniowe i miesięczne podsumowania
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailReports}
                    onCheckedChange={(v) =>
                      setNotificationSettings({ ...notificationSettings, emailReports: v })
                    }
                  />
                </div>

                {/* Text-to-Speech - Rozbudowany panel */}
                <div className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Text-to-Speech (TTS)</Label>
                      <p className="text-sm text-muted-foreground">
                        Odczytuj powiadomienia na głos
                      </p>
                    </div>
                    <Switch
                      checked={ttsEnabled}
                      onCheckedChange={setTtsEnabled}
                      disabled={!ttsSupported}
                    />
                  </div>

                  {/* Zaawansowane ustawienia TTS */}
                  {ttsEnabled && ttsSupported && (
                    <div className="pt-2 border-t space-y-4">
                      {/* Wybór głosu */}
                      <div className="space-y-2">
                        <Label>Głos</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {selectedVoice?.name || "Wybierz głos"}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[400px] max-h-[300px] overflow-y-auto">
                            {voices
                              .filter((v) => v.lang.startsWith("pl"))
                              .map((voice) => (
                                <DropdownMenuItem
                                  key={voice.name}
                                  onClick={() => setVoice(voice)}
                                  className={selectedVoice?.name === voice.name ? "bg-muted" : ""}
                                >
                                  <div className="flex flex-col">
                                    <span>{voice.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {voice.lang} • {voice.localService ? "Lokalny" : "Online"}
                                    </span>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Prędkość */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Prędkość: {rate.toFixed(1)}x</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => speak("To jest test prędkości czytania.")}
                          >
                            Testuj
                          </Button>
                        </div>
                        <Slider
                          value={[rate]}
                          onValueChange={(v) => setRate(v[0])}
                          min={0.5}
                          max={2}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Wolno</span>
                          <span>Normalnie</span>
                          <span>Szybko</span>
                        </div>
                      </div>

                      {/* Głośność */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Volume className="h-4 w-4" />
                            Głośność: {Math.round(volume * 100)}%
                          </Label>
                        </div>
                        <Slider
                          value={[volume]}
                          onValueChange={(v) => setVolume(v[0])}
                          min={0}
                          max={1}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Cicho</span>
                          <span>Głośno</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                        💡 TTS odczytuje powiadomienia push, zmiany obecności i inne alerty w czasie
                        rzeczywistym
                      </div>
                    </div>
                  )}

                  {!ttsSupported && (
                    <p className="text-sm text-muted-foreground">
                      Twoja przeglądarka nie wspiera funkcji Text-to-Speech
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Godziny ciszy</h4>
                <p className="text-sm text-muted-foreground">
                  W tych godzinach nie będziesz otrzymywać powiadomień
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Od</Label>
                    <Input
                      type="time"
                      value={notificationSettings.quietHoursStart}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          quietHoursStart: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Do</Label>
                    <Input
                      type="time"
                      value={notificationSettings.quietHoursEnd}
                      onChange={(e) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          quietHoursEnd: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz ustawienia
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dieta / Preferencje żywieniowe */}
        <TabsContent value="dietary">
          <Card>
            <CardHeader>
              <CardTitle>Preferencje żywieniowe</CardTitle>
              <CardDescription>
                Ustaw swoje alergie, diety i produkty, których nie lubisz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alergie */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Alergie i nietolerancje</Label>
                <p className="text-sm text-muted-foreground">
                  Produkty, na które jesteś uczulony/a
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="np. Orzechy, Gluten, Laktoza..."
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addAllergy()}
                  />
                  <Button onClick={addAllergy} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dietarySettings.allergies.map((allergy) => (
                    <Badge key={allergy} variant="destructive" className="gap-1">
                      {allergy}
                      <button onClick={() => removeAllergy(allergy)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {dietarySettings.allergies.length === 0 && (
                    <span className="text-sm text-muted-foreground">Brak alergii</span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Diety */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Diety i styl życia</Label>
                <p className="text-sm text-muted-foreground">
                  Np. wegetarianizm, weganizm, keto
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="np. Wegetariańska, Wegańska, Bezglutenowa..."
                    value={newDiet}
                    onChange={(e) => setNewDiet(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDiet()}
                  />
                  <Button onClick={addDiet} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dietarySettings.diets.map((diet) => (
                    <Badge key={diet} variant="secondary" className="gap-1">
                      {diet}
                      <button onClick={() => removeDiet(diet)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {dietarySettings.diets.length === 0 && (
                    <span className="text-sm text-muted-foreground">Brak diet</span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Niechciane produkty */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Produkty, których nie lubisz</Label>
                <p className="text-sm text-muted-foreground">
                  Produkty, które chcesz unikać w przepisach
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="np. Brokuły, Ryby, Grzyby..."
                    value={newDislike}
                    onChange={(e) => setNewDislike(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addDislike()}
                  />
                  <Button onClick={addDislike} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dietarySettings.dislikes.map((dislike) => (
                    <Badge key={dislike} variant="outline" className="gap-1">
                      {dislike}
                      <button onClick={() => removeDislike(dislike)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {dietarySettings.dislikes.length === 0 && (
                    <span className="text-sm text-muted-foreground">Brak</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveDietary} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  Zapisz preferencje
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gospodarstwo */}
        <TabsContent value="household" className="space-y-4">
          {/* Link do pełnych ustawień gospodarstwa */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <Link href="/settings/household">
                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Ustawienia gospodarstwa</p>
                      <p className="text-sm text-muted-foreground">
                        Zmień nazwę gospodarstwa i zarządzaj szczegółami
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gospodarstwo domowe</CardTitle>
              <CardDescription>
                {user?.household?.name || "Twoje gospodarstwo domowe"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Członkowie ({members.length})
                </h4>
                <div className="space-y-2">
                  {members.map((member) => {
                    const isAdmin = user?.role === "ADMIN";
                    const isSelf = member.id === currentUserId;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback
                              style={{ backgroundColor: member.color }}
                              className="text-white"
                            >
                              {member.name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {member.name}
                              {isSelf && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Ty
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        {isAdmin && !isSelf ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`cursor-pointer hover:opacity-80 ${roleColors[member.role as keyof typeof roleColors] || ""}`}
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                              </Badge>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(["ADMIN", "USER", "CHILD"] as const).map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/user/${member.id}/role`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ role }),
                                      });
                                      if (response.ok) {
                                        toast.success(`Zmieniono rolę na ${roleLabels[role]}`);
                                        window.location.reload();
                                      } else {
                                        const data = await response.json();
                                        toast.error(data.error || "Nie udało się zmienić roli");
                                      }
                                    } catch {
                                      toast.error("Wystąpił błąd");
                                    }
                                  }}
                                  className={member.role === role ? "bg-muted" : ""}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  {roleLabels[role]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge
                            variant="outline"
                            className={roleColors[member.role as keyof typeof roleColors] || ""}
                          >
                            <Shield className="h-3 w-3 mr-1" />
                            {roleLabels[member.role as keyof typeof roleLabels] || member.role}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Linki do innych ustawień */}
              <div className="space-y-2">
                <Link
                  href="/settings/categories"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Kategorie zadań</p>
                      <p className="text-sm text-muted-foreground">
                        Zarządzaj kategoriami dla zadań
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>

                <Link
                  href="/settings/audit"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Historia aktywności</p>
                      <p className="text-sm text-muted-foreground">
                        Przeglądaj historię zmian w gospodarstwie
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </div>

              <Separator />

              {/* Export danych */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export danych
                </h4>
                <p className="text-sm text-muted-foreground">
                  Pobierz swoje dane z aplikacji
                </p>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Pobierz dane (JSON)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integracje */}
        <TabsContent value="integrations">
          <CalendarIntegrationsManager />
        </TabsContent>

        {/* PWA */}
        <TabsContent value="pwa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Progressive Web App (PWA)
              </CardTitle>
              <CardDescription>
                Zainstaluj Family Planner jak aplikację natywną
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status instalacji */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  Status
                </h3>
                {typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-600" />
                    Aplikacja jest zainstalowana
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    Aplikacja nie jest zainstalowana
                  </div>
                )}
              </div>

              {/* Korzyści */}
              <div className="space-y-3">
                <h3 className="font-semibold">Korzyści z instalacji</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Zap className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Szybszy dostęp</p>
                      <p className="text-sm text-muted-foreground">
                        Uruchom aplikację bezpośrednio z ekranu głównego bez otwierania przeglądarki
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <WifiOff className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Działanie offline</p>
                      <p className="text-sm text-muted-foreground">
                        Przeglądaj dane i wykonuj akcje nawet bez połączenia z internetem
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Bell className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Powiadomienia push</p>
                      <p className="text-sm text-muted-foreground">
                        Otrzymuj powiadomienia o zadaniach, wydarzeniach i aktualizacjach
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Natywne doświadczenie</p>
                      <p className="text-sm text-muted-foreground">
                        Pełnoekranowy interfejs bez elementów przeglądarki
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Instrukcje instalacji - Android/Chrome */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Instalacja na Android / Chrome
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Otwórz aplikację w przeglądarce Chrome</li>
                  <li>Kliknij ikonę menu (⋮) w prawym górnym rogu</li>
                  <li>Wybierz &quot;Dodaj do ekranu głównego&quot; lub &quot;Zainstaluj aplikację&quot;</li>
                  <li>Potwierdź instalację</li>
                </ol>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-primary font-medium">
                    💡 Wskazówka: Po otwarciu strony może pojawić się automatyczny komunikat z pytaniem o instalację
                  </p>
                </div>
              </div>

              <Separator />

              {/* Instrukcje instalacji - iOS/Safari */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Instalacja na iPhone / iPad (Safari)
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Otwórz aplikację w przeglądarce Safari</li>
                  <li>Dotknij ikonę &quot;Udostępnij&quot; <span className="inline-block">⬆️</span> na dole ekranu</li>
                  <li>Przewiń w dół i wybierz &quot;Dodaj do ekranu głównego&quot;</li>
                  <li>Opcjonalnie zmień nazwę aplikacji</li>
                  <li>Dotknij &quot;Dodaj&quot; w prawym górnym rogu</li>
                </ol>
              </div>

              <Separator />

              {/* Instrukcje instalacji - Desktop */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Instalacja na komputerze (Chrome/Edge)
                </h3>
                <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Otwórz aplikację w przeglądarce Chrome lub Edge</li>
                  <li>Kliknij ikonę instalacji (➕) w pasku adresu</li>
                  <li>Kliknij &quot;Zainstaluj&quot;</li>
                </ol>
                <p className="text-sm text-muted-foreground">
                  Lub użyj menu: <strong>⋮</strong> → <strong>Zapisz i udostępnij</strong> → <strong>Zainstaluj Family Planner</strong>
                </p>
              </div>

              <Separator />

              {/* Informacje techniczne */}
              <div className="space-y-3">
                <h3 className="font-semibold">Informacje techniczne</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>Service Worker:</strong> Włączony ✓</p>
                  <p>• <strong>Cache Strategy:</strong> Network First dla API, Cache First dla statycznych zasobów</p>
                  <p>• <strong>Offline Mode:</strong> Dostępny ✓</p>
                  <p>• <strong>Manifest:</strong> Skonfigurowany ✓</p>
                </div>
              </div>

              <Separator />

              {/* Resetowanie PWA */}
              <div className="space-y-3">
                <h3 className="font-semibold text-destructive">Zaawansowane</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Czy na pewno chcesz wyczyścić cache PWA? Aplikacja zostanie odświeżona.')) {
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then((registrations) => {
                          registrations.forEach((registration) => {
                            registration.unregister();
                          });
                        });
                      }
                      if ('caches' in window) {
                        caches.keys().then((names) => {
                          names.forEach((name) => {
                            caches.delete(name);
                          });
                        });
                      }
                      localStorage.removeItem('pwa-install-dismissed');
                      localStorage.removeItem('pwa-install-dismissed-date');
                      toast.success('Cache PWA wyczyszczony. Odśwież stronę.');
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Wyczyść cache PWA
                </Button>
                <p className="text-xs text-muted-foreground">
                  Użyj tej opcji jeśli aplikacja działa nieprawidłowo lub chcesz ponownie zobaczyć komunikat instalacyjny
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pogoda */}
        <TabsContent value="weather">
          <WeatherSettingsCard userSettings={user?.settings || null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
