"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  Calendar as CalendarIcon,
  Loader2,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface CalendarExportProps {
  className?: string;
}

export function CalendarExport({ className }: CalendarExportProps) {
  const [syncUrl, setSyncUrl] = useState("");
  const [webcalUrl, setWebcalUrl] = useState("");
  const [copied, setCopied] = useState<"http" | "webcal" | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSyncUrl, setLoadingSyncUrl] = useState(true);

  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeMeals, setIncludeMeals] = useState(true);

  useEffect(() => {
    fetchSyncUrl();
  }, []);

  const fetchSyncUrl = async () => {
    setLoadingSyncUrl(true);
    try {
      const response = await fetch("/api/calendar/syncurl");
      if (response.ok) {
        const data = await response.json();
        setSyncUrl(data.syncUrl);
        setWebcalUrl(data.webcalUrl);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch sync URL:", response.status, errorData);
        toast.error("Nie udało się wygenerować URL synchronizacji");
      }
    } catch (error) {
      console.error("Error fetching sync URL:", error);
      toast.error("Wystąpił błąd podczas generowania URL");
    } finally {
      setLoadingSyncUrl(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        events: includeEvents.toString(),
        tasks: includeTasks.toString(),
        meals: includeMeals.toString(),
      });

      const response = await fetch(`/api/calendar/export?${params}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "planner-calendar.ics";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Kalendarz został wyeksportowany");
      } else {
        toast.error("Nie udało się wyeksportować kalendarza");
      }
    } catch (error) {
      console.error("Error exporting calendar:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "http" | "webcal") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success("Skopiowano do schowka!");
      setTimeout(() => setCopied(null), 3000);
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  const handleAddIntegration = async (type: string) => {
    try {
      const response = await fetch("/api/calendar/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        toast.success(`Dodano integrację z ${type === "GOOGLE" ? "Google Calendar" : "Apple Calendar"}!`);
      } else {
        const data = await response.json();
        if (data.error?.includes("już istnieje")) {
          toast.info("Ta integracja jest już aktywna");
        } else {
          toast.error("Nie udało się dodać integracji");
        }
      }
    } catch (error) {
      console.error("Error adding integration:", error);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Export jednorazowy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Pobierz kalendarz (.ics)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pobierz plik .ics z aktualnym stanem kalendarza (ostatni miesiąc + 3 miesiące naprzód).
            Ten plik możesz otworzyć w dowolnej aplikacji kalendarza.
          </p>

          {/* Opcje eksportu */}
          <div className="space-y-2">
            <Label>Co chcesz wyeksportować:</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="events"
                  checked={includeEvents}
                  onCheckedChange={(checked) => setIncludeEvents(checked as boolean)}
                />
                <label htmlFor="events" className="text-sm cursor-pointer">
                  Wydarzenia
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tasks"
                  checked={includeTasks}
                  onCheckedChange={(checked) => setIncludeTasks(checked as boolean)}
                />
                <label htmlFor="tasks" className="text-sm cursor-pointer">
                  Zadania
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="meals"
                  checked={includeMeals}
                  onCheckedChange={(checked) => setIncludeMeals(checked as boolean)}
                />
                <label htmlFor="meals" className="text-sm cursor-pointer">
                  Posiłki
                </label>
              </div>
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            {loading ? "Pobieranie..." : "Pobierz plik .ics"}
          </Button>

          <Alert>
            <AlertDescription className="text-xs">
              💡 <strong>Wskazówka:</strong> To jest jednorazowy export. Jeśli chcesz aby kalendarz
              automatycznie aktualizował się przy zmianach, użyj Automatycznej synchronizacji poniżej.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Auto-synchronizacja */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Automatyczna Synchronizacja
            </CardTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Rekomendowane
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-primary/5 border-primary/20">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Jak to działa?</strong>
              <p className="mt-2 text-sm">
                Nasza aplikacja wygenerowała dla Ciebie unikalny link do kalendarza.
                Dodaj ten link do swojej aplikacji kalendarza (Google Calendar, Apple Calendar, Outlook)
                a wszystkie Twoje wydarzenia, zadania i posiłki będą automatycznie się synchronizować!
              </p>
            </AlertDescription>
          </Alert>

          {loadingSyncUrl ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Generowanie unikalnego linku...</span>
            </div>
          ) : syncUrl ? (
            <>
              {/* Szybkie dodawanie */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    ⚡
                  </div>
                  <Label className="text-base font-semibold">Dodaj w 1 kliknięciu</Label>
                  <Badge variant="secondary" className="ml-auto">Najłatwiej</Badge>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 hover:bg-primary/5 hover:border-primary"
                    onClick={() => {
                      handleAddIntegration("GOOGLE");
                      window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(syncUrl)}`, '_blank');
                    }}
                  >
                    <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                    <div className="text-left">
                      <div className="font-semibold">Google Calendar</div>
                      <div className="text-xs text-muted-foreground">Otwiera w nowej karcie</div>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 hover:bg-primary/5 hover:border-primary"
                    onClick={() => {
                      handleAddIntegration("APPLE");
                      window.location.href = webcalUrl;
                    }}
                  >
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
                    <div className="text-left">
                      <div className="font-semibold">Apple Calendar</div>
                      <div className="text-xs text-muted-foreground">Otwiera w aplikacji</div>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </Button>
                </div>

                <Alert className="bg-white dark:bg-gray-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs">
                    Kliknij przycisk swojego kalendarza - aplikacja automatycznie rozpocznie proces dodawania!
                  </AlertDescription>
                </Alert>
              </div>

              {/* LUB separator */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">lub ręcznie</span>
                </div>
              </div>

              {/* Krok 1: Skopiuj link */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-bold">
                    1
                  </div>
                  <Label className="text-base font-semibold">Lub skopiuj link ręcznie</Label>
                </div>

                {/* Google Calendar / Outlook */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Dla Google Calendar i Outlook:
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={syncUrl}
                      readOnly
                      className="font-mono text-xs"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant={copied === "http" ? "default" : "outline"}
                      size="icon"
                      onClick={() => copyToClipboard(syncUrl, "http")}
                      className="shrink-0"
                    >
                      {copied === "http" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Apple Calendar */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Dla Apple Calendar (Mac, iPhone, iPad):
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={webcalUrl}
                      readOnly
                      className="font-mono text-xs"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant={copied === "webcal" ? "default" : "outline"}
                      size="icon"
                      onClick={() => copyToClipboard(webcalUrl, "webcal")}
                      className="shrink-0"
                    >
                      {copied === "webcal" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Krok 2: Instrukcje */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    2
                  </div>
                  <Label className="text-base font-semibold">Dodaj do swojego kalendarza</Label>
                </div>

                <div className="grid gap-3">
                  {/* Google Calendar */}
                  <Card className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Google Calendar</p>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Otwórz <a href="https://calendar.google.com" target="_blank" rel="noopener" className="text-primary hover:underline">Google Calendar</a></li>
                          <li>Kliknij <strong>+</strong> obok &quot;Inne kalendarze&quot;</li>
                          <li>Wybierz <strong>Z adresu URL</strong></li>
                          <li>Wklej skopiowany link (ten pierwszy)</li>
                          <li>Kliknij <strong>Dodaj kalendarz</strong></li>
                        </ol>
                      </div>
                    </div>
                  </Card>

                  {/* Apple Calendar */}
                  <Card className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold">Apple Calendar (Mac)</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Otwórz aplikację <strong>Kalendarz</strong></li>
                          <li>Menu: <strong>Plik → Nowa subskrypcja kalendarza</strong></li>
                          <li>Wklej link <strong>webcal://</strong> (ten drugi)</li>
                          <li>Kliknij <strong>Subskrybuj</strong></li>
                          <li>Ustaw częstotliwość odświeżania: <strong>Co godzinę</strong></li>
                        </ol>
                      </div>
                    </div>
                  </Card>

                  {/* Outlook */}
                  <Card className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="font-semibold">Outlook</p>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                          <li>Otwórz Outlook Calendar</li>
                          <li>Kliknij <strong>Dodaj kalendarz</strong></li>
                          <li>Wybierz <strong>Subskrybuj z sieci</strong></li>
                          <li>Wklej skopiowany link (ten pierwszy)</li>
                          <li>Kliknij <strong>Importuj</strong></li>
                        </ol>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Informacje dodatkowe */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <span className="font-medium">Automatyczna aktualizacja co 1 godzinę</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Link jest prywatny i unikalny dla Twojego konta</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">Wszystkie zmiany w aplikacji będą widoczne w Twoim kalendarzu</span>
                </div>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                Nie udało się wygenerować linku synchronizacji. Spróbuj odświeżyć stronę.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

