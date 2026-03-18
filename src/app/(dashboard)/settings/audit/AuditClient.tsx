"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { AuditAction } from "@prisma/client";

type AuditLogEntry = {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  entityName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  } | null;
};

type Member = {
  id: string;
  name: string | null;
  color: string;
};

interface AuditClientProps {
  members: Member[];
}

const actionLabels: Record<AuditAction, string> = {
  CREATE: "Utworzono",
  UPDATE: "Zaktualizowano",
  DELETE: "Usunięto",
  TASK_COMPLETE: "Ukończono zadanie",
  TASK_ASSIGN: "Przypisano zadanie",
  TASK_UNASSIGN: "Cofnięto przypisanie",
  EVENT_INVITE: "Zaproszono na wydarzenie",
  EVENT_CANCEL: "Anulowano wydarzenie",
  MEMBER_INVITE: "Zaproszono członka",
  MEMBER_REMOVE: "Usunięto członka",
  MEMBER_ROLE_CHANGE: "Zmieniono rolę",
  RECIPE_FAVORITE: "Dodano do ulubionych",
  RECIPE_UNFAVORITE: "Usunięto z ulubionych",
  PRESENCE_CHANGE: "Zmieniono obecność",
  SHOPPING_PURCHASE: "Zakupiono produkty",
  TRIP_PARTICIPANT_ADD: "Dodano uczestnika",
  TRIP_PARTICIPANT_REMOVE: "Usunięto uczestnika",
  BADGE_EARN: "Zdobyto odznakę",
  REWARD_CLAIM: "Odebrano nagrodę",
  LOGIN: "Zalogowano",
  LOGOUT: "Wylogowano",
  SETTINGS_CHANGE: "Zmieniono ustawienia",
};

const entityTypeLabels: Record<string, string> = {
  Task: "Zadanie",
  Event: "Wydarzenie",
  Recipe: "Przepis",
  Meal: "Posiłek",
  ShoppingItem: "Produkt",
  InventoryItem: "Spiżarnia",
  Trip: "Wyjazd",
  Transaction: "Transakcja",
  Budget: "Budżet",
  Schedule: "Harmonogram",
  BoardNote: "Notatka",
  User: "Użytkownik",
  Household: "Gospodarstwo",
  Badge: "Odznaka",
  Reward: "Nagroda",
  Category: "Kategoria",
};

const actionColors: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  TASK_COMPLETE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  LOGIN: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  LOGOUT: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export function AuditClient({ members }: AuditClientProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    userId: "all",
    action: "all",
    entityType: "all",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const limit = 20;

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(page * limit));

      if (filters.userId && filters.userId !== "all") params.set("userId", filters.userId);
      if (filters.action && filters.action !== "all") params.set("action", filters.action);
      if (filters.entityType && filters.entityType !== "all") params.set("entityType", filters.entityType);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      const response = await fetch(`/api/audit?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit);

  const clearFilters = () => {
    setFilters({
      userId: "",
      action: "",
      entityType: "",
      startDate: "",
      endDate: "",
    });
    setPage(0);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Historia aktywności
          </h1>
          <p className="text-muted-foreground">
            Przeglądaj historię zmian w gospodarstwie domowym
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={hasActiveFilters ? "border-primary" : ""}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtry
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Aktywne
            </Badge>
          )}
        </Button>
      </div>

      {/* Filtry */}
      {showFilters && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filtry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Użytkownik</Label>
                <Select
                  value={filters.userId}
                  onValueChange={(v) => {
                    setFilters({ ...filters, userId: v });
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wszyscy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || "Bez nazwy"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Akcja</Label>
                <Select
                  value={filters.action}
                  onValueChange={(v) => {
                    setFilters({ ...filters, action: v });
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wszystkie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {Object.entries(actionLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(v) => {
                    setFilters({ ...filters, entityType: v });
                    setPage(0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wszystkie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie</SelectItem>
                    {Object.entries(entityTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Od</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => {
                    setFilters({ ...filters, startDate: e.target.value });
                    setPage(0);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Do</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => {
                    setFilters({ ...filters, endDate: e.target.value });
                    setPage(0);
                  }}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Wyczyść filtry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista logów */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mb-4 opacity-50" />
              <p>Brak wpisów w historii</p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-2"
                >
                  Wyczyść filtry
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Avatar użytkownika */}
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={log.user?.avatar || undefined} />
                    <AvatarFallback
                      style={{ backgroundColor: log.user?.color || "#6B7280" }}
                      className="text-white"
                    >
                      {log.user?.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>

                  {/* Treść */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {log.user?.name || "System"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={
                          actionColors[log.action] ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      <span className="text-muted-foreground">
                        {entityTypeLabels[log.entityType] || log.entityType}
                      </span>
                    </div>
                    {log.entityName && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {log.entityName}
                      </p>
                    )}
                  </div>

                  {/* Czas */}
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "d MMM HH:mm", {
                      locale: pl,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Paginacja */}
        {totalPages > 1 && (
          <>
            <Separator />
            <div className="flex items-center justify-between p-4">
              <div className="text-sm text-muted-foreground">
                Wyświetlono {page * limit + 1}-
                {Math.min((page + 1) * limit, total)} z {total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

