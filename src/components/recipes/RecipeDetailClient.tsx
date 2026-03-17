"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, ChefHat, Users, ArrowLeft, Edit, Trash2, Heart,
  Flame, Thermometer, Timer, Info, Apple, Wheat, Milk,
  AlertTriangle, Video, ExternalLink, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Image from "next/image";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RecipeDetailClientProps {
  recipeId: string;
}

const difficultyLabels = {
  EASY: "Łatwy",
  MEDIUM: "Średni",
  HARD: "Trudny",
};

const cookingMethodLabels: Record<string, string> = {
  BAKING: "Pieczenie",
  FRYING: "Smażenie",
  BOILING: "Gotowanie",
  STEAMING: "Gotowanie na parze",
  GRILLING: "Grillowanie",
  ROASTING: "Pieczenie (mięso)",
  STEWING: "Duszenie",
  SAUTEING: "Podsmażanie",
  AIR_FRYING: "Air fryer",
  MIXING: "Mieszanie",
  OTHER: "Inne",
};

const ovenModeLabels: Record<string, string> = {
  CONVENTIONAL: "Góra-dół",
  FAN_ASSISTED: "Termoobieg",
  GRILL: "Grill",
  PIZZA: "Tryb pizza",
};

export function RecipeDetailClient({ recipeId }: RecipeDetailClientProps) {
  const router = useRouter();
  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [cookingMode, setCookingMode] = useState(false);
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [currentServings, setCurrentServings] = useState(4);
  const [stepTimer, setStepTimer] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && stepTimer !== null && stepTimer > 0) {
      interval = setInterval(() => {
        setStepTimer((prev) => {
          if (prev !== null && prev > 0) {
            return prev - 1;
          }
          return prev;
        });
      }, 1000);
    }
    if (stepTimer === 0 && timerRunning) {
      setTimerRunning(false);
      toast.success("⏰ Czas minął! Przejdź do następnego kroku.");
      // Play sound if available
      try {
        const audio = new Audio("/sounds/timer.mp3");
        audio.play().catch(() => {});
      } catch {}
    }
    return () => clearInterval(interval);
  }, [timerRunning, stepTimer]);

  // Set current servings when recipe loads
  useEffect(() => {
    if (recipe?.servings) {
      setCurrentServings(recipe.servings);
    }
  }, [recipe?.servings]);

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}`);
      if (response.ok) {
        const data = await response.json();
        setRecipe(data);
        setIsFavorite(data.favorites?.length > 0);
      } else {
        toast.error("Nie udało się pobrać przepisu");
        router.push("/recipes");
      }
    } catch (error) {
      console.error("Error loading recipe:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, {
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

  const toggleFavorite = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
        method: isFavorite ? "DELETE" : "POST",
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? "Usunięto z ulubionych" : "Dodano do ulubionych");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Wystąpił błąd");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Ładowanie przepisu...</p>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0) + (recipe.restTime || 0);

  // Format timer display
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Scale ingredient quantity
  const scaleQuantity = (quantity: number | null) => {
    if (!quantity) return null;
    const scaled = quantity * servingsMultiplier;
    return scaled % 1 === 0 ? scaled : parseFloat(scaled.toFixed(2));
  };

  // Start timer for current step
  const startStepTimer = (durationMinutes: number) => {
    setStepTimer(durationMinutes * 60);
    setTimerRunning(true);
  };

  // Handle servings change
  const handleServingsChange = (newServings: number) => {
    if (newServings < 1) return;
    setCurrentServings(newServings);
    setServingsMultiplier(newServings / (recipe?.servings || 4));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Powrót
        </Button>

        <div className="flex gap-2">
          <Button
            variant={cookingMode ? "default" : "outline"}
            onClick={() => setCookingMode(!cookingMode)}
            className="gap-2"
          >
            <ChefHat className="h-4 w-4" />
            {cookingMode ? "Zakończ gotowanie" : "Tryb gotowania"}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFavorite}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push(`/recipes/${recipeId}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          {recipe.image ? (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <Image
                src={recipe.image}
                alt={recipe.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
              <ChefHat className="h-20 w-20 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
            {recipe.description && (
              <p className="text-muted-foreground">{recipe.description}</p>
            )}
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap gap-2">
            {recipe.difficulty && (
              <Badge variant="secondary">
                {difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels]}
              </Badge>
            )}
            {recipe.category && (
              <Badge variant="outline">{recipe.category}</Badge>
            )}
            {recipe.cuisine && (
              <Badge variant="outline">{recipe.cuisine}</Badge>
            )}
            {recipe.isVegetarian && (
              <Badge variant="outline" className="gap-1">
                <Apple className="h-3 w-3" />
                Wegetariańskie
              </Badge>
            )}
            {recipe.isVegan && (
              <Badge variant="outline" className="gap-1">
                <Heart className="h-3 w-3" />
                Wegańskie
              </Badge>
            )}
            {recipe.isGlutenFree && (
              <Badge variant="outline" className="gap-1">
                <Wheat className="h-3 w-3" />
                Bezglutenowe
              </Badge>
            )}
            {recipe.isDairyFree && (
              <Badge variant="outline" className="gap-1">
                <Milk className="h-3 w-3" />
                Bez nabiału
              </Badge>
            )}
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recipe.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Time & Servings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recipe.prepTime && (
              <div className="text-center p-3 rounded-lg bg-muted">
                <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.prepTime} min</div>
                <div className="text-xs text-muted-foreground">Przygotowanie</div>
              </div>
            )}
            {recipe.cookTime && (
              <div className="text-center p-3 rounded-lg bg-muted">
                <Flame className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.cookTime} min</div>
                <div className="text-xs text-muted-foreground">Gotowanie</div>
              </div>
            )}
            {recipe.restTime && (
              <div className="text-center p-3 rounded-lg bg-muted">
                <Timer className="h-5 w-5 mx-auto mb-1 text-primary" />
                <div className="text-sm font-medium">{recipe.restTime} min</div>
                <div className="text-xs text-muted-foreground">Odpoczynek</div>
              </div>
            )}
            <div className="text-center p-3 rounded-lg bg-muted">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-sm font-medium">{recipe.servings}</div>
              <div className="text-xs text-muted-foreground">Porcje</div>
            </div>
          </div>

          {/* Additional Info */}
          {(recipe.source || recipe.videoUrl) && (
            <div className="space-y-2">
              {recipe.source && (
                <div className="flex items-center gap-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Źródło:</span>
                  <span>{recipe.source}</span>
                </div>
              )}
              {recipe.videoUrl && (
                <a
                  href={recipe.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Video className="h-4 w-4" />
                  Zobacz wideo
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tryb gotowania */}
      {cookingMode && recipe.steps && (
        <Card className="mb-6 border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ChefHat className="h-6 w-6 text-primary animate-pulse" />
                Tryb gotowania - Krok {activeStep + 1} z {recipe.steps.length}
              </CardTitle>

              {/* Timer i parametry kroku */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Timer */}
                {recipe.steps[activeStep]?.duration && (
                  <div className="flex items-center gap-2">
                    {stepTimer !== null ? (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl ${
                        stepTimer <= 60 ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" : "bg-primary/20 text-primary"
                      }`}>
                        <Timer className="h-5 w-5" />
                        {formatTimer(stepTimer)}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setTimerRunning(!timerRunning);
                          }}
                          className="ml-2 h-8 w-8 p-0"
                        >
                          {timerRunning ? "⏸️" : "▶️"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setStepTimer(null);
                            setTimerRunning(false);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={() => startStepTimer(recipe.steps[activeStep].duration)}
                        className="gap-2"
                      >
                        <Timer className="h-4 w-4" />
                        Włącz timer ({recipe.steps[activeStep].duration} min)
                      </Button>
                    )}
                  </div>
                )}

                {recipe.steps[activeStep]?.temperature && (
                  <Badge variant="secondary" className="text-lg px-4 py-2 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                    <Thermometer className="h-4 w-4 mr-2" />
                    {recipe.steps[activeStep].temperature}°C
                  </Badge>
                )}
              </div>
            </div>

            {/* Pasek postępu */}
            <div className="flex gap-1 mt-4">
              {recipe.steps.map((_: unknown, idx: number) => (
                <div
                  key={idx}
                  className={`flex-1 h-3 rounded-full cursor-pointer transition-all hover:scale-y-150 ${
                    idx < activeStep
                      ? "bg-green-500"
                      : idx === activeStep
                      ? "bg-primary animate-pulse"
                      : "bg-muted"
                  }`}
                  onClick={() => {
                    setActiveStep(idx);
                    setStepTimer(null);
                    setTimerRunning(false);
                  }}
                  title={`Krok ${idx + 1}`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Panel z informacjami o przepisie (tylko na pierwszym kroku) */}
            {activeStep === 0 && (recipe.prepTime || recipe.cookTime || recipe.restTime || recipe.ovenTemp || recipe.cookingMethod || recipe.cuisine) && (
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-base mb-3 flex items-center gap-2 justify-center">
                  📋 Informacje o przepisie
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {recipe.prepTime && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">Przygotowanie</div>
                        <div className="font-semibold">{recipe.prepTime} min</div>
                      </div>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">Gotowanie</div>
                        <div className="font-semibold">{recipe.cookTime} min</div>
                      </div>
                    </div>
                  )}
                  {recipe.restTime && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">Odpoczynek</div>
                        <div className="font-semibold">{recipe.restTime} min</div>
                      </div>
                    </div>
                  )}
                  {recipe.ovenTemp && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <Thermometer className="h-4 w-4 text-orange-600" />
                      <div>
                        <div className="text-xs text-muted-foreground">Temperatura</div>
                        <div className="font-semibold">{recipe.ovenTemp}°C</div>
                      </div>
                    </div>
                  )}
                  {recipe.cookingMethod && cookingMethodLabels[recipe.cookingMethod] && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <ChefHat className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground">Metoda</div>
                        <div className="font-semibold text-xs">{cookingMethodLabels[recipe.cookingMethod]}</div>
                      </div>
                    </div>
                  )}
                  {recipe.cuisine && (
                    <div className="flex items-center gap-2 bg-white/50 dark:bg-black/20 rounded-lg p-2">
                      <span className="text-lg">🌍</span>
                      <div>
                        <div className="text-xs text-muted-foreground">Kuchnia</div>
                        <div className="font-semibold text-xs">{recipe.cuisine}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Wskazówki ogólne (tylko na pierwszym kroku) */}
            {activeStep === 0 && recipe.tips && (
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-base mb-2 flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
                  💡 Wskazówki ogólne
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 whitespace-pre-line">{recipe.tips}</p>
              </div>
            )}

            {/* Zdjęcie kroku */}
            {recipe.steps[activeStep]?.image && (
              <div className="relative aspect-video rounded-lg overflow-hidden max-w-2xl mx-auto shadow-lg">
                <Image
                  src={recipe.steps[activeStep].image}
                  alt={`Krok ${activeStep + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Treść kroku */}
            <div className="text-center py-4">
              <p className="text-2xl md:text-3xl leading-relaxed font-medium">{recipe.steps[activeStep]?.content}</p>
            </div>

            {/* Wskazówka */}
            {recipe.steps[activeStep]?.tip && (
              <div className="flex gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 max-w-2xl mx-auto">
                <Lightbulb className="h-6 w-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-yellow-900 dark:text-yellow-100">💡 Wskazówka</p>
                  <p className="text-yellow-800 dark:text-yellow-200">{recipe.steps[activeStep].tip}</p>
                </div>
              </div>
            )}

            {/* Przyciski nawigacji */}
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setActiveStep(Math.max(0, activeStep - 1));
                  setStepTimer(null);
                  setTimerRunning(false);
                }}
                disabled={activeStep === 0}
                className="h-16 text-lg"
              >
                ← Poprzedni krok
              </Button>
              {activeStep === recipe.steps.length - 1 ? (
                <Button
                  size="lg"
                  onClick={() => {
                    setCookingMode(false);
                    setActiveStep(0);
                    setStepTimer(null);
                    setTimerRunning(false);
                    toast.success("🎉 Gratulacje! Przepis ukończony!");
                  }}
                  className="h-16 text-lg bg-green-600 hover:bg-green-700"
                >
                  ✓ Zakończ gotowanie
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => {
                    setActiveStep(activeStep + 1);
                    setStepTimer(null);
                    setTimerRunning(false);
                  }}
                  className="h-16 text-lg"
                >
                  Następny krok →
                </Button>
              )}
            </div>

            {/* Szybki podgląd składników ze skalowaniem */}
            <details className="max-w-2xl mx-auto" open>
              <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground flex items-center gap-2">
                📋 Składniki (kliknij aby rozwinąć/zwinąć)
              </summary>
              <div className="mt-3 p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-4 mb-4 pb-3 border-b">
                  <span className="text-sm font-medium">Porcje:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleServingsChange(currentServings - 1)}
                      disabled={currentServings <= 1}
                      className="h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <span className="font-bold text-lg w-8 text-center">{currentServings}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleServingsChange(currentServings + 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
                  </div>
                  {servingsMultiplier !== 1 && (
                    <Badge variant="secondary" className="ml-2">
                      x{servingsMultiplier.toFixed(2)}
                    </Badge>
                  )}
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {recipe.ingredients?.map((ing: { id: string; name: string; quantity: number | null; unit?: string }) => (
                    <li key={ing.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                      <span className="text-primary">•</span>
                      <span className="font-medium">{ing.name}</span>
                      {ing.quantity && (
                        <span className="text-muted-foreground ml-auto">
                          {scaleQuantity(ing.quantity)} {ing.unit || ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="recipe" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recipe">Przepis</TabsTrigger>
          <TabsTrigger value="cooking">Gotowanie</TabsTrigger>
          <TabsTrigger value="nutrition">Odżywianie</TabsTrigger>
          <TabsTrigger value="info">Informacje</TabsTrigger>
        </TabsList>

        {/* TAB: PRZEPIS */}
        <TabsContent value="recipe" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Składniki */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>🥕 Składniki</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Porcje:</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleServingsChange(currentServings - 1)}
                      disabled={currentServings <= 1}
                      className="h-8 w-8 p-0"
                    >
                      -
                    </Button>
                    <span className="font-bold text-lg w-8 text-center">{currentServings}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleServingsChange(currentServings + 1)}
                      className="h-8 w-8 p-0"
                    >
                      +
                    </Button>
                  </div>
                </div>
                {servingsMultiplier !== 1 && (
                  <p className="text-xs text-muted-foreground">
                    Oryginalna liczba porcji: {recipe.servings} • Mnożnik: x{servingsMultiplier.toFixed(2)}
                  </p>
                )}
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <ul className="space-y-3">
                  {recipe.ingredients?.map((ingredient: { id: string; name: string; quantity: number | null; unit?: string; optional?: boolean }) => (
                    <li key={ingredient.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      <span className="flex-1 font-medium">{ingredient.name}</span>
                      {ingredient.quantity && (
                        <span className={`font-mono ${servingsMultiplier !== 1 ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {scaleQuantity(ingredient.quantity)}
                          {ingredient.unit && ` ${ingredient.unit}`}
                        </span>
                      )}
                      {ingredient.optional && (
                        <Badge variant="outline" className="text-xs">
                          opcjonalne
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Kroki - Lista */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>📝 Kroki przygotowania</CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setCookingMode(true);
                      setActiveStep(0);
                    }}
                    className="gap-2"
                  >
                    <ChefHat className="h-4 w-4" />
                    Gotuj!
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="max-h-[500px] overflow-y-auto">
                <div className="space-y-4">
                  {recipe.steps?.map((step: { id: string; content: string; duration?: number; temperature?: number; isOptional?: boolean }, index: number) => (
                    <div
                      key={step.id}
                      className={`flex gap-3 cursor-pointer p-3 rounded-lg transition-all ${
                        activeStep === index
                          ? "bg-primary/10 border-l-4 border-primary"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setActiveStep(index)}
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          activeStep === index
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{step.content}</p>
                        <div className="flex gap-3 mt-2">
                          {step.duration && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Timer className="h-3 w-3" />
                              {step.duration} min
                            </Badge>
                          )}
                          {step.temperature && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Thermometer className="h-3 w-3" />
                              {step.temperature}°C
                            </Badge>
                          )}
                          {step.isOptional && (
                            <Badge variant="secondary" className="text-xs">
                              opcjonalny
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aktywny krok - szczegóły */}
          {recipe.steps && recipe.steps[activeStep] && (
            <Card className="border-primary/30">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {activeStep + 1}
                    </div>
                    Krok {activeStep + 1} z {recipe.steps.length}
                    {recipe.steps[activeStep].isOptional && (
                      <Badge variant="secondary">Opcjonalny</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {recipe.steps[activeStep].duration && (
                      <Badge variant="outline" className="gap-1">
                        <Timer className="h-3 w-3" />
                        {recipe.steps[activeStep].duration} min
                      </Badge>
                    )}
                    {recipe.steps[activeStep].temperature && (
                      <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                        <Thermometer className="h-3 w-3" />
                        {recipe.steps[activeStep].temperature}°C
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {recipe.steps[activeStep].image && (
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <Image
                      src={recipe.steps[activeStep].image}
                      alt={`Krok ${activeStep + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <p className="text-lg leading-relaxed">{recipe.steps[activeStep].content}</p>

                {recipe.steps[activeStep].tip && (
                  <div className="flex gap-2 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">💡 Wskazówka</p>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">{recipe.steps[activeStep].tip}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="gap-2"
                  >
                    ← Poprzedni
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => {
                      setCookingMode(true);
                    }}
                    className="gap-2"
                  >
                    <ChefHat className="h-4 w-4" />
                    Tryb gotowania
                  </Button>
                  <Button
                    onClick={() => setActiveStep(Math.min(recipe.steps.length - 1, activeStep + 1))}
                    disabled={activeStep === recipe.steps.length - 1}
                    className="gap-2"
                  >
                    Następny →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Wskazówki */}
          {recipe.tips && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Wskazówki i porady
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{recipe.tips}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: GOTOWANIE */}
        <TabsContent value="cooking" className="space-y-6">
          {/* Przycisk uruchomienia trybu gotowania */}
          <Card className="border-primary bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                    <ChefHat className="h-6 w-6 text-primary" />
                    Gotowy do gotowania?
                  </h3>
                  <p className="text-muted-foreground mt-1">
                    Włącz tryb gotowania aby przejść krok po kroku przez przepis z timerem i wskazówkami
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => {
                    setCookingMode(true);
                    setActiveStep(0);
                  }}
                  className="gap-2 px-8"
                >
                  <ChefHat className="h-5 w-5" />
                  Rozpocznij gotowanie
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Parametry gotowania */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Parametry gotowania
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recipe.cookingMethod ? (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <div className="text-sm text-muted-foreground">Sposób gotowania</div>
                      <div className="font-semibold text-lg">
                        {cookingMethodLabels[recipe.cookingMethod] || recipe.cookingMethod}
                      </div>
                    </div>
                    <div className="text-3xl">
                      {recipe.cookingMethod === "BAKING" && "🍞"}
                      {recipe.cookingMethod === "FRYING" && "🍳"}
                      {recipe.cookingMethod === "BOILING" && "🍲"}
                      {recipe.cookingMethod === "GRILLING" && "🔥"}
                      {recipe.cookingMethod === "STEAMING" && "💨"}
                      {recipe.cookingMethod === "ROASTING" && "🍖"}
                      {recipe.cookingMethod === "STEWING" && "🥘"}
                      {recipe.cookingMethod === "AIR_FRYING" && "🌀"}
                      {recipe.cookingMethod === "MIXING" && "🥣"}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nie określono metody gotowania
                  </p>
                )}

                {(recipe.ovenTemp || recipe.ovenMode) && (
                  <div className="grid grid-cols-2 gap-4">
                    {recipe.ovenTemp && (
                      <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-center">
                        <Thermometer className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {recipe.ovenTemp}°C
                        </div>
                        <div className="text-sm text-muted-foreground">Temperatura</div>
                      </div>
                    )}
                    {recipe.ovenMode && (
                      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                        <Flame className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {ovenModeLabels[recipe.ovenMode] || recipe.ovenMode}
                        </div>
                        <div className="text-sm text-muted-foreground">Tryb piekarnika</div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Czasy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Szczegółowe czasy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {recipe.prepTime && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <span>Przygotowanie</span>
                      </div>
                      <span className="font-bold text-lg">{recipe.prepTime} min</span>
                    </div>
                  )}
                  {recipe.cookTime && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Flame className="h-5 w-5 text-orange-600" />
                        </div>
                        <span>Gotowanie</span>
                      </div>
                      <span className="font-bold text-lg">{recipe.cookTime} min</span>
                    </div>
                  )}
                  {recipe.restTime && (
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Timer className="h-5 w-5 text-green-600" />
                        </div>
                        <span>Odpoczynek</span>
                      </div>
                      <span className="font-bold text-lg">{recipe.restTime} min</span>
                    </div>
                  )}
                </div>
                {totalTime > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center p-4 rounded-lg bg-primary/10">
                      <span className="font-bold text-lg">Łączny czas</span>
                      <span className="font-bold text-2xl text-primary">{totalTime} min</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: ODŻYWIANIE */}
        <TabsContent value="nutrition" className="space-y-6">
          {/* Wartości odżywcze - wizualizacja */}
          {(recipe.calories || recipe.protein || recipe.carbs || recipe.fat || recipe.fiber) ? (
            <div className="space-y-6">
              {/* Główne makro w karcie */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    🍽️ Wartości odżywcze na porcję
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Kalorie */}
                    <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                      <div className="text-3xl mb-1">🔥</div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {recipe.calories || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">kcal</div>
                    </div>

                    {/* Białko */}
                    <div className="text-center p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="text-3xl mb-1">💪</div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {recipe.protein || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">g białka</div>
                    </div>

                    {/* Węglowodany */}
                    <div className="text-center p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <div className="text-3xl mb-1">🍞</div>
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {recipe.carbs || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">g węgl.</div>
                    </div>

                    {/* Tłuszcz */}
                    <div className="text-center p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="text-3xl mb-1">🧈</div>
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {recipe.fat || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">g tłuszczu</div>
                    </div>

                    {/* Błonnik */}
                    <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="text-3xl mb-1">🌾</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {recipe.fiber || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">g błonnika</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alergeny */}
              {recipe.allergens && recipe.allergens.length > 0 && (
                <Card className="border-destructive/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      Zawiera alergeny
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {recipe.allergens.map((allergen: string) => (
                        <Badge key={allergen} variant="destructive" className="text-sm px-3 py-1">
                          ⚠️ {allergen}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Oznaczenia dietetyczne */}
              {(recipe.isVegetarian || recipe.isVegan || recipe.isGlutenFree || recipe.isDairyFree) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Oznaczenia dietetyczne</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {recipe.isVegetarian && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          🥬 Wegetariański
                        </div>
                      )}
                      {recipe.isVegan && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                          🌱 Wegański
                        </div>
                      )}
                      {recipe.isGlutenFree && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          🌾 Bezglutenowy
                        </div>
                      )}
                      {recipe.isDairyFree && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          🥛 Bez nabiału
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="text-4xl mb-4">📊</div>
                <p>Brak informacji o wartościach odżywczych dla tego przepisu.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/recipes/${recipeId}/edit`)}
                >
                  Dodaj wartości odżywcze
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: INFORMACJE */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informacje o przepisie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Dodano przez</div>
                <div className="font-medium">{recipe.createdBy?.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Data dodania</div>
                <div className="font-medium">
                  {new Date(recipe.createdAt).toLocaleDateString("pl-PL")}
                </div>
              </div>
              {recipe.updatedAt !== recipe.createdAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Ostatnia aktualizacja</div>
                  <div className="font-medium">
                    {new Date(recipe.updatedAt).toLocaleDateString("pl-PL")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć ten przepis?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Przepis zostanie trwale usunięty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń przepis"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

