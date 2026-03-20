"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, TrendingDown, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  id: string;
  action: string;
  quantityBefore: number | null;
  quantityAfter: number | null;
  quantityChange: number | null;
  unit: string | null;
  source: string | null;
  notes: string | null;
  timestamp: Date;
}

interface HistoryStats {
  totalAdded: number;
  totalUsed: number;
  averageUsagePerWeek: number;
}

interface InventoryHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string;
  itemName: string;
}

const actionLabels: Record<string, { label: string; color: string; icon: string }> = {
  ADDED: { label: "Dodano", color: "bg-green-100 text-green-800", icon: "+" },
  USED: { label: "Użyto", color: "bg-blue-100 text-blue-800", icon: "-" },
  REMOVED: { label: "Usunięto", color: "bg-red-100 text-red-800", icon: "×" },
  UPDATED: { label: "Zaktualizowano", color: "bg-yellow-100 text-yellow-800", icon: "↻" },
  EXPIRED: { label: "Wygasło", color: "bg-gray-100 text-gray-800", icon: "!" },
};

export function InventoryHistoryDialog({
  open,
  onOpenChange,
  itemId,
  itemName,
}: InventoryHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [predictedDepletion, setPredictedDepletion] = useState<Date | null>(null);

  useEffect(() => {
    if (open && itemId) {
      void fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/${itemId}/history`);

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setStats(data.stats || null);
        setPredictedDepletion(data.predictedDepletion ? new Date(data.predictedDepletion) : null);
      } else {
        toast.error("Nie udało się pobrać historii");
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historia: {itemName}
          </DialogTitle>
          <DialogDescription>
            Wszystkie zmiany i statystyki użycia
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Statystyki */}
            {stats && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Dodano łącznie</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalAdded.toFixed(1)}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Użyto łącznie</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.totalUsed.toFixed(1)}</p>
                </div>

                <div className="border rounded-lg p-4 col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Średnie zużycie tygodniowe</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.averageUsagePerWeek.toFixed(1)}</p>

                  {predictedDepletion && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                          Przewidywane wyczerpanie:
                        </span>
                      </div>
                      <p className="text-sm text-orange-700 mt-1">
                        {format(predictedDepletion, "d MMMM yyyy", { locale: pl })}
                        {" "}
                        ({formatDistanceToNow(predictedDepletion, { addSuffix: true, locale: pl })})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historia */}
            {history.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">
                  Brak historii dla tego produktu
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Historia będzie rejestrowana od teraz
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {history.map((entry) => {
                    const actionInfo = actionLabels[entry.action] || {
                      label: entry.action,
                      color: "bg-gray-100 text-gray-800",
                      icon: "•",
                    };

                    return (
                      <div
                        key={entry.id}
                        className="border rounded-lg p-3 hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={actionInfo.color}>
                                {actionInfo.icon} {actionInfo.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(entry.timestamp), "d MMM yyyy, HH:mm", {
                                  locale: pl,
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              {entry.quantityBefore !== null && (
                                <span className="text-muted-foreground">
                                  {entry.quantityBefore} {entry.unit}
                                </span>
                              )}
                              {entry.quantityChange !== null && (
                                <span
                                  className={cn(
                                    "font-medium",
                                    entry.quantityChange > 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  )}
                                >
                                  {entry.quantityChange > 0 ? "+" : ""}
                                  {entry.quantityChange} {entry.unit}
                                </span>
                              )}
                              {entry.quantityAfter !== null && (
                                <span className="font-medium">
                                  → {entry.quantityAfter} {entry.unit}
                                </span>
                              )}
                            </div>

                            {entry.source && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Źródło: {entry.source}
                              </p>
                            )}

                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

