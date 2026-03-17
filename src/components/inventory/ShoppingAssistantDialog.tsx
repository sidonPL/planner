"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShoppingCart, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface ShoppingSuggestion {
  name: string;
  currentQuantity: number;
  suggestedQuantity: number;
  unit: string | null;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface SuggestionCategory {
  category: string;
  items: ShoppingSuggestion[];
}

interface ShoppingAssistantData {
  suggestions: SuggestionCategory[];
  stats: {
    total: number;
    highPriority: number;
    mediumPriority: number;
  };
  message: string;
}

interface ShoppingAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors = {
  high: "bg-red-100 text-red-800 border-red-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  low: "bg-blue-100 text-blue-800 border-blue-300",
};

const priorityLabels = {
  high: "Wysoki",
  medium: "Średni",
  low: "Niski",
};

export function ShoppingAssistantDialog({
  open,
  onOpenChange,
}: ShoppingAssistantDialogProps) {
  const [data, setData] = useState<ShoppingAssistantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchSuggestions();
    }
  }, [open]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/inventory/shopping-assistant");
      if (response.ok) {
        const suggestions = await response.json();
        setData(suggestions);

        // Auto-select high priority items
        const highPriorityItems = suggestions.suggestions
          .flatMap((cat: SuggestionCategory) => cat.items)
          .filter((item: ShoppingSuggestion) => item.priority === "high")
          .map((item: ShoppingSuggestion) => item.name);

        setSelectedItems(new Set(highPriorityItems));
      } else {
        toast.error("Nie udało się pobrać sugestii");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemName: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (!data) return;
    const allItems = data.suggestions
      .flatMap((cat) => cat.items)
      .map((item) => item.name);
    setSelectedItems(new Set(allItems));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const addToShoppingList = async () => {
    if (!data || selectedItems.size === 0) return;

    setAddingToList(true);
    try {
      const itemsToAdd = data.suggestions
        .flatMap((cat) => cat.items)
        .filter((item) => selectedItems.has(item.name))
        .map((item) => ({
          name: item.name,
          quantity: item.suggestedQuantity,
          unit: item.unit,
        }));

      const response = await fetch("/api/inventory/shopping-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToAdd }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || "Dodano do listy zakupów");
        onOpenChange(false);
      } else {
        toast.error("Nie udało się dodać do listy");
      }
    } catch (error) {
      console.error("Error adding to shopping list:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setAddingToList(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Asystent Zakupów
          </DialogTitle>
          <DialogDescription>
            Inteligentne sugestie bazujące na Twoich zapasach i historii użycia
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || data.suggestions.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="text-lg font-medium">Wszystko w porządku!</p>
            <p className="text-sm text-muted-foreground mt-2">
              {data?.message || "Brak pilnych zakupów w tym momencie."}
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {data.stats.total} sugestii
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{data.stats.highPriority} pilnych</Badge>
                <Badge variant="secondary">{data.stats.mediumPriority} średnich</Badge>
              </div>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Zaznaczono: {selectedItems.size} / {data.stats.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Zaznacz wszystko
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Odznacz wszystko
                </Button>
              </div>
            </div>

            {/* Suggestions List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {data.suggestions.map((category, catIdx) => (
                  <div key={catIdx}>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {category.category}
                      <Badge variant="secondary">{category.items.length}</Badge>
                    </h3>

                    <div className="space-y-2">
                      {category.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedItems.has(item.name)}
                            onCheckedChange={() => toggleItem(item.name)}
                            className="mt-1"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{item.name}</span>
                              <Badge
                                variant="outline"
                                className={priorityColors[item.priority]}
                              >
                                {priorityLabels[item.priority]}
                              </Badge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                              {item.reason}
                            </p>

                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-muted-foreground">
                                Teraz: {item.currentQuantity} {item.unit}
                              </span>
                              <span className="text-green-600 font-medium">
                                → Sugerowane: {item.suggestedQuantity.toFixed(1)} {item.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          {data && data.suggestions.length > 0 && (
            <Button
              onClick={addToShoppingList}
              disabled={selectedItems.size === 0 || addingToList}
            >
              {addingToList ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Dodaj do listy ({selectedItems.size})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

