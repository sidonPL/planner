// filepath: c:\Users\sidon\IdeaProjects\planner\src\app\(dashboard)\shopping\history\ShoppingHistoryClient.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  Calendar,
  Package,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ShoppingItem } from "@prisma/client";

interface HistoryEntry {
  date: string;
  items: ShoppingItem[];
  totalItems: number;
}

interface ShoppingHistoryClientProps {
  history: HistoryEntry[];
}

export function ShoppingHistoryClient({ history: initialHistory }: ShoppingHistoryClientProps) {
  const [history, setHistory] = useState(initialHistory);
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]
    );
  };

  const handleRestoreItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/shopping/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: false }),
      });

      if (response.ok) {
        // Usuń z historii
        setHistory((prev) =>
          prev
            .map((entry) => ({
              ...entry,
              items: entry.items.filter((item) => item.id !== itemId),
              totalItems: entry.items.filter((item) => item.id !== itemId).length,
            }))
            .filter((entry) => entry.items.length > 0)
        );
        toast.success("Produkt przywrócony na listę zakupów");
      }
    } catch {
      toast.error("Nie udało się przywrócić produktu");
    }
  };

  const handleClearDate = async () => {
    if (!selectedDate) return;

    try {
      const itemsToDelete = history.find((e) => e.date === selectedDate)?.items || [];

      await Promise.all(
        itemsToDelete.map((item) =>
          fetch(`/api/shopping/${item.id}`, { method: "DELETE" })
        )
      );

      setHistory((prev) => prev.filter((entry) => entry.date !== selectedDate));
      setDeleteDialogOpen(false);
      toast.success("Historia zakupów została wyczyszczona");
    } catch {
      toast.error("Nie udało się wyczyścić historii");
    }
  };

  const openDeleteDialog = (date: string) => {
    setSelectedDate(date);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/shopping">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Historia zakupów</h1>
            <p className="text-muted-foreground">
              Przegląd zakupionych produktów
            </p>
          </div>
        </div>
      </div>

      {/* Lista historii */}
      <div className="space-y-4">
        {history.map((entry) => {
          const isExpanded = expandedDates.includes(entry.date);
          const date = new Date(entry.date);

          return (
            <Card key={entry.date}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(entry.date)}>
                <CardHeader className="pb-2">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="text-left">
                          <CardTitle className="text-lg">
                            {format(date, "EEEE, d MMMM yyyy", { locale: pl })}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {entry.totalItems} {entry.totalItems === 1 ? "produkt" : "produktów"}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {entry.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.quantity && (
                                <span className="text-muted-foreground ml-2">
                                  {item.quantity} {item.unit}
                                </span>
                              )}
                              {item.category && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRestoreItem(item.id)}
                              title="Przywróć na listę"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => openDeleteDialog(entry.date)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Usuń historię z tego dnia
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {history.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Brak historii zakupów</h3>
              <p className="text-muted-foreground mb-4">
                Historia pojawi się gdy oznaczysz produkty jako zakupione
              </p>
              <Link href="/shopping">
                <Button>Przejdź do listy zakupów</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog potwierdzenia usunięcia */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wyczyścić historię?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć historię zakupów z tego dnia?
              Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearDate}
              className="bg-red-500 hover:bg-red-600"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

