"use client";

import { Clock, Users, Heart, ShoppingCart, Check, Timer, Play, Pause, RotateCcw, CalendarPlus, AlertCircle, Package, ChefHat, Lightbulb, Star, Sparkles, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XPBadge } from "@/components/gamification/XPBadge";
import { calculateRecipeXP, getRecipeXPInfo } from "@/lib/recipe-xp";
import { ExportOptionsDialog, type ExportOptions } from "@/components/recipes/ExportOptionsDialog";
import { exportRecipeToPDF } from "@/lib/export-recipe-pdf-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Recipe, RecipeIngredient, RecipeStep, FavoriteRecipe, StepIngredient } from "@prisma/client";
import { CookingModeView } from "@/components/recipes/CookingModeView";
import { RecipeNotesAndRating } from "@/components/recipes/RecipeNotesAndRating";
import { RecipeComments } from "@/components/recipes/RecipeComments";
import { ShareRecipe } from "@/components/recipes/ShareRecipe";
import { IngredientSubstitutionSuggester } from "@/components/recipes/IngredientSubstitutionSuggester";
import { VariationsList } from "@/components/recipes/VariationsList";
import { RecipeTagsManager } from "@/components/recipes/RecipeTagsManager";

type RecipeIngredientWithRelations = RecipeIngredient & {
  stepIngredients: StepIngredient[];
};

type RecipeStepWithRelations = RecipeStep & {
  stepIngredients: (StepIngredient & {
    ingredient: RecipeIngredient;
  })[];
};

// Typ dla przepisu z relacjami - taki sam jak w RecipesClient
type RecipeWithRelations = Recipe & {
  ingredients: RecipeIngredientWithRelations[];
  steps: RecipeStepWithRelations[];
  createdBy: { id: string; name: string | null };
  favorites: FavoriteRecipe[];
};

interface RecipeDetailDialogProps {
  recipe: RecipeWithRelations | null;
  onClose: () => void;
  onToggleFavorite: (recipe: RecipeWithRelations) => void;
  isFavorite: boolean;
  inventoryItems?: { name: string; quantity: number; unit?: string | null }[];
  startInCookingMode?: boolean; // Opcjonalnie - otwórz od razu w trybie gotowania
}

const categoryLabels: Record<string, string> = {
  breakfast: "Śniadanie",
  lunch: "Obiad",
  dinner: "Kolacja",
  dessert: "Deser",
  snack: "Przekąska",
  drink: "Napój",
  other: "Inne",
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: "Łatwy", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  HARD: { label: "Trudny", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const cookingMethodLabels: Record<string, { label: string; emoji: string }> = {
  BAKING: { label: "Pieczenie", emoji: "🍞" },
  FRYING: { label: "Smażenie", emoji: "🍳" },
  BOILING: { label: "Gotowanie", emoji: "🍲" },
  STEAMING: { label: "Na parze", emoji: "💨" },
  GRILLING: { label: "Grillowanie", emoji: "🔥" },
  ROASTING: { label: "Pieczenie (mięso)", emoji: "🍖" },
  STEWING: { label: "Duszenie", emoji: "🥘" },
  SAUTEING: { label: "Podsmażanie", emoji: "🥗" },
  AIR_FRYING: { label: "Air fryer", emoji: "🌀" },
  MIXING: { label: "Mieszanie", emoji: "🥣" },
  OTHER: { label: "Inne", emoji: "📋" },
};

// Funkcja do konwersji URL YouTube na embed
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  // Walidacja czy to jest URL
  try {
    new URL(url);
  } catch {
    return null;
  }

  // Obsługa różnych formatów YouTube URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }

  return null;
}

  // Funkcja do wykrywania czasu z tekstu kroku (np. "piecz przez 30 minut")
function extractTimeFromStep(text: string): number | null {
  const patterns = [
    /(\d+)\s*(?:minut[yęa]?|min)/i,
    /(\d+)\s*(?:godzin[yęa]?|godz|h)/i,
    /(\d+)\s*(?:sekund[yęa]?|sek|s)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (pattern.source.includes("godzin") || pattern.source.includes("godz") || pattern.source.includes("h")) {
        return value * 60;
      }
      if (pattern.source.includes("sekund") || pattern.source.includes("sek") || pattern.source.includes("(?:s)")) {
        return Math.ceil(value / 60);
      }
      return value;
    }
  }
  return null;
}

