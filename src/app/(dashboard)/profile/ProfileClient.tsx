"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Palette, User as UserIcon, Home, Cake, Moon, Sun, Monitor, Calendar, Plus, Trash2, Copy, RefreshCw, Users, Link2, Unlink } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { useTheme } from "next-themes";
import { useAccentColor } from "@/hooks/useAccentColor";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ThemeSelector } from "@/components/gamification/ThemeSelector";
import { ImageUpload } from "@/components/inventory/ImageUpload";
import { Separator } from "@/components/ui/separator";
import {
  getNameDayDateOptionsByName,
  getNameDayNames,
  isValidNameDayFormat,
  normalizeNameDayInput,
} from "@/lib/namedays-resolver";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  color: string;
  birthDate: Date | null;
  nameDay: string | null;
  role: string;
  householdId: string | null;
  household: {
    id: string;
    name: string;
  } | null;
}

interface ProfileClientProps {
  user: User;
}

interface Anniversary {
  id: string;
  title: string;
  description: string | null;
  date: string;
  type: string;
  color: string;
  user?: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface HouseholdMember {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  color: string;
  role: string;
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    avatar: user.avatar || "",
    color: user.color,
    birthDate: user.birthDate ? format(new Date(user.birthDate), "yyyy-MM-dd") : "",
    nameDay: user.nameDay || "",
  });

  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor, accentColors } = useAccentColor();
  const [mounted, setMounted] = useState(false);
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [loadingAnniversaries, setLoadingAnniversaries] = useState(true);
  const [showAddAnniversary, setShowAddAnniversary] = useState(false);
  const [newAnniversary, setNewAnniversary] = useState<{
    title: string;
    description: string;
    date: string;
    type: "WEDDING" | "ENGAGEMENT" | "FIRST_DATE" | "MOVING" | "JOB_START" | "GRADUATION" | "OTHER";
    color: string;
  }>({
    title: "",
    description: "",
    date: "",
    type: "OTHER",
    color: "#EC4899",
  });
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loadingInviteCode, setLoadingInviteCode] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [oauthConnections, setOauthConnections] = useState<{
    google: boolean;
    facebook: boolean;
    microsoft: boolean;
  }>({ google: false, facebook: false, microsoft: false });
  const [loadingOAuth, setLoadingOAuth] = useState(true);
  const [preferFirstAutoNameDay, setPreferFirstAutoNameDay] = useState(true);

  const normalizedProfileNameDay = normalizeNameDayInput(formData.nameDay || "");
  const nameDayOptionsFromTypedValue =
    !normalizedProfileNameDay && formData.nameDay
      ? getNameDayDateOptionsByName(formData.nameDay)
      : [];
  const nameDayOptionsFromName = getNameDayDateOptionsByName(formData.name || "");
  const profileNameDayOptions =
    nameDayOptionsFromTypedValue.length > 0 ? nameDayOptionsFromTypedValue : nameDayOptionsFromName;

  // Unikamy hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("namedays-prefer-first-auto");
    if (stored === "false") {
      setPreferFirstAutoNameDay(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("namedays-prefer-first-auto", String(preferFirstAutoNameDay));
  }, [preferFirstAutoNameDay]);

  useEffect(() => {
    if (formData.nameDay) return;
    if (profileNameDayOptions.length === 0) return;
    if (profileNameDayOptions.length > 1 && !preferFirstAutoNameDay) return;

    setFormData((prev) => ({ ...prev, nameDay: profileNameDayOptions[0] }));
  }, [formData.nameDay, profileNameDayOptions, preferFirstAutoNameDay]);

  // Ładuj rocznice i OAuth connections
  useEffect(() => {
    fetchOAuthConnections();
    if (user.householdId) {
      fetchAnniversaries();
      fetchHouseholdMembers();
    } else {
      setLoadingAnniversaries(false);
      setLoadingMembers(false);
    }
  }, [user.householdId]);

  const fetchOAuthConnections = async () => {
    try {
      const response = await fetch("/api/user/oauth-connections");
      if (response.ok) {
        const data = await response.json();
        setOauthConnections(data);
      }
    } catch (error) {
      console.error("Error fetching OAuth connections:", error);
    } finally {
      setLoadingOAuth(false);
    }
  };

  const handleConnectOAuth = async (provider: string) => {
    // Redirect to OAuth provider
    window.location.href = `/api/auth/signin/${provider}?callbackUrl=/profile`;
  };

  const handleDisconnectOAuth = async (provider: string) => {
    if (!confirm(`Czy na pewno chcesz odłączyć konto ${provider}?`)) return;

    try {
      const response = await fetch(`/api/user/oauth-connections/${provider}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`Konto ${provider} zostało odłączone`);
        fetchOAuthConnections();
      } else {
        throw new Error("Nie udało się odłączyć konta");
      }
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error);
      toast.error("Nie udało się odłączyć konta");
    }
  };

  const fetchAnniversaries = async () => {
    try {
      const response = await fetch("/api/anniversaries");
      if (response.ok) {
        const data = await response.json();
        setAnniversaries(data);
      }
    } catch (error) {
      console.error("Error fetching anniversaries:", error);
    } finally {
      setLoadingAnniversaries(false);
    }
  };

  const fetchHouseholdMembers = async () => {
    try {
      const response = await fetch("/api/household");
      if (response.ok) {
        const data = await response.json();
        setHouseholdMembers(data.members || []);
      }
    } catch (error) {
      console.error("Error fetching household members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchInviteCode = async () => {
    setLoadingInviteCode(true);
    try {
      const response = await fetch("/api/household/invite");
      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.inviteCode);
      } else {
        toast.error("Nie udało się pobrać kodu zaproszenia");
      }
    } catch (error) {
      console.error("Error fetching invite code:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const generateNewInviteCode = async () => {
    setLoadingInviteCode(true);
    try {
      const response = await fetch("/api/household/invite", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setInviteCode(data.inviteCode);
        toast.success("Wygenerowano nowy kod zaproszenia");
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się wygenerować kodu");
      }
    } catch (error) {
      console.error("Error generating invite code:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoadingInviteCode(false);
    }
  };

  const copyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      toast.success("Kod skopiowany do schowka");
    }
  };

  const handleDeleteAnniversary = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę rocznicę?")) return;

    try {
      const response = await fetch(`/api/anniversaries/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Rocznica została usunięta");
        fetchAnniversaries();
      } else {
        throw new Error("Nie udało się usunąć rocznicy");
      }
    } catch (error) {
      console.error("Error deleting anniversary:", error);
      toast.error("Nie udało się usunąć rocznicy");
    }
  };

  const handleAddAnniversary = async () => {
    if (!newAnniversary.title || !newAnniversary.date) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    try {
      const response = await fetch("/api/anniversaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnniversary),
      });

      if (response.ok) {
        toast.success("Rocznica została dodana");
        setShowAddAnniversary(false);
        setNewAnniversary({
          title: "",
          description: "",
          date: "",
          type: "OTHER",
          color: "#EC4899",
        });
        fetchAnniversaries();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Nie udało się dodać rocznicy");
      }
    } catch (error) {
      console.error("Error adding anniversary:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się dodać rocznicy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          avatar: formData.avatar || null,
          color: formData.color,
          birthDate: formData.birthDate || null,
          nameDay: formData.nameDay || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Nie udało się zaktualizować profilu");
      }

      toast.success("Profil został zaktualizowany");
      // Odśwież stronę aby zobaczyć zmiany
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error instanceof Error ? error.message : "Nie udało się zaktualizować profilu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 h-[calc(100vh-4rem)] flex flex-col">
      <h1 className="text-3xl font-bold mb-6">Profil użytkownika</h1>

      <Tabs defaultValue="personal" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-5 gap-1 mb-6">
          <TabsTrigger value="personal" className="flex items-center gap-1 px-2">
            <UserIcon className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Informacje</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-1 px-2">
            <Palette className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Wygląd</span>
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-1 px-2">
            <Link2 className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Połączenia</span>
          </TabsTrigger>
          <TabsTrigger value="anniversaries" className="flex items-center gap-1 px-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Rocznice</span>
          </TabsTrigger>
          <TabsTrigger value="household" className="flex items-center gap-1 px-2">
            <Home className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Gospodarstwo</span>
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Zakładka: Informacje osobiste */}
          <TabsContent value="personal" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Informacje osobiste</CardTitle>
                <CardDescription>
                  Zarządzaj swoimi danymi osobowymi i preferencjami
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={formData.avatar || ""} />
                      <AvatarFallback style={{ backgroundColor: formData.color }}>
                        {formData.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{formData.name || "Użytkownik"}</p>
                      <p className="text-xs text-muted-foreground">{formData.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Własny avatar</Label>
                    <ImageUpload
                      value={formData.avatar || null}
                      onChange={(url) => setFormData((prev) => ({ ...prev, avatar: url }))}
                      onRemove={() => setFormData((prev) => ({ ...prev, avatar: "" }))}
                      maxSizeMB={3}
                      folder="avatars"
                    />
                    <p className="text-xs text-muted-foreground">
                      Przesłany obraz zostanie użyty jako Twój avatar.
                    </p>
                  </div>

                  {/* Imię */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      <UserIcon className="inline h-4 w-4 mr-2" />
                      Imię
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Twoje imię"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="twoj@email.com"
                    />
                  </div>

                  {/* Data urodzin */}
                  <div className="space-y-2">
                    <Label htmlFor="birthDate">
                      <Cake className="inline h-4 w-4 mr-2" />
                      Data urodzin
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    />
                  </div>

                  {/* Dzień imienin */}
                  <div className="space-y-2">
                    <Label htmlFor="nameDay">
                      <Calendar className="inline h-4 w-4 mr-2" />
                      Imieniny (DD-MM lub imie)
                    </Label>
                    <Input
                      id="nameDay"
                      value={formData.nameDay}
                      onChange={(e) => setFormData({ ...formData, nameDay: e.target.value })}
                      placeholder="np. Jan albo 24-06"
                    />
                    <p className="text-xs text-muted-foreground">
                      Wpisz imie, aby system sam dobral date, albo wpisz date recznie (DD-MM)
                    </p>

                    {profileNameDayOptions.length > 1 && (
                      <div className="space-y-2 rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Preferuj pierwsza date automatycznie</p>
                            <p className="text-xs text-muted-foreground">
                              Wylacz, aby zawsze wybierac recznie przy wielu dopasowaniach
                            </p>
                          </div>
                          <Switch
                            checked={preferFirstAutoNameDay}
                            onCheckedChange={setPreferFirstAutoNameDay}
                          />
                        </div>

                        <Select
                          value={isValidNameDayFormat(formData.nameDay) ? formData.nameDay : undefined}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, nameDay: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz prawidlowa date imienin" />
                          </SelectTrigger>
                          <SelectContent>
                            {profileNameDayOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {isValidNameDayFormat(formData.nameDay) && (
                      <p className="text-xs text-muted-foreground">
                        Imiona tego dnia: {getNameDayNames(formData.nameDay).join(", ") || "-"}
                      </p>
                    )}
                  </div>

                  {/* Kolor */}
                  <div className="space-y-2">
                    <Label htmlFor="color">
                      <Palette className="inline h-4 w-4 mr-2" />
                      Kolor profilu
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3B82F6"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Zapisywanie..." : "Zapisz zmiany"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zakładka: Wygląd */}
          <TabsContent value="appearance" className="mt-0">
            {mounted && (
              <Card>
                <CardHeader>
                  <CardTitle>Motywy kolorystyczne</CardTitle>
                  <CardDescription>
                    Dostosuj wygląd aplikacji do swoich preferencji
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wybór motywu (light/dark/system) */}
                  <div className="space-y-3">
                    <Label>Motyw interfejsu</Label>
                    <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                      <div>
                        <RadioGroupItem value="light" id="light" className="peer sr-only" />
                        <Label
                          htmlFor="light"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Sun className="mb-3 h-6 w-6" />
                          <span className="text-sm font-medium">Jasny</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                        <Label
                          htmlFor="dark"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Moon className="mb-3 h-6 w-6" />
                          <span className="text-sm font-medium">Ciemny</span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="system" id="system" className="peer sr-only" />
                        <Label
                          htmlFor="system"
                          className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                          <Monitor className="mb-3 h-6 w-6" />
                          <span className="text-sm font-medium">Systemowy</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Wybór koloru akcentu */}
                  <div className="space-y-3">
                    <Label>Kolor akcentu</Label>
                    <div className="grid grid-cols-5 gap-3">
                      {accentColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => {
                            setAccentColor(color.name);
                            toast.success(`Zmieniono kolor akcentu na ${color.label}`);
                          }}
                          className={`relative h-12 rounded-md border-2 transition-all hover:scale-105 ${
                            accentColor === color.name
                              ? "border-foreground ring-2 ring-offset-2 ring-foreground"
                              : "border-muted"
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.label}
                        >
                          {accentColor === color.name && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white shadow-lg" />
                            </div>
                          )}
                          <span className="sr-only">{color.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aktualny kolor: <span className="font-medium">{accentColors.find(c => c.name === accentColor)?.label}</span>
                    </p>
                  </div>

                  <Separator className="my-4" />

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Motywy z nagród</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tu możesz aktywować kupione motywy gamifikacyjne.
                    </p>
                    <ThemeSelector />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Zakładka: Połączenia OAuth */}
          <TabsContent value="oauth" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Połącz konta społecznościowe</CardTitle>
                <CardDescription>
                  Zarządzaj połączeniami z zewnętrznymi dostawcami. Połączenie konta umożliwia szybkie logowanie i synchronizację kalendarza.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingOAuth ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    <p>Ładowanie połączeń...</p>
                  </div>
                ) : (
                  <>
                    {/* Google */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border">
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">Google</h3>
                          <p className="text-sm text-muted-foreground">
                            {oauthConnections.google ? "Połączone - synchronizacja kalendarza aktywna" : "Nie połączone"}
                          </p>
                        </div>
                      </div>
                      {oauthConnections.google ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectOAuth("google")}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Odłącz
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnectOAuth("google")}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Połącz
                        </Button>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[#1877F2] flex items-center justify-center">
                          <svg className="h-6 w-6" fill="white" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">Facebook</h3>
                          <p className="text-sm text-muted-foreground">
                            {oauthConnections.facebook ? "Połączone" : "Nie połączone"}
                          </p>
                        </div>
                      </div>
                      {oauthConnections.facebook ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectOAuth("facebook")}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Odłącz
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnectOAuth("facebook")}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Połącz
                        </Button>
                      )}
                    </div>

                    {/* Microsoft */}
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border">
                          <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                            <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                            <path fill="#f35325" d="M1 1h10v10H1z"/>
                            <path fill="#81bc06" d="M12 1h10v10H12z"/>
                            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                            <path fill="#ffba08" d="M12 12h10v10H12z"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-medium">Microsoft</h3>
                          <p className="text-sm text-muted-foreground">
                            {oauthConnections.microsoft ? "Połączone - synchronizacja kalendarza aktywna" : "Nie połączone"}
                          </p>
                        </div>
                      </div>
                      {oauthConnections.microsoft ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectOAuth("microsoft")}
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Odłącz
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnectOAuth("microsoft-entra-id")}
                        >
                          <Link2 className="h-4 w-4 mr-2" />
                          Połącz
                        </Button>
                      )}
                    </div>

                    <div className="mt-6 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">ℹ️ Informacje</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Połączenie z Google lub Microsoft automatycznie synchronizuje Twój kalendarz</li>
                        <li>• Możesz używać połączonych kont do szybkiego logowania</li>
                        <li>• Odłączenie konta nie usunie Twojego profilu</li>
                        <li>• Wszystkie dane są bezpiecznie przechowywane</li>
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zakładka: Rocznice */}
          <TabsContent value="anniversaries" className="mt-0">
            {user.householdId && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Ważne rocznice</CardTitle>
                      <CardDescription>
                        Śluby, zaręczyny, ważne wydarzenia
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddAnniversary(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Dodaj
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingAnniversaries ? (
                    <p className="text-sm text-muted-foreground">Ładowanie...</p>
                  ) : anniversaries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Brak zapisanych rocznic. Kliknij &quot;Dodaj&quot;, aby utworzyć pierwszą.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {anniversaries.map((anniversary) => {
                        const date = new Date(anniversary.date);
                        const yearsAgo = new Date().getFullYear() - date.getFullYear();
                        return (
                          <div
                            key={anniversary.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: anniversary.color }}
                              />
                              <div>
                                <p className="font-medium">{anniversary.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(date, "d MMMM yyyy", { locale: pl })}
                                  {yearsAgo > 0 && ` • ${yearsAgo} ${yearsAgo === 1 ? 'rok' : yearsAgo < 5 ? 'lata' : 'lat'} temu`}
                                </p>
                                {anniversary.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {anniversary.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAnniversary(anniversary.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Zakładka: Gospodarstwo domowe */}
          <TabsContent value="household" className="mt-0 space-y-6">
            {user.household ? (
              <>
                {/* Informacje podstawowe */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informacje o gospodarstwie</CardTitle>
                    <CardDescription>
                      Podstawowe dane Twojego gospodarstwa domowego
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Nazwa gospodarstwa</p>
                        <p className="text-lg font-semibold">{user.household.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Twoja rola</p>
                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                          {user.role === "ADMIN" ? "Administrator" : user.role === "CHILD" ? "Dziecko" : "Użytkownik"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Zapraszanie członków */}
                {user.role === "ADMIN" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        <Users className="inline h-5 w-5 mr-2" />
                        Zaproś członków
                      </CardTitle>
                      <CardDescription>
                        Udostępnij kod zaproszenia innym osobom, aby dołączyły do gospodarstwa
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {inviteCode ? (
                        <>
                          <div>
                            <Label htmlFor="invite-code">Kod zaproszenia</Label>
                            <div className="flex gap-2 mt-2">
                              <Input
                                id="invite-code"
                                value={inviteCode}
                                readOnly
                                className="font-mono text-lg"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={copyInviteCode}
                                title="Skopiuj kod"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={generateNewInviteCode}
                                disabled={loadingInviteCode}
                                title="Wygeneruj nowy kod"
                              >
                                <RefreshCw className={`h-4 w-4 ${loadingInviteCode ? 'animate-spin' : ''}`} />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            💡 Udostępnij ten kod osobom, które chcesz zaprosić. Mogą użyć go podczas rejestracji lub w swoich ustawieniach.
                          </p>
                        </>
                      ) : (
                        <Button onClick={fetchInviteCode} disabled={loadingInviteCode}>
                          {loadingInviteCode ? "Ładowanie..." : "Pokaż kod zaproszenia"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Lista członków */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Users className="inline h-5 w-5 mr-2" />
                      Członkowie gospodarstwa
                    </CardTitle>
                    <CardDescription>
                      {loadingMembers ? "Ładowanie..." : `${householdMembers.length} ${householdMembers.length === 1 ? 'osoba' : householdMembers.length < 5 ? 'osoby' : 'osób'}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingMembers ? (
                      <p className="text-sm text-muted-foreground">Ładowanie członków...</p>
                    ) : householdMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Brak członków</p>
                    ) : (
                      <div className="space-y-3">
                        {householdMembers.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={member.avatar || ""} />
                                <AvatarFallback style={{ backgroundColor: member.color }}>
                                  {member.name?.[0]?.toUpperCase() || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name || "Bez nazwy"}</p>
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <Badge variant={member.role === "ADMIN" ? "default" : "secondary"}>
                              {member.role === "ADMIN" ? "Administrator" : member.role === "CHILD" ? "Dziecko" : "Użytkownik"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Brak gospodarstwa domowego</CardTitle>
                  <CardDescription>
                    Nie jesteś przypisany do żadnego gospodarstwa domowego
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Aby dołączyć do gospodarstwa, poproś administratora o kod zaproszenia.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Dialog dodawania rocznicy */}
      <Dialog open={showAddAnniversary} onOpenChange={setShowAddAnniversary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj ważną rocznicę</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="anniversary-title">Tytuł *</Label>
              <Input
                id="anniversary-title"
                value={newAnniversary.title}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, title: e.target.value })}
                placeholder="np. Ślub, Zaręczyny"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary-type">Typ</Label>
              <Select
                value={newAnniversary.type}
                onValueChange={(value: "WEDDING" | "ENGAGEMENT" | "FIRST_DATE" | "MOVING" | "JOB_START" | "GRADUATION" | "OTHER") => setNewAnniversary({ ...newAnniversary, type: value })}
              >
                <SelectTrigger id="anniversary-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEDDING">💍 Ślub</SelectItem>
                  <SelectItem value="ENGAGEMENT">💑 Zaręczyny</SelectItem>
                  <SelectItem value="FIRST_DATE">❤️ Pierwsza randka</SelectItem>
                  <SelectItem value="MOVING">🏠 Przeprowadzka</SelectItem>
                  <SelectItem value="JOB_START">💼 Początek pracy</SelectItem>
                  <SelectItem value="GRADUATION">🎓 Ukończenie szkoły</SelectItem>
                  <SelectItem value="OTHER">📅 Inne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary-date">Data *</Label>
              <Input
                id="anniversary-date"
                type="date"
                value={newAnniversary.date}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary-description">Opis</Label>
              <Textarea
                id="anniversary-description"
                value={newAnniversary.description}
                onChange={(e) => setNewAnniversary({ ...newAnniversary, description: e.target.value })}
                placeholder="Opcjonalny opis wydarzenia"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anniversary-color">Kolor</Label>
              <div className="flex gap-2">
                <Input
                  id="anniversary-color"
                  type="color"
                  value={newAnniversary.color}
                  onChange={(e) => setNewAnniversary({ ...newAnniversary, color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={newAnniversary.color}
                  onChange={(e) => setNewAnniversary({ ...newAnniversary, color: e.target.value })}
                  placeholder="#EC4899"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAnniversary(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddAnniversary}>
              Dodaj rocznicę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

