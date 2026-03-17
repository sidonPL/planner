"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Calendar,
  Plus,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  type: string;
  name: string | null;
  icalUrl: string | null;
  syncInterval: number | null;
  eventFilter: string | null;
  colorMapping: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  calendarId: string | null;
  lastSync: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  isActive: boolean;
  createdAt: Date;
  _count: {
    importedEvents: number;
  };
}

interface CalendarIntegrationsClientProps {
  integrations: Integration[];
}

export function CalendarIntegrationsClient({ integrations: initialIntegrations }: CalendarIntegrationsClientProps) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newSubscription, setNewSubscription] = useState({
    name: "",
    icalUrl: "",
    syncInterval: 60,
    eventFilter: "",
    colorMapping: "",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Dodaj subskrypcję URL
  const handleAddSubscription = async () => {
    if (!newSubscription.name || !newSubscription.icalUrl) {
      toast.error("Wypełnij wszystkie pola");
      return;
    }

    try {
      const response = await fetch("/api/calendar/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubscription),
      });

      if (response.ok) {
        const integration = await response.json();
        setIntegrations([integration, ...integrations]);
        setIsAddDialogOpen(false);
        setNewSubscription({ name: "", icalUrl: "", syncInterval: 60, eventFilter: "", colorMapping: "" });

        // Uruchom pierwszą synchronizację
        toast.success("Subskrypcja dodana! Synchronizuję...");
        handleSync(integration.id);
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się dodać subskrypcji");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  // Synchronizuj konkretną subskrypcję
  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      const response = await fetch(`/api/calendar/subscriptions/${id}/sync`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Zsynchronizowano ${result.eventsImported} wydarzeń`);

        // Odśwież listę
        const updatedResponse = await fetch("/api/calendar/subscriptions");
        const updatedIntegrations = await updatedResponse.json();
        setIntegrations(updatedIntegrations);
      } else {
        const error = await response.json();
        toast.error(error.error || "Synchronizacja nie powiodła się");
      }
    } catch (error) {
      toast.error("Wystąpił błąd podczas synchronizacji");
      console.error(error);
    } finally {
      setSyncingId(null);
    }
  };

  // Usuń subskrypcję
  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę subskrypcję? Zaimportowane wydarzenia zostaną usunięte.")) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/calendar/subscriptions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIntegrations(integrations.filter((i) => i.id !== id));
        toast.success("Subskrypcja usunięta");
      } else {
        toast.error("Nie udało się usunąć subskrypcji");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  // Upload pliku .ics
  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Wybierz plik .ics");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("createIntegration", "false"); // Bezpośrednio do kalendarza

    try {
      const response = await fetch("/api/calendar/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Zaimportowano ${result.eventsImported} z ${result.totalEvents} wydarzeń`);
        setIsUploadDialogOpen(false);
        setUploadFile(null);
      } else {
        const error = await response.json();
        toast.error(error.error || "Import nie powiódł się");
      }
    } catch (error) {
      toast.error("Wystąpił błąd podczas importu");
      console.error(error);
    }
  };

  // Eksport do .ics
  const handleExport = async () => {
    try {
      const response = await fetch("/api/calendar/export");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `planner-export-${format(new Date(), "yyyy-MM-dd")}.ics`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Kalendarz wyeksportowany");
      } else {
        toast.error("Nie udało się wyeksportować kalendarza");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  const urlSubscriptions = integrations.filter((i) => i.type === "ICAL_URL");
  const uploadedIntegrations = integrations.filter((i) => i.type === "ICAL_UPLOAD");
  const googleIntegrations = integrations.filter((i) => i.type === "GOOGLE");
  const outlookIntegrations = integrations.filter((i) => i.type === "OUTLOOK");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integracje kalendarzowe</h1>
        <p className="text-muted-foreground mt-2">
          Synchronizuj wydarzenia z Google Calendar, Outlook, Apple Calendar i innych.
        </p>
      </div>

      {/* Akcje */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={() => window.location.href = "/api/calendar/oauth/google"}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Połącz z Google Calendar
        </Button>
        <Button
          onClick={() => window.location.href = "/api/calendar/oauth/microsoft"}
          className="bg-blue-500 hover:bg-blue-600"
        >
          <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
          </svg>
          Połącz z Outlook Calendar
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj subskrypcję URL
        </Button>
        <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Importuj plik .ics
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Eksportuj do .ics
        </Button>
      </div>

      {/* Instrukcje */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 Jak uzyskać link do kalendarza?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-2">Google Calendar:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Otwórz Google Calendar → Ustawienia</li>
              <li>Wybierz swój kalendarz</li>
              <li>Przewiń do &quot;Integruj kalendarz&quot;</li>
              <li>Skopiuj &quot;Tajny adres w formacie iCal&quot;</li>
            </ol>
          </div>
          <div>
            <p className="font-medium mb-2">Outlook Calendar:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Outlook.com → Kalendarz</li>
              <li>Udostępnij → Publikuj</li>
              <li>Skopiuj link ICS</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Integracje OAuth Google */}
      {googleIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Calendar
          </h2>
          <div className="grid gap-4">
            {googleIntegrations.map((integration) => (
              <Card key={integration.id} className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        OAuth • {integration.calendarId}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      OAuth
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ostatnia synchronizacja */}
                  {integration.lastSync && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Ostatnia synchronizacja: </span>
                      <span className="font-medium">
                        {format(new Date(integration.lastSync), "d MMM yyyy, HH:mm", { locale: pl })}
                      </span>
                      {integration.lastSyncStatus === "SUCCESS" && (
                        <span className="text-green-600 text-xs ml-2">Sukces</span>
                      )}
                      {integration.lastSyncStatus === "ERROR" && (
                        <span className="text-red-600 text-xs ml-2">Błąd</span>
                      )}
                    </div>
                  )}

                  {/* Akcje */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        fetch(`/api/calendar/oauth/google/${integration.id}/sync`, { method: "POST" })
                          .then(() => toast.success("Synchronizacja rozpoczęta"))
                          .catch(() => toast.error("Błąd synchronizacji"));
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Synchronizuj teraz
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Integracje OAuth Microsoft/Outlook */}
      {outlookIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
            </svg>
            Outlook Calendar
          </h2>
          <div className="grid gap-4">
            {outlookIntegrations.map((integration) => (
              <Card key={integration.id} className="border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        OAuth • {integration.calendarId}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                      OAuth
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integration.lastSync && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Ostatnia synchronizacja: </span>
                      <span className="font-medium">
                        {format(new Date(integration.lastSync), "d MMM yyyy, HH:mm", { locale: pl })}
                      </span>
                      {integration.lastSyncStatus === "SUCCESS" && (
                        <span className="text-green-600 text-xs ml-2">Sukces</span>
                      )}
                      {integration.lastSyncStatus === "ERROR" && (
                        <span className="text-red-600 text-xs ml-2">Błąd</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        fetch(`/api/calendar/oauth/microsoft/${integration.id}/sync`, { method: "POST" })
                          .then(() => toast.success("Synchronizacja rozpoczęta"))
                          .catch(() => toast.error("Błąd synchronizacji"));
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Synchronizuj teraz
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista subskrypcji URL */}
      {urlSubscriptions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Subskrypcje URL</h2>
          <div className="grid gap-4">
            {urlSubscriptions.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <LinkIcon className="h-3 w-3" />
                        <span className="truncate max-w-md">{integration.icalUrl}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {integration.isActive && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Aktywna
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Synchronizacja co:</span>
                      <span className="font-medium">
                        {integration.syncInterval === 60 && "godzinę"}
                        {integration.syncInterval === 1440 && "dzień"}
                        {integration.syncInterval !== 60 && integration.syncInterval !== 1440 && `${integration.syncInterval} min`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Wydarzenia:</span>
                      <span className="font-medium">{integration._count.importedEvents}</span>
                    </div>
                  </div>

                  {/* Ostatnia synchronizacja */}
                  {integration.lastSync && (
                    <div className="flex items-center gap-2 text-sm">
                      {integration.lastSyncStatus === "SUCCESS" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-muted-foreground">Ostatnia synchronizacja:</span>
                      <span className="font-medium">
                        {format(new Date(integration.lastSync), "d MMM yyyy, HH:mm", { locale: pl })}
                      </span>
                      {integration.lastSyncStatus === "SUCCESS" && (
                        <span className="text-green-600 text-xs">Sukces</span>
                      )}
                      {integration.lastSyncStatus === "ERROR" && (
                        <span className="text-red-600 text-xs">Błąd</span>
                      )}
                    </div>
                  )}

                  {/* Błąd */}
                  {integration.lastSyncError && (
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-600 dark:text-red-400">
                      {integration.lastSyncError}
                    </div>
                  )}

                  {/* Webhook URL */}
                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded p-3">
                    <p className="text-sm font-medium mb-2">Webhook URL (instant sync):</p>
                    <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded block overflow-x-auto">
                      {typeof window !== "undefined" && window.location.origin}/api/calendar/webhook
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Payload: {`{ "integrationId": "${integration.id}" }`}
                    </p>
                  </div>

                  {/* Akcje */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                    >
                      <RefreshCw className={cn("h-4 w-4 mr-2", syncingId === integration.id && "animate-spin")} />
                      Synchronizuj teraz
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(integration.id)}
                      disabled={deletingId === integration.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista uploadowanych */}
      {uploadedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Importy jednorazowe</h2>
          <div className="grid gap-4">
            {uploadedIntegrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription>
                        Zaimportowano {integration._count.importedEvents} wydarzeń •{" "}
                        {format(new Date(integration.createdAt), "d MMM yyyy", { locale: pl })}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(integration.id)}
                      disabled={deletingId === integration.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Brak subskrypcji */}
      {integrations.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak integracji</h3>
            <p className="text-muted-foreground mb-4">
              Dodaj subskrypcję aby automatycznie synchronizować wydarzenia z zewnętrznego kalendarza
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwszą subskrypcję
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog - Dodaj subskrypcję */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj subskrypcję kalendarza</DialogTitle>
            <DialogDescription>
              Podaj link do kalendarza w formacie .ics aby automatycznie synchronizować wydarzenia.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nazwa</Label>
              <Input
                placeholder="np. Mój Google Calendar"
                value={newSubscription.name}
                onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>URL kalendarza (.ics)</Label>
              <Input
                placeholder="https://calendar.google.com/calendar/ical/..."
                value={newSubscription.icalUrl}
                onChange={(e) => setNewSubscription({ ...newSubscription, icalUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Obsługiwane: https://, webcal://
              </p>
            </div>
            <div className="space-y-2">
              <Label>Częstotliwość synchronizacji</Label>
              <Select
                value={String(newSubscription.syncInterval)}
                onValueChange={(v) => setNewSubscription({ ...newSubscription, syncInterval: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">Co godzinę</SelectItem>
                  <SelectItem value="240">Co 4 godziny</SelectItem>
                  <SelectItem value="1440">Raz dziennie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Filtruj wydarzenia (opcjonalnie)</Label>
              <Input
                placeholder="np. praca, spotkanie, wywiad"
                value={newSubscription.eventFilter}
                onChange={(e) => setNewSubscription({ ...newSubscription, eventFilter: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Słowa kluczowe oddzielone przecinkami. Zaimportowane zostaną tylko wydarzenia zawierające te słowa.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mapowanie kolorów (opcjonalnie)</Label>
              <Input
                placeholder="np. #1E88E5=#10B981, #E53935=#EF4444"
                value={newSubscription.colorMapping}
                onChange={(e) => setNewSubscription({ ...newSubscription, colorMapping: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Format: kolor_źródłowy=kolor_docelowy. Zmienia kolory wydarzeń z zewnętrznego kalendarza.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddSubscription}>Dodaj subskrypcję</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Upload .ics */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importuj plik .ics</DialogTitle>
            <DialogDescription>
              Wybierz plik .ics aby zaimportować wydarzenia do kalendarza.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plik .ics</Label>
              <Input
                type="file"
                accept=".ics"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
            {uploadFile && (
              <div className="text-sm text-muted-foreground">
                Wybrany plik: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile}>
              <Upload className="h-4 w-4 mr-2" />
              Importuj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

