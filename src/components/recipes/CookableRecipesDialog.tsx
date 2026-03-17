"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  ChefHat,
  Clock,
  Users,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShoppingCart,
  X,
  Calendar,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { CookableRecipe } from "@/lib/cookable-recipes";
import { addToViewHistory, getViewHistory, type ViewedRecipe } from "@/lib/recipe-view-history";
import Link from "next/link";
import { formatTime } from "@/lib/recipe-utils";
import { RecipeQuickRating } from "@/components/recipes/RecipeQuickRating";

interface CookableRecipesDialogProps {
  trigger?: React.ReactNode;
}

const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: "Łatwy", color: "bg-green-100 text-green-800 dark:bg-green-900/30" },
  MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30" },
  HARD: { label: "Trudny", color: "bg-red-100 text-red-800 dark:bg-red-900/30" },
};

export function CookableRecipesDialog({ trigger }: CookableRecipesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [perfectMatches, setPerfectMatches] = useState<CookableRecipe[]>([]);
  const [almostReady, setAlmostReady] = useState<CookableRecipe[]>([]);
  const [needShopping, setNeedShopping] = useState<CookableRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);

  // Filtry
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [maxTime, setMaxTime] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score"); // score, percentage, time

  // Badge count
  const [availableCount, setAvailableCount] = useState<number | null>(null);

  // Sugestie na dziś
  const [todaysSuggestions, setTodaysSuggestions] = useState<CookableRecipe[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);

  // Historia przeglądanych
  const [viewHistory, setViewHistory] = useState<ViewedRecipe[]>([]);

  const handleResetFilters = () => {
    setSelectedCategory("all");
    setMaxTime("all");
    setSelectedDifficulty("all");
    setSortBy("score");
  };

  const hasActiveFilters = selectedCategory !== "all" || maxTime !== "all" || selectedDifficulty !== "all";

  // Ładuj preferencje z localStorage przy mount
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem("cookable-preferences");
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.category) setSelectedCategory(prefs.category);
        if (prefs.maxTime) setMaxTime(prefs.maxTime);
        if (prefs.difficulty) setSelectedDifficulty(prefs.difficulty);
        if (prefs.sortBy) setSortBy(prefs.sortBy);
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  }, []);

  // Zapisuj preferencje do localStorage przy zmianie
  useEffect(() => {
    try {
      const prefs = {
        category: selectedCategory,
        maxTime,
        difficulty: selectedDifficulty,
        sortBy,
      };
      localStorage.setItem("cookable-preferences", JSON.stringify(prefs));
    } catch (error) {
      console.error("Error saving preferences:", error);
    }
  }, [selectedCategory, maxTime, selectedDifficulty, sortBy]);

  // Fetch count dla badge (tylko perfect matches)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/recipes/cookable?mode=all&minAvailability=100&maxResults=100");
        if (response.ok) {
          const data = await response.json();
          setAvailableCount(data.perfectMatches?.length || 0);
        }
      } catch (error) {
        console.error("Error fetching count:", error);
      }
    };

    void fetchCount();
  }, []);

  // Fetch sugestii na dziś
  const fetchTodaysSuggestions = async () => {
    setLoadingToday(true);
    try {
      const response = await fetch("/api/recipes/cookable?mode=today");
      if (response.ok) {
        const data = await response.json();
        setTodaysSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error fetching today's suggestions:", error);
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchTodaysSuggestions();
      // Załaduj historię
      setViewHistory(getViewHistory());
    }
  }, [open]);

  const fetchCookableRecipes = async () => {
    setLoading(true);
    try {
      // Buduj query params z filtrami
      const params = new URLSearchParams({
        mode: "all",
        minAvailability: "50",
      });

      if (selectedCategory !== "all") {
        params.append("categories", selectedCategory);
      }

      if (maxTime !== "all") {
        params.append("maxPrepTime", maxTime);
      }

      if (selectedDifficulty !== "all") {
        params.append("difficulty", selectedDifficulty);
      }

      const response = await fetch(`/api/recipes/cookable?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();

        // Sortuj wyniki
        const sortRecipes = (recipes: CookableRecipe[]) => {
          const sorted = [...recipes];
          switch (sortBy) {
            case "percentage":
              return sorted.sort((a, b) => b.availabilityPercentage - a.availabilityPercentage);
            case "time":
              return sorted.sort((a, b) => {
                const timeA = (a.prepTime || 0) + (a.cookTime || 0);
                const timeB = (b.prepTime || 0) + (b.cookTime || 0);
                return timeA - timeB;
              });
            case "score":
            default:
              return sorted.sort((a, b) => b.cookabilityScore - a.cookabilityScore);
          }
        };

        setPerfectMatches(sortRecipes(data.perfectMatches || []));
        setAlmostReady(sortRecipes(data.almostReady || []));
        setNeedShopping(sortRecipes(data.needShopping || []));
        setTotalRecipes(data.totalRecipes || 0);
      } else {
        toast.error("Nie udało się pobrać przepisów");
      }
    } catch (error) {
      console.error("Error fetching cookable recipes:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchCookableRecipes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedCategory, maxTime, selectedDifficulty, sortBy]);

  const handleAddMissingToShopping = async (recipeId: string) => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/add-missing-to-shopping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Dodano ${data.added} składnik(ów) do listy zakupów`);
      } else {
        toast.error("Nie udało się dodać składników");
      }
    } catch (error) {
      console.error("Error adding to shopping:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const RecipeCard = ({ recipe }: { recipe: CookableRecipe }) => {
    const difficulty = difficultyLabels[recipe.recipeDifficulty];
    const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

    const handleViewRecipe = () => {
      // Dodaj do historii
      addToViewHistory({
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        recipeImage: recipe.recipeImage,
        availabilityPercentage: recipe.availabilityPercentage,
      });
    };

    return (
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          {/* Zdjęcie */}
          {recipe.recipeImage ? (
            <div
              className="w-24 h-24 flex-shrink-0 rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${recipe.recipeImage})` }}
            />
          ) : (
            <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
              <ChefHat className="h-12 w-12 text-orange-300" />
            </div>
          )}

          {/* Informacje */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold line-clamp-1">{recipe.recipeName}</h4>
              <Badge
                variant="secondary"
                className={cn(
                  "flex-shrink-0",
                  recipe.availabilityPercentage === 100
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30"
                    : recipe.availabilityPercentage >= 80
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30"
                    : "bg-orange-100 text-orange-800 dark:bg-orange-900/30"
                )}
              >
                {recipe.availabilityPercentage}%
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              {difficulty && (
                <Badge variant="secondary" className={cn("text-xs", difficulty.color)}>
                  {difficulty.label}
                </Badge>
              )}
              {totalTime > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(totalTime)}
                </span>
              )}
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {recipe.servings}
              </span>
            </div>

            {/* Dostępność składników */}
            <div className="mt-2 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span>
                  {recipe.availableIngredients} / {recipe.totalIngredients} składników
                </span>
              </div>
              {recipe.missingIngredients > 0 && (
                <div className="flex items-center gap-2 text-orange-600 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">
                    Brakuje: {recipe.missingItems.map(i => i.name).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Ocena przepisu */}
            <div className="mt-2">
              <RecipeQuickRating recipeId={recipe.recipeId} compact />
            </div>

            {/* Akcje */}
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                asChild
                className="flex-1"
                onClick={handleViewRecipe}
              >
                <Link href={`/recipes/${recipe.recipeId}`}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Zobacz
                </Link>
              </Button>
              {recipe.missingIngredients > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddMissingToShopping(recipe.recipeId)}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Dodaj brakujące
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 relative">
            <Sparkles className="h-4 w-4" />
            Co mogę ugotować?
            {availableCount !== null && availableCount > 0 && (
              <Badge
                variant="default"
                className="ml-1 px-1.5 py-0 h-5 min-w-5 bg-green-600 hover:bg-green-700"
              >
                {availableCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Co mogę ugotować?
          </DialogTitle>
          <DialogDescription>
            Przepisy które możesz przygotować z dostępnych składników
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Filtry i sortowanie */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtry i sortowanie</span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Resetuj
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Kategoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="BREAKFAST">Śniadanie</SelectItem>
                  <SelectItem value="LUNCH">Obiad</SelectItem>
                  <SelectItem value="DINNER">Kolacja</SelectItem>
                  <SelectItem value="SNACK">Przekąska</SelectItem>
                  <SelectItem value="DESSERT">Deser</SelectItem>
                </SelectContent>
              </Select>

              <Select value={maxTime} onValueChange={setMaxTime}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Czas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Dowolny</SelectItem>
                  <SelectItem value="15">Do 15 min</SelectItem>
                  <SelectItem value="30">Do 30 min</SelectItem>
                  <SelectItem value="45">Do 45 min</SelectItem>
                  <SelectItem value="60">Do 1h</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Trudność" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="EASY">Łatwy</SelectItem>
                  <SelectItem value="MEDIUM">Średni</SelectItem>
                  <SelectItem value="HARD">Trudny</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sortuj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Najlepsze</SelectItem>
                  <SelectItem value="percentage">% dostępności</SelectItem>
                  <SelectItem value="time">Czas (rosnąco)</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="today" className="gap-2">
                <Calendar className="h-4 w-4" />
                Na dziś ({todaysSuggestions.length})
              </TabsTrigger>
              <TabsTrigger value="perfect" className="gap-2">
                <Check className="h-4 w-4" />
                Gotowe ({perfectMatches.length})
              </TabsTrigger>
              <TabsTrigger value="almost" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Prawie ({almostReady.length})
              </TabsTrigger>
              <TabsTrigger value="shopping" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Zakupy ({needShopping.length})
              </TabsTrigger>
            </TabsList>

            {/* Zakładka: Na dziś */}
            <TabsContent value="today" className="mt-4">
              {loadingToday ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : todaysSuggestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak sugestii na dziś</p>
                  <p className="text-sm mt-2">Dodaj więcej produktów do inwentarza</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                        Sugestie dopasowane do pory dnia
                      </h3>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Przepisy wybrane automatycznie na podstawie aktualnej godziny i dostępnych składników
                    </p>
                  </div>
                  <div className="space-y-3">
                    {todaysSuggestions.map((recipe) => (
                      <RecipeCard key={recipe.recipeId} recipe={recipe} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Gotowe przepisy (100%) */}
            <TabsContent value="perfect" className="mt-4">
              {perfectMatches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak przepisów z pełną dostępnością składników</p>
                  <p className="text-sm mt-2">Dodaj produkty do inwentarza</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {perfectMatches.map((recipe) => (
                      <RecipeCard key={recipe.recipeId} recipe={recipe} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Prawie gotowe (80-99%) */}
            <TabsContent value="almost" className="mt-4">
              {almostReady.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak przepisów prawie gotowych</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {almostReady.map((recipe) => (
                      <RecipeCard key={recipe.recipeId} recipe={recipe} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            {/* Wymagają zakupów (50-79%) */}
            <TabsContent value="shopping" className="mt-4">
              {needShopping.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak przepisów w tym zakresie</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {needShopping.map((recipe) => (
                      <RecipeCard key={recipe.recipeId} recipe={recipe} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
          </>
        )}

        {!loading && totalRecipes > 0 && (
          <div className="text-center text-sm text-muted-foreground pt-2 border-t">
            Znaleziono {totalRecipes} przepis(ów) możliwych do przygotowania
          </div>
        )}

        {/* Historia przeglądanych */}
        {!loading && viewHistory.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ostatnio przeglądane</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {viewHistory.slice(0, 5).map((item) => (
                <Link
                  key={item.recipeId}
                  href={`/recipes/${item.recipeId}`}
                  className="flex-shrink-0 group"
                  onClick={() => setOpen(false)}
                >
                  <div className="w-32 h-24 rounded-lg border overflow-hidden relative hover:shadow-md transition-shadow">
                    {item.recipeImage ? (
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${item.recipeImage})` }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                        <ChefHat className="h-8 w-8 text-orange-300" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white font-medium line-clamp-1">
                        {item.recipeName}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1 py-0",
                            item.availabilityPercentage === 100
                              ? "bg-green-600 text-white"
                              : item.availabilityPercentage >= 80
                              ? "bg-yellow-600 text-white"
                              : "bg-orange-600 text-white"
                          )}
                        >
                          {item.availabilityPercentage}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

