"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Users,
  ChefHat,
  Star,
  Edit,
  Trash2,
  Play,
  Plus,
  Minus,
  Check,
  Lightbulb,
  Flame,
} from "lucide-react";
import { ExportOptionsDialog, type ExportOptions } from "@/components/recipes/ExportOptionsDialog";
import { RecipeWizardDialog } from "@/components/recipes/RecipeWizardDialog";
import { CookingModeView } from "@/components/recipes/CookingModeView";
import { RecipeAvailabilityCheck } from "@/components/recipes/RecipeAvailabilityCheck";
import { RecipeQuickRating } from "@/components/recipes/RecipeQuickRating";
import { RecipeNotesAndRating } from "@/components/recipes/RecipeNotesAndRating";
import { RecipeComments } from "@/components/recipes/RecipeComments";

import { AllergenAlert } from "@/components/recipes/AllergenAlert";
import { CookingIngredients } from "@/components/recipes/CookingIngredients";
import { RecipeCost } from "@/components/recipes/RecipeCost";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import type { Recipe, RecipeIngredient, RecipeStep, FavoriteRecipe, StepIngredient } from "@prisma/client";
import { exportRecipeToPDF } from "@/lib/export-recipe-pdf-react";

type RecipeIngredientWithRelations = RecipeIngredient & {
  stepIngredients: StepIngredient[];
};

type RecipeStepWithRelations = RecipeStep & {
  stepIngredients: (StepIngredient & {
    ingredient: RecipeIngredient;
  })[];
};

type RecipeWithRelations = Recipe & {
  ingredients: RecipeIngredientWithRelations[];
  steps: RecipeStepWithRelations[];
  createdBy: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  };
  favorites: FavoriteRecipe[];
};

interface RecipeDetailClientProps {
  recipe: RecipeWithRelations;
  currentUserId: string;
  householdMembers: Array<{ id: string; name: string | null; allergens: string[] }>;
  allergens: string[];
}

const categoryLabels: Record<string, string> = {
  BREAKFAST: "Śniadanie",
  LUNCH: "Obiad",
  DINNER: "Kolacja",
  SNACK: "Przekąska",
  DESSERT: "Deser",
  DRINK: "Napój",
  OTHER: "Inne",
};

const difficultyLabels: Record<string, { label: string; color: string }> = {
  EASY: { label: "Łatwy", color: "bg-green-100 text-green-800" },
  MEDIUM: { label: "Średni", color: "bg-yellow-100 text-yellow-800" },
  HARD: { label: "Trudny", color: "bg-red-100 text-red-800" },
};

const cookingMethodLabels: Record<string, string> = {
  BAKING: "Pieczenie",
  FRYING: "Smażenie",
  BOILING: "Gotowanie",
  STEAMING: "Na parze",
  GRILLING: "Grillowanie",
  ROASTING: "Pieczenie (mięso)",
  STEWING: "Duszenie",
  SAUTEING: "Podsmażanie",
  AIR_FRYING: "Air fryer",
  MIXING: "Mieszanie",
  OTHER: "Inne",
};

