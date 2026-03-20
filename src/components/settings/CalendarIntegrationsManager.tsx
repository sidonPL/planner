"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar as CalendarIcon,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface Integration {
  id: string;
  type: string;
  name: string | null;
  isActive: boolean;
  lastSync: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  createdAt: Date;
}

export function CalendarIntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/calendar/integrations");
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast.error("Nie udało się pobrać integracji");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/calendar/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        setIntegrations(prev =>
          prev.map(int => (int.id === id ? { ...int, isActive } : int))
        );
        toast.success(isActive ? "Integracja włączona" : "Integracja wyłączona");
      } else {
        toast.error("Nie udało się zmienić statusu");
      }
    } catch (error) {
      console.error("Error toggling integration:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę integrację?")) return;

    try {
      const response = await fetch(`/api/calendar/integrations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIntegrations(prev => prev.filter(int => int.id !== id));
        toast.success("Integracja usunięta");
      } else {
        toast.error("Nie udało się usunąć integracji");
      }
    } catch (error) {
      console.error("Error deleting integration:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "GOOGLE":
        return "Google Calendar";
      case "APPLE":
        return "Apple Calendar";
      case "OUTLOOK":
        return "Outlook";
      default:
        return type;
    }
  };

  const getTypeIcon = () => {
    return <CalendarIcon className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;

    switch (status) {
      case "SUCCESS":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Aktywna
          </Badge>
        );
      case "ERROR":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Błąd
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Oczekuje
          </Badge>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Ładowanie integracji...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Integracje Kalendarza
          </CardTitle>
          <CardDescription>
            Zarządzaj synchronizacją z zewnętrznymi kalendarzami. Dodaj nową integrację w module Kalendarz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Brak aktywnych integracji</p>
                  <p className="text-sm">
                    Przejdź do modułu <strong>Kalendarz</strong> i kliknij <strong>&quot;Eksport i Synchronizacja&quot;</strong> aby dodać integrację.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <Card key={integration.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ikona */}
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon()}
                      </div>

                      {/* Informacje */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {integration.name || getTypeLabel(integration.type)}
                          </h4>
                          {getStatusBadge(integration.lastSyncStatus)}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>Dodano: {format(new Date(integration.createdAt), "d MMM yyyy, HH:mm", { locale: pl })}</span>
                          </div>

                          {integration.lastSync && (
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-3 w-3" />
                              <span>
                                Ostatnia synchronizacja: {format(new Date(integration.lastSync), "d MMM yyyy, HH:mm", { locale: pl })}
                              </span>
                            </div>
                          )}

                          {integration.lastSyncError && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertDescription className="text-xs">
                                {integration.lastSyncError}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      {/* Akcje */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {integration.isActive ? "Aktywna" : "Wyłączona"}
                          </span>
                          <Switch
                            checked={integration.isActive}
                            onCheckedChange={(checked) => handleToggle(integration.id, checked)}
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(integration.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jak dodać integrację */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jak dodać nową integrację?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Przejdź do modułu <strong className="text-foreground">Kalendarz</strong></li>
            <li>Kliknij przycisk <strong className="text-foreground">&quot;Eksport i Synchronizacja&quot;</strong></li>
            <li>W sekcji &quot;Automatyczna Synchronizacja&quot; kliknij przycisk swojego kalendarza</li>
            <li>Postępuj według instrukcji w aplikacji kalendarza</li>
            <li>Integracja pojawi się tutaj automatycznie</li>
          </ol>

          <Button variant="outline" className="w-full mt-4" asChild>
            <a href="/calendar">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Przejdź do Kalendarza
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

