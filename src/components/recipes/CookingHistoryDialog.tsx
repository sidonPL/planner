"use client";

import { useState, useEffect, useCallback } from "react";
import { History, TrendingUp, Award, Calendar, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import Image from "next/image";

interface CookingHistoryItem {
  id: string;
  recipe: {
    id: string;
    name: string;
    image: string | null;
    category: string | null;
    difficulty: string;
    totalTime: number | null;
  };
  cookedAt: string;
  rating: number;
  comment: string | null;
}

interface Analytics {
  totalCooked: number;
  mostCooked: Array<{
    recipe: { id: string; name: string; category: string | null };
    timesCooked: number;
  }>;
  categoryDistribution: Record<string, number>;
  cookingFrequency: number;
  averageRating: number;
  period: string;
}

export function CookingHistoryDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState<string>("month");
  const [history, setHistory] = useState<CookingHistoryItem[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/cooking-history?period=${period}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error("Error loading cooking history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Dzisiaj";
    if (diffDays === 1) return "Wczoraj";
    if (diffDays < 7) return `${diffDays} dni temu`;

    return new Intl.DateTimeFormat('pl-PL', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  };

  const categoryLabels: Record<string, string> = {
    breakfast: "Śniadanie",
    lunch: "Obiad",
    dinner: "Kolacja",
    dessert: "Deser",
    snack: "Przekąska",
    other: "Inne",
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="mr-2 h-4 w-4" />
          Historia gotowania
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia gotowania i statystyki
          </DialogTitle>
          <DialogDescription>
            Zobacz co gotowałeś i odkryj swoje ulubione przepisy
          </DialogDescription>
        </DialogHeader>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Okres:</span>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Ostatni tydzień</SelectItem>
              <SelectItem value="month">Ostatni miesiąc</SelectItem>
              <SelectItem value="year">Ostatni rok</SelectItem>
              <SelectItem value="all">Cały czas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Ładowanie...
          </div>
        ) : (
          <>
            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{analytics.totalCooked}</div>
                  <div className="text-xs text-muted-foreground">Przepisów ugotowanych</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {analytics.averageRating.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Średnia ocena</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{analytics.cookingFrequency}</div>
                  <div className="text-xs text-muted-foreground">Gotujesz/dzień</div>
                </div>
                <div className="border rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">
                    {Object.keys(analytics.categoryDistribution).length}
                  </div>
                  <div className="text-xs text-muted-foreground">Kategorii</div>
                </div>
              </div>
            )}

            {/* Most Cooked */}
            {analytics && analytics.mostCooked.length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-yellow-600" />
                  Najczęściej gotowane
                </h4>
                <div className="space-y-2">
                  {analytics.mostCooked.map((item) => (
                    <div key={item.recipe.id} className="flex items-center justify-between text-sm">
                      <Link
                        href={`/recipes/${item.recipe.id}`}
                        className="hover:underline flex-1"
                      >
                        {item.recipe.name}
                      </Link>
                      <Badge variant="secondary">{item.timesCooked}× ugotowane</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category Distribution */}
            {analytics && Object.keys(analytics.categoryDistribution).length > 0 && (
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Rozkład kategorii
                </h4>
                <div className="space-y-2">
                  {Object.entries(analytics.categoryDistribution)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between text-sm">
                        <span>{categoryLabels[category] || category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{
                                width: `${(count / analytics.totalCooked) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent History */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ostatnio gotowane ({history.length})
              </h4>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Brak historii gotowania w tym okresie</p>
                  <p className="text-xs mt-1">Zacznij gotować i oceniaj przepisy!</p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {history.map((item) => (
                      <Link
                        key={item.id}
                        href={`/recipes/${item.recipe.id}`}
                        className="block"
                      >
                        <div className="border rounded-lg p-3 hover:bg-accent transition-colors">
                          <div className="flex gap-3">
                            {item.recipe.image && (
                              <Image
                                src={item.recipe.image}
                                alt={item.recipe.name}
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded object-cover flex-shrink-0"
                                unoptimized
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium truncate">{item.recipe.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < item.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(item.cookedAt)}
                                </span>
                              </div>
                              {item.comment && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  &quot;{item.comment}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Wskazówka:</strong> Historia opiera się na ocenionych przepisach.
          Oceniaj przepisy po ugotowaniu aby śledzić statystyki!
        </div>
      </DialogContent>
    </Dialog>
  );
}