// Funkcja formatowania czasu
function formatTime(minutes: number | null): string {
  if (!minutes) return "—";
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${minutes}min`;
}

// Funkcja do konwersji URL YouTube na embed
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

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

// Funkcja do wykrywania czasu z tekstu kroku
export function RecipeDetailClient({
  recipe,
  currentUserId,
  householdMembers,
  allergens
}: RecipeDetailClientProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [servings, setServings] = useState(recipe.servings || 4);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [cookingModeOpen, setCookingModeOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [editingMode, setEditingMode] = useState(false);

  const isFavorite = recipe.favorites.length > 0;
  const originalServings = recipe.servings || 4;
  const servingMultiplier = servings / originalServings;

  const getIngredientsForStep = (stepIndex: number): number[] => {
    const step = recipe.steps?.[stepIndex];
    if (!step) return [];

    // Sprawdź czy krok ma relacje stepIngredients
    const stepIngredients = step.stepIngredients;
    if (!stepIngredients || !Array.isArray(stepIngredients)) return [];

    // Pobierz indeksy składników z relacji stepIngredients
    return stepIngredients
      .map((si) => recipe.ingredients.findIndex(ing => ing.id === si.ingredientId))
      .filter((idx) => idx !== -1);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Przepis został usunięty");
        router.push("/recipes");
      } else {
        toast.error("Nie udało się usunąć przepisu");
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success(isFavorite ? "Usunięto z ulubionych" : "Dodano do ulubionych");
        router.refresh();
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleExportPDF = async (options: ExportOptions) => {
    setIsExportingPDF(true);
    try {
      // Walidacja podstawowa
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        toast.error("Przepis musi zawierać składniki aby go wyeksportować");
        return;
      }
      if (!recipe.steps || recipe.steps.length === 0) {
        toast.error("Przepis musi zawierać kroki aby go wyeksportować");
        return;
      }

      await exportRecipeToPDF(
        {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description || undefined,
          category: recipe.category || undefined,
          cuisine: recipe.cuisine || undefined,
          prepTime: recipe.prepTime || undefined,
          cookTime: recipe.cookTime || undefined,
          restTime: recipe.restTime || undefined,
          totalTime: recipe.totalTime || undefined,
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
            timeMinutes: step.duration || undefined,
            temperature: step.temperature || undefined,
            tip: step.tip || undefined,
          })),
          tips: recipe.tips || undefined,
          tags: recipe.tags || [],
          imageUrl: recipe.image || undefined,
          calories: recipe.calories || undefined,
          protein: recipe.protein || undefined,
          carbs: recipe.carbs || undefined,
          fat: recipe.fat || undefined,
          fiber: recipe.fiber || undefined,
          ovenTemp: recipe.ovenTemp || undefined,
          ovenMode: recipe.ovenMode || undefined,
          cookingMethod: recipe.cookingMethod || undefined,
        },
        options
      );
      toast.success("PDF został pobrany");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas generowania PDF";
      toast.error(errorMessage);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleRecipeUpdated = () => {
    setEditingMode(false);
    router.refresh(); // Odśwież dane ze strony
  };

  const toggleStepComplete = (stepIndex: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepIndex)
        ? prev.filter((i) => i !== stepIndex)
        : [...prev, stepIndex]
    );
  };

  const scaleQuantity = (quantity: number | null) => {
    if (!quantity) return null;
    const scaled = quantity * servingMultiplier;
    // Zaokrąglij do sensownej wartości
    if (scaled < 1) return Math.round(scaled * 100) / 100;
    if (scaled < 10) return Math.round(scaled * 10) / 10;
    return Math.round(scaled);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/recipes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{recipe.name}</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className={isFavorite ? "text-yellow-500" : ""}
            >
              <Star className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
            </Button>
          </div>
          {recipe.description && (
            <p className="text-muted-foreground mt-1">{recipe.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.category && (
              <Badge>{categoryLabels[recipe.category] || recipe.category}</Badge>
            )}
            {recipe.difficulty && (
              <Badge className={difficultyLabels[recipe.difficulty]?.color}>
                {difficultyLabels[recipe.difficulty]?.label}
              </Badge>
            )}
            {recipe.tags?.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Zdjęcie przepisu */}
      {recipe.image && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.image}
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <RecipeAvailabilityCheck
          recipeId={recipe.id}
          recipeName={recipe.name}
          servings={servings}
          variant="button"
        />
        <ExportOptionsDialog
          onExport={handleExportPDF}
          isExporting={isExportingPDF}
          currentServings={servings}
          originalServings={recipe.servings}
        />
        <Button variant="outline" size="sm" onClick={() => setCookingModeOpen(true)}>
          <Play className="h-4 w-4 mr-2" />
          Tryb gotowania
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditingMode(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edytuj
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-600"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Rating section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ocena przepisu</CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeQuickRating recipeId={recipe.id} />
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Czas przygotowania</p>
              <p className="font-medium">{formatTime(recipe.prepTime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Czas gotowania</p>
              <p className="font-medium">{formatTime(recipe.cookTime)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Porcje</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-medium w-6 text-center">{servings}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setServings((s) => s + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Autor</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={recipe.createdBy.avatar || undefined} />
                  <AvatarFallback style={{ backgroundColor: recipe.createdBy.color }}>
                    {recipe.createdBy.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{recipe.createdBy.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Składniki z funkcją skanowania */}
        <div className="space-y-6">
          <CookingIngredients
            recipeId={recipe.id}
            ingredients={recipe.ingredients.map((ing) => ({
              id: ing.id,
              name: ing.name,
              quantity: scaleQuantity(ing.quantity),
              unit: ing.unit,
              optional: ing.optional,
            }))}
          />

          {/* Alerty alergenów */}
          <AllergenAlert
            allergens={allergens}
            householdMembers={householdMembers.map((m) => ({
              id: m.id,
              name: m.name || "Użytkownik",
              allergens: m.allergens || [],
            }))}
          />

          {/* Koszt przepisu */}
          <RecipeCost recipeId={recipe.id} />
        </div>

        {/* Instrukcje */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Przygotowanie</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.steps.map((step, idx) => {
                const stepIngredients = getIngredientsForStep(idx);

                return (
                  <li key={idx} className="flex gap-4">
                    <button
                      onClick={() => toggleStepComplete(idx)}
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                        completedSteps.includes(idx)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {completedSteps.includes(idx) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        idx + 1
                      )}
                    </button>
                    <div className="flex-1">
                      {/* Zdjęcie kroku */}
                      {step.image && (
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted mb-2 max-w-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={step.image}
                            alt={`Krok ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <p
                        className={`${
                          completedSteps.includes(idx) ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {step.content}
                      </p>

                      {/* Składniki w kroku */}
                      {stepIngredients.length > 0 && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <h5 className="text-xs font-semibold mb-2 flex items-center gap-1 text-blue-900 dark:text-blue-100">
                            🥘 Składniki w tym kroku:
                          </h5>
                          <ul className="space-y-1">
                            {stepIngredients.map((ingredientIndex) => {
                              const ing = recipe.ingredients[ingredientIndex];
                              if (!ing) return null;
                              return (
                                <li key={ingredientIndex} className="flex items-center gap-2 text-xs">
                                  <span className="flex-1">{ing.name}</span>
                                  {ing.quantity && (
                                    <span className="font-mono">
                                      {scaleQuantity(ing.quantity)} {ing.unit || ""}
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
                    </div>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Wideo YouTube - wbudowany odtwarzacz */}
      {recipe.videoUrl && (() => {
        const embedUrl = getYouTubeEmbedUrl(recipe.videoUrl);
        return embedUrl ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🎥 Film instruktażowy
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🎥 Film instruktażowy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => recipe.videoUrl && window.open(recipe.videoUrl, '_blank')}
              >
                <Play className="h-4 w-4" />
                Obejrzyj wideo
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Informacje nutricyjne i diety */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {/* Wartości odżywcze */}
        {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.fiber) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                📊 Wartości odżywcze (na porcję)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {recipe.calories && (
                  <div className="p-2 rounded bg-orange-100 dark:bg-orange-900/30">
                    <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {Math.round(recipe.calories / (recipe.servings || 1))}
                    </div>
                    <div className="text-muted-foreground">kcal</div>
                  </div>
                )}
                {recipe.protein && (
                  <div className="p-2 rounded bg-red-100 dark:bg-red-900/30">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {Math.round(recipe.protein / (recipe.servings || 1) * 10) / 10}g
                    </div>
                    <div className="text-muted-foreground">białko</div>
                  </div>
                )}
                {recipe.carbs && (
                  <div className="p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(recipe.carbs / (recipe.servings || 1) * 10) / 10}g
                    </div>
                    <div className="text-muted-foreground">węgl.</div>
                  </div>
                )}
                {recipe.fat && (
                  <div className="p-2 rounded bg-yellow-100 dark:bg-yellow-900/30">
                    <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {Math.round(recipe.fat / (recipe.servings || 1) * 10) / 10}g
                    </div>
                    <div className="text-muted-foreground">tłuszcz</div>
                  </div>
                )}
                {recipe.fiber && (
                  <div className="p-2 rounded bg-green-100 dark:bg-green-900/30">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {Math.round(recipe.fiber / (recipe.servings || 1) * 10) / 10}g
                    </div>
                    <div className="text-muted-foreground">błonnik</div>
                  </div>
                )}
              </div>
              {servings !== recipe.servings && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  💡 Wartości pokazane dla oryginalnej porcji ({recipe.servings} porcji)
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Diety i alergeny */}
        {(recipe.isVegetarian || recipe.isVegan || recipe.isGlutenFree || recipe.isDairyFree || (recipe.allergens && recipe.allergens.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                🏷️ Diety i alergeny
              </CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dodatkowe informacje o gotowaniu */}
      {(recipe.cuisine || recipe.cookingMethod || recipe.ovenTemp || recipe.ovenMode || recipe.tips || recipe.source) && (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {/* Informacje o gotowaniu */}
          {(recipe.cuisine || recipe.cookingMethod || recipe.ovenTemp || recipe.ovenMode) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  🍳 Szczegóły gotowania
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {recipe.cuisine && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Kuchnia:</span>
                    <span className="font-medium">{recipe.cuisine}</span>
                  </div>
                )}
                {recipe.cookingMethod && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Metoda:</span>
                    <span className="font-medium">{cookingMethodLabels[recipe.cookingMethod] || recipe.cookingMethod}</span>
                  </div>
                )}
                {recipe.ovenTemp && (
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-600" />
                    <span className="text-muted-foreground">Temperatura piekarnika:</span>
                    <span className="font-medium">{recipe.ovenTemp}°C</span>
                  </div>
                )}
                {recipe.ovenMode && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tryb piekarnika:</span>
                    <span className="font-medium">{recipe.ovenMode}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Wskazówki i źródła */}
          {(recipe.tips || recipe.source) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  💡 Dodatkowe informacje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recipe.tips && (
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-line">{recipe.tips}</p>
                  </div>
                )}
                {recipe.source && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">📚 Źródło: </span>
                    <span className="font-medium">{recipe.source}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Notatki i oceny */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            📝 Notatki i szczegółowa ocena
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeNotesAndRating recipeId={recipe.id} />
        </CardContent>
      </Card>

      {/* Komentarze */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            💬 Komentarze
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecipeComments recipeId={recipe.id} currentUserId={currentUserId} />
        </CardContent>
      </Card>

      {/* Zaawansowany tryb gotowania */}
      <Dialog open={cookingModeOpen} onOpenChange={setCookingModeOpen}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
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
            onClose={() => setCookingModeOpen(false)}
            servings={servings}
            onServingsChange={setServings}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć przepis?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć przepis &quot;{recipe.name}&quot;? Ta operacja jest nieodwracalna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <RecipeWizardDialog
        open={editingMode}
        onOpenChange={setEditingMode}
        recipe={recipe}
        onRecipeCreated={() => {}} // Nie tworzymy nowych przepisów na tej stronie
        onRecipeUpdated={handleRecipeUpdated}
      />
    </div>
  );
}