interface StepTimerProps {
  initialMinutes: number;
  stepIndex: number;
}

function StepTimer({ initialMinutes, stepIndex }: StepTimerProps) {
  const [seconds, setSeconds] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);

  const resetTimer = useCallback(() => {
    setSeconds(initialMinutes * 60);
    setIsRunning(false);
    setHasFinished(false);
  }, [initialMinutes]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setHasFinished(true);
            toast.success(`Timer dla kroku ${stepIndex + 1} zakończony!`, {
              duration: 5000,
            });
            // Odtwórz dźwięk zakończenia
            try {
              const audio = new Audio('/notification.mp3');
              audio.play().catch(() => {});
            } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, seconds, stepIndex]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((initialMinutes * 60 - seconds) / (initialMinutes * 60)) * 100;

  return (
    <div className={cn(
      "flex items-center gap-2 mt-2 p-2 rounded-lg border",
      hasFinished ? "bg-green-50 border-green-200" : "bg-muted/50"
    )}>
      <Timer className={cn("h-4 w-4", hasFinished && "text-green-600")} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono text-lg font-semibold",
            hasFinished && "text-green-600"
          )}>
            {formatTime(seconds)}
          </span>
          {!hasFinished && (
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1">
        {!hasFinished ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={resetTimer}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function RecipeDetailDialog({
  recipe,
  onClose,
  onToggleFavorite,
  isFavorite,
  inventoryItems = [],
  startInCookingMode = false,
}: RecipeDetailDialogProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id || "";

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [servings, setServings] = useState(recipe?.servings || 4);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [mealDate, setMealDate] = useState(new Date().toISOString().split("T")[0]);
  const [mealType, setMealType] = useState<string>("LUNCH");
  const [cookingMode, setCookingMode] = useState(startInCookingMode);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [usedIngredients, setUsedIngredients] = useState<Set<number>>(new Set());


  const handleExportPDF = async (options: ExportOptions) => {
    if (!recipe) return;

    setIsExportingPDF(true);
    try {
      await exportRecipeToPDF(
        {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          cuisine: recipe.cuisine,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          restTime: recipe.restTime,
          totalTime: recipe.totalTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          ingredients: recipe.ingredients.map(ing => ({
            name: ing.name,
            quantity: ing.quantity || 0,
            unit: ing.unit || "",
          })),
          steps: recipe.steps.map(step => ({
            order: step.order,
            instruction: step.content,
            timeMinutes: step.duration,
            temperature: step.temperature,
            tip: step.tip,
          })),
          tips: recipe.tips,
          tags: recipe.tags || [],
          imageUrl: recipe.image,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          ovenTemp: recipe.ovenTemp,
          ovenMode: recipe.ovenMode,
          cookingMethod: recipe.cookingMethod,
        },
        options
      );
      toast.success("PDF został pobrany");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Wystąpił błąd podczas generowania PDF");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleCreateVariation = () => {
    toast.info("Funkcja tworzenia wariantów będzie dostępna wkrótce! Użyj 'Duplikuj przepis' i zmodyfikuj.");
  };

  if (!recipe) return null;

  const difficulty = difficultyLabels[recipe.difficulty];
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const servingMultiplier = servings / recipe.servings;

  const mealTypeLabels: Record<string, string> = {
    BREAKFAST: "Śniadanie",
    SECOND_BREAKFAST: "II Śniadanie",
    LUNCH: "Obiad",
    SNACK: "Podwieczorek",
    DINNER: "Kolacja",
  };

  const handleAddToMealPlan = async () => {
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: mealDate,
          mealType: mealType,
          recipeId: recipe.id,
        }),
      });

      if (response.ok) {
        toast.success("Przepis dodany do jadłospisu");
        setShowMealDialog(false);
      } else {
        toast.error("Nie udało się dodać do jadłospisu");
      }
    } catch {
      toast.error("Nie udało się dodać do jadłospisu");
    }
  };

  const handleAddToShopping = async () => {
    try {
      // Dodaj wszystkie składniki do listy zakupów
      await Promise.all(
        recipe.ingredients.map((ingredient) =>
          fetch("/api/shopping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: ingredient.name,
              quantity: ingredient.quantity ? Number(ingredient.quantity) * servingMultiplier : null,
              unit: ingredient.unit,
              category: "other",
            }),
          })
        )
      );
      toast.success("Składniki dodane do listy zakupów");
    } catch {
      toast.error("Nie udało się dodać składników");
    }
  };

  const toggleStep = (index: number) => {
    setCompletedSteps((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleIngredient = (index: number) => {
    setUsedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Funkcja do pobierania składników używanych w danym kroku z bazy danych
  const getIngredientsForStep = (stepIndex: number): number[] => {
    const step = recipe.steps?.[stepIndex];
    if (!step) return [];

    // Pobierz ID składników z relacji stepIngredients i zwróć indexy
    return step.stepIngredients?.map((si) => {
      // Znajdź index składnika w tablicy recipe.ingredients
      return recipe.ingredients.findIndex(ing => ing.id === si.ingredientId);
    }).filter((idx) => idx !== -1) || [];
  };

  // Funkcja sprawdzająca dostępność składnika w inwentarzu
  const checkIngredientAvailability = (ingredientName: string, requiredQuantity: number | null) => {
    if (inventoryItems.length === 0) return null; // Brak danych o inwentarzu
    
    const normalizedName = ingredientName.toLowerCase().trim();
    const inventoryItem = inventoryItems.find(item => 
      item.name.toLowerCase().trim().includes(normalizedName) ||
      normalizedName.includes(item.name.toLowerCase().trim())
    );
    
    if (!inventoryItem) {
      return { available: false, inInventory: 0, message: "Brak w spiżarni" };
    }
    
    if (requiredQuantity === null) {
      return { available: true, inInventory: inventoryItem.quantity, message: "Dostępne" };
    }
    
    const needed = requiredQuantity * servingMultiplier;
    if (inventoryItem.quantity >= needed) {
      return { available: true, inInventory: inventoryItem.quantity, message: `Masz: ${inventoryItem.quantity} ${inventoryItem.unit || ""}` };
    } else {
      return { 
        available: false, 
        inInventory: inventoryItem.quantity, 
        message: `Brakuje: ${(needed - inventoryItem.quantity).toFixed(1)} ${inventoryItem.unit || ""}` 
      };
    }
  };

  // Policz brakujące składniki
  const missingIngredients = inventoryItems.length > 0 
    ? recipe.ingredients.filter((ing) => {
        const status = checkIngredientAvailability(ing.name, ing.quantity ? Number(ing.quantity) : null);
        return status && !status.available;
      })
    : [];

  return (
    <Dialog open={!!recipe} onOpenChange={() => onClose()}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden flex flex-col",
        cookingMode ? "sm:max-w-[95vw] w-[95vw] h-[90vh]" : "sm:max-w-[900px]"
      )}>
        {/* Tryb gotowania - pełny ekran */}
        {cookingMode ? (
          <>
            {/* Hidden title for accessibility */}
            <DialogHeader className="sr-only">
              <DialogTitle>Tryb gotowania - {recipe.name}</DialogTitle>
            </DialogHeader>

            <CookingModeView
              recipe={{
                name: recipe.name,
                servings: recipe.servings,
                cookingMethod: recipe.cookingMethod,
                ovenTemp: recipe.ovenTemp,
                ovenMode: recipe.ovenMode,
                tips: recipe.tips,
                videoUrl: recipe.videoUrl,
                calories: recipe.calories,
                protein: recipe.protein,
                carbs: recipe.carbs,
                fat: recipe.fat,
                fiber: recipe.fiber,
                steps: recipe.steps.map(step => ({
                  id: step.id,
                  content: step.content,
                  duration: step.duration,
                  temperature: step.temperature,
                  image: step.image,
                  tip: step.tip,
                  order: step.order,
                  isOptional: step.isOptional,
                  stepIngredients: step.stepIngredients?.map(si => ({
                    ingredient: {
                      id: si.ingredient.id,
                      name: si.ingredient.name,
                      quantity: si.ingredient.quantity,
                      unit: si.ingredient.unit,
                    }
                  }))
                })),
                ingredients: recipe.ingredients.map(ing => ({
                  id: ing.id,
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  stepIngredients: ing.stepIngredients?.map(si => ({
                    stepId: si.stepId
                  }))
                }))
              }}
              onClose={() => setCookingMode(false)}
              servings={servings}
              onServingsChange={setServings}
            />
          </>
        ) : (
          /* Normalny widok dialogu */
          <>
            <DialogHeader className="space-y-4">
              <div>
                <DialogTitle className="text-xl">{recipe.name}</DialogTitle>
                {recipe.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {recipe.description}
                  </p>
                )}

                {/* XP Breakdown - Gamification */}
                {(() => {
                  const xpInfo = getRecipeXPInfo(recipe, 0); // TODO: pass user streak
                  const baseXP = calculateRecipeXP(recipe);

                  return (
                    <div className="mt-3 p-3 rounded-lg border bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                            Nagroda XP za ugotowanie
                          </span>
                        </div>
                        <XPBadge xp={baseXP} size="md" />
                      </div>

                      {xpInfo.multipliers.length > 0 && (
                        <div className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                          <div className="font-medium">Dostępne bonusy:</div>
                          {xpInfo.multipliers.map((m, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <TooltipProvider>
                <div className="flex items-center gap-2 flex-wrap">
                  <VariationsList
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    onCreateVariation={handleCreateVariation}
                  />
                  <ShareRecipe
                    recipeId={recipe.id}
                    recipeName={recipe.name}
                    isPublic={recipe.isPublic}
                  />
                  <ExportOptionsDialog
                    onExport={handleExportPDF}
                    isExporting={isExportingPDF}
                    currentServings={servings}
                    originalServings={recipe.servings}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const notesSection = document.getElementById('recipe-notes-rating');
                          notesSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Oceń
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Przewiń do oceny i komentarzy</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setCookingMode(true);
                        }}
                        className="gap-2"
                      >
                        <ChefHat className="h-4 w-4" />
                        Gotuj!
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Włącz tryb gotowania z timerami</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleFavorite(recipe)}
                      >
                        <Heart
                          className={cn(
                            "h-5 w-5",
                            isFavorite && "fill-red-500 text-red-500"
                          )}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Zdjęcie przepisu */}
            {recipe.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted -mx-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={recipe.image}
                  alt={recipe.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* Metadane */}
            <div className="flex flex-wrap gap-4 text-sm">
              {recipe.prepTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Przygotowanie: {recipe.prepTime} min</span>
                </div>
              )}
              {recipe.cookTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span>Gotowanie: {recipe.cookTime} min</span>
                </div>
              )}
              {recipe.restTime && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Odpoczynek: {recipe.restTime} min</span>
                </div>
              )}
              {totalTime > 0 && (
                <div className="flex items-center gap-1 font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Razem: {totalTime} min</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <input
                  type="number"
                  min={1}
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  className="w-12 text-center border rounded p-1"
                />
                <span>porcji</span>
              </div>
              {recipe.category && (
                <Badge variant="secondary">
                  {categoryLabels[recipe.category] || recipe.category}
                </Badge>
              )}
              {recipe.cuisine && (
                <Badge variant="secondary">
                  🌍 {recipe.cuisine}
                </Badge>
              )}
              <Badge variant="secondary" className={difficulty?.color}>
                {difficulty?.label}
              </Badge>
            </div>

            {/* Tagi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Tagi</h4>
                <RecipeTagsManager
                  recipeId={recipe.id}
                  currentTags={recipe.tags || []}
                  onTagsUpdate={() => {
                    // Refresh recipe data - można wywołać callback jeśli przekazany
                    toast.success("Tagi zaktualizowane - odśwież stronę aby zobaczyć zmiany");
                  }}
                />
              </div>
              {recipe.tags && recipe.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {recipe.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Brak tagów - dodaj aby łatwiej wyszukiwać przepis</p>
              )}
            </div>

            {/* Wskazówki */}
            {recipe.tips && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <div className="flex gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1 text-yellow-900 dark:text-yellow-100">💡 Wskazówki</h4>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-line">{recipe.tips}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Źródło */}
            {recipe.source && (
              <div className="text-sm text-muted-foreground">
                📚 Źródło: <span className="font-medium">{recipe.source}</span>
              </div>
            )}

            <Separator />

            {/* Składniki */}
            <div>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Składniki</h3>
                  {inventoryItems.length > 0 && missingIngredients.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Brakuje {missingIngredients.length}
                    </Badge>
                  )}
                  {inventoryItems.length > 0 && missingIngredients.length === 0 && (
                    <Badge variant="default" className="text-xs bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Wszystko masz!
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowMealDialog(true)}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Dodaj do jadłospisu
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleAddToShopping}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {missingIngredients.length > 0 ? `Dodaj brakujące (${missingIngredients.length})` : "Dodaj do zakupów"}
                  </Button>
                </div>
              </div>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index: number) => {
                  const availability = checkIngredientAvailability(ingredient.name, ingredient.quantity ? Number(ingredient.quantity) : null);
                  return (
                    <li key={index} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          availability === null ? "bg-primary" :
                          availability.available ? "bg-green-500" : "bg-red-500"
                        )} />
                        <span className="flex-1">
                          {ingredient.quantity
                            ? `${(Number(ingredient.quantity) * servingMultiplier).toFixed(
                                Number(ingredient.quantity) * servingMultiplier % 1 === 0 ? 0 : 1
                              )} ${ingredient.unit || ""} `
                            : ""}
                          {ingredient.name}
                        </span>
                        <IngredientSubstitutionSuggester
                          ingredientName={ingredient.name}
                        />
                      </div>
                      {availability && (
                        <span className={cn(
                          "text-xs flex-shrink-0",
                          availability.available ? "text-green-600" : "text-red-600"
                        )}>
                          {availability.available ? (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {availability.message}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {availability.message}
                            </span>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <Separator />

            {/* Kroki */}
            <div>
              <h3 className="font-semibold mb-3">Przygotowanie</h3>
              <ol className="space-y-4">
                {recipe.steps.map((step, index: number) => {
                  const stepTime = extractTimeFromStep(step.content);
                  const stepIngredients = getIngredientsForStep(index);

                  return (
                    <li key={index} className="flex flex-col gap-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleStep(index)}
                          className={cn(
                            "flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-colors",
                            completedSteps.includes(index)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {completedSteps.includes(index) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </button>
                        <div className="flex-1">
                          {/* Zdjęcie kroku */}
                          {step.image && (
                            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2 max-w-md">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={step.image}
                                alt={`Krok ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          <p
                            className={cn(
                              "text-sm",
                              completedSteps.includes(index) && "text-muted-foreground line-through"
                            )}
                          >
                            {step.content}
                          </p>

                          {/* Składniki używane w tym kroku */}
                          {stepIngredients.length > 0 && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                              <h5 className="text-xs font-semibold mb-2 flex items-center gap-1 text-blue-900 dark:text-blue-100">
                                🥘 Składniki w tym kroku:
                              </h5>
                              <ul className="space-y-1">
                                {stepIngredients.map((ingredientIndex) => {
                                  const ing = recipe.ingredients[ingredientIndex];
                                  return (
                                    <li
                                      key={ingredientIndex}
                                      className={cn(
                                        "flex items-center gap-2 text-xs cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-800/30 p-1 rounded",
                                        usedIngredients.has(ingredientIndex) && "line-through text-muted-foreground"
                                      )}
                                      onClick={() => toggleIngredient(ingredientIndex)}
                                    >
                                      {usedIngredients.has(ingredientIndex) ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <div className="h-3 w-3 rounded border border-primary/50" />
                                      )}
                                      <span className="flex-1">{ing.name}</span>
                                      {ing.quantity && (
                                        <span className="font-mono text-xs">
                                          {(Number(ing.quantity) * servingMultiplier).toFixed(
                                            Number(ing.quantity) * servingMultiplier % 1 === 0 ? 0 : 1
                                          )} {ing.unit || ""}
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}

                          {/* Wskazówka */}
                          {step.tip && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <div className="flex gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">Wskazówka</p>
                                  <p className="text-xs text-yellow-800 dark:text-yellow-200">{step.tip}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Informacje o kroku - czas i temperatura */}
                          {(step.duration || step.temperature) && (
                            <div className="flex gap-2 mt-2">
                              {step.duration && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Timer className="h-3 w-3" />
                                  {step.duration} min
                                </Badge>
                              )}
                              {step.temperature && (
                                <Badge variant="outline" className="text-xs gap-1 bg-orange-50 dark:bg-orange-900/20">
                                  🌡️ {step.temperature}°C
                                </Badge>
                              )}
                            </div>
                          )}
                          {stepTime && stepTime > 0 && (
                            <StepTimer initialMinutes={stepTime} stepIndex={index} />
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <Separator />

            {/* Parametry gotowania */}
            {(recipe.cookingMethod || recipe.ovenTemp || recipe.ovenMode) && (
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  🍳 Parametry gotowania
                </h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  {recipe.cookingMethod && cookingMethodLabels[recipe.cookingMethod] && (
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cookingMethodLabels[recipe.cookingMethod].emoji}</span>
                      <span>{cookingMethodLabels[recipe.cookingMethod].label}</span>
                    </div>
                  )}
                  {recipe.ovenTemp && (
                    <div className="flex items-center gap-1">
                      <span>🌡️</span>
                      <span className="font-semibold">{recipe.ovenTemp}°C</span>
                    </div>
                  )}
                  {recipe.ovenMode && (
                    <div className="flex items-center gap-1">
                      <span>⚙️</span>
                      <span>{recipe.ovenMode}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wartości odżywcze */}
            {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.fiber) && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold text-sm mb-3">📊 Wartości odżywcze (na porcję)</h4>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {recipe.calories && (
                    <div className="p-2 rounded bg-orange-100 dark:bg-orange-900/30">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{recipe.calories}</div>
                      <div className="text-muted-foreground">kcal</div>
                    </div>
                  )}
                  {recipe.protein && (
                    <div className="p-2 rounded bg-red-100 dark:bg-red-900/30">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">{recipe.protein}g</div>
                      <div className="text-muted-foreground">białko</div>
                    </div>
                  )}
                  {recipe.carbs && (
                    <div className="p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                      <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{recipe.carbs}g</div>
                      <div className="text-muted-foreground">węgl.</div>
                    </div>
                  )}
                  {recipe.fat && (
                    <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-900/30">
                      <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{recipe.fat}g</div>
                      <div className="text-muted-foreground">tłuszcz</div>
                    </div>
                  )}
                  {recipe.fiber && (
                    <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">{recipe.fiber}g</div>
                      <div className="text-muted-foreground">błonnik</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Diety i alergeny */}
            {(recipe.isVegetarian || recipe.isVegan || recipe.isGlutenFree || recipe.isDairyFree || (recipe.allergens && recipe.allergens.length > 0)) && (
              <div className="flex flex-wrap gap-2">
                {recipe.isVegetarian && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">🥬 Wegetariański</Badge>
                )}
                {recipe.isVegan && (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20">🌱 Wegański</Badge>
                )}
                {recipe.isGlutenFree && (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20">🌾 Bezglutenowy</Badge>
                )}
                {recipe.isDairyFree && (
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20">🥛 Bez nabiału</Badge>
                )}
                {recipe.allergens && recipe.allergens.length > 0 && recipe.allergens.map((allergen: string) => (
                  <Badge key={allergen} variant="destructive" className="gap-1">
                    ⚠️ {allergen}
                  </Badge>
                ))}
              </div>
            )}

            {/* Film instruktażowy - na samym dole */}
            {recipe.videoUrl && (() => {
              const embedUrl = getYouTubeEmbedUrl(recipe.videoUrl);
              return (
                <div>
                  <Separator className="my-4" />
                  {embedUrl ? (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        🎥 Film instruktażowy
                      </h4>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                        <iframe
                          src={embedUrl}
                          title="YouTube video player"
                          style={{ border: 0 }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                        />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => recipe.videoUrl && window.open(recipe.videoUrl, '_blank')}
                    >
                      <Play className="h-4 w-4" />
                      Obejrzyj wideo
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Notes & Rating Section */}
            <div id="recipe-notes-rating" className="border-t pt-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                Oceny i komentarze
              </h2>
              <RecipeNotesAndRating
                recipeId={recipe.id}
              />

              {/* Comments Section */}
              <Separator />
              <RecipeComments
                recipeId={recipe.id}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
          </>
        )}
      </DialogContent>

      {/* Dialog dodawania do jadłospisu */}
      <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Dodaj do jadłospisu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Typ posiłku</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(mealTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMealDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddToMealPlan}>
              <CalendarPlus className="h-4 w-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

