"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  X,
  ChefHat,
  Timer,
  Play,
  Pause,
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { VoiceControl } from "./VoiceControl";

// Typy
export interface CookingStep {
  id: string;
  content: string;
  duration?: number | null;
  temperature?: number | null;
  image?: string | null;
  tip?: string | null;
  order: number;
  isOptional?: boolean;
  stepIngredients?: Array<{
    ingredient: {
      id: string;
      name: string;
      quantity?: number | null;
      unit?: string | null;
    };
  }>;
}

export interface CookingIngredient {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  stepIngredients?: Array<{
    stepId: string;
  }>;
}

export interface CookingRecipe {
  name: string;
  servings?: number;
  cookingMethod?: string | null;
  ovenTemp?: number | null;
  ovenMode?: string | null;
  tips?: string | null;
  videoUrl?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  steps: CookingStep[];
  ingredients: CookingIngredient[];
}

interface CookingModeViewProps {
  recipe: CookingRecipe;
  onClose: () => void;
  servings?: number;
  onServingsChange?: (servings: number) => void;
}

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

const ovenModeLabels: Record<string, string> = {
  CONVENTIONAL: "Góra-dół",
  FAN_ASSISTED: "Termoobieg",
  GRILL: "Grill",
  PIZZA: "Tryb pizza",
};

// Funkcja do wyciągania czasu z tekstu kroku
function extractTimeFromStep(content: string): number | null {
  const patterns = [
    /(\d+)\s*(?:minut[yęa]?|min)/i,
    /(\d+)\s*(?:godzin[yęa]?|godz|h)/i,
    /(\d+)\s*(?:sekund[yęa]?|sek|s)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (pattern.source.includes("godzin")) return value * 60;
      if (pattern.source.includes("sekund")) return Math.ceil(value / 60);
      return value;
    }
  }
  return null;
}

// Funkcja do formatowania timera
function formatMainTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Funkcja do konwersji URL YouTube na embed
function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

export function CookingModeView({
  recipe,
  onClose,
  servings: initialServings,
  onServingsChange,
}: CookingModeViewProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [usedIngredients, setUsedIngredients] = useState<Set<string>>(new Set());
  const [mainTimer, setMainTimer] = useState<number | null>(null);
  const [mainTimerRunning, setMainTimerRunning] = useState(false);
  const [servings, setServings] = useState(initialServings || recipe.servings || 4);

  // Voice Control state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const servingMultiplier = servings / (recipe.servings || 4);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mainTimerRunning && mainTimer !== null && mainTimer > 0) {
      interval = setInterval(() => {
        setMainTimer((prev) => {
          if (prev === null || prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mainTimerRunning, mainTimer]);

  // Efekt do obsługi zakończenia timera
  useEffect(() => {
    if (mainTimer === 0 && mainTimerRunning) {
      const timeout = setTimeout(() => {
        setMainTimerRunning(false);
        toast.success("⏰ Czas minął!", {
          duration: 10000,
        });

        // Odtwórz dźwięk alertu używając Web Audio API
        try {
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

          const playBeep = (frequency: number, duration: number, delay: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + duration);

            oscillator.start(audioContext.currentTime + delay);
            oscillator.stop(audioContext.currentTime + delay + duration);
          };

          playBeep(800, 0.2, 0);
          playBeep(800, 0.2, 0.3);
          playBeep(800, 0.4, 0.6);
        } catch (error) {
          console.log('Nie można odtworzyć dźwięku:', error);
        }
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [mainTimer, mainTimerRunning]);

  // Aktualizuj servings
  useEffect(() => {
    if (onServingsChange) {
      onServingsChange(servings);
    }
  }, [servings, onServingsChange]);

  // Voice Control callbacks
  const handleVoiceNext = () => {
    if (activeStep < recipe.steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleVoicePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleVoiceRepeat = () => {
    // Could use TTS to read current step
    const currentStepData = recipe.steps[activeStep];
    if (currentStepData) {
      toast.info(`Krok ${activeStep + 1}: ${currentStepData.content}`);
    }
  };

  const handleVoicePause = () => {
    if (mainTimerRunning) {
      setMainTimerRunning(false);
    }
  };

  const handleVoiceResume = () => {
    if (mainTimer && mainTimer > 0) {
      setMainTimerRunning(true);
    }
  };

  const handleVoiceSetTimer = (minutes: number) => {
    setMainTimer(minutes * 60);
    setMainTimerRunning(true);
    toast.success(`Timer ustawiony na ${minutes} minut`);
  };

  const toggleStep = (stepIndex: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepIndex)
        ? prev.filter((s) => s !== stepIndex)
        : [...prev, stepIndex]
    );
  };

  const toggleIngredient = (ingredientId: string) => {
    setUsedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const startMainTimer = (minutes: number) => {
    setMainTimer(minutes * 60);
    setMainTimerRunning(true);
  };

  const getIngredientsForStep = (stepIndex: number) => {
    const step = recipe.steps[stepIndex];
    if (!step?.stepIngredients) return [];

    return step.stepIngredients.map((si) => si.ingredient);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header trybu gotowania */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} title="Zamknij tryb gotowania">
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              {recipe.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Krok {activeStep + 1} z {recipe.steps?.length || 0}
            </p>
            {/* Progress bar */}
            <div className="mt-2 w-48">
              <Progress
                value={((activeStep + 1) / (recipe.steps?.length || 1)) * 100}
                className="h-2"
              />
            </div>
          </div>
        </div>

        {/* Timer główny i przycisk oceń */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              toast.info("Przewiń w dół aby ocenić przepis ⭐");
            }}
            className="gap-2"
          >
            ⭐ Oceń przepis
          </Button>
          {mainTimer !== null ? (
            <div
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xl",
                mainTimer <= 60
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-primary/20 text-primary"
              )}
            >
              <Timer className="h-5 w-5" />
              {formatMainTimer(mainTimer)}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMainTimerRunning(!mainTimerRunning)}
                className="h-8 w-8 p-0 ml-2"
              >
                {mainTimerRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMainTimer(null);
                  setMainTimerRunning(false);
                }}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            (() => {
              const stepDuration = recipe.steps?.[activeStep]?.duration;
              const extractedTime = extractTimeFromStep(
                recipe.steps?.[activeStep]?.content || ""
              );
              const timerMinutes = stepDuration || extractedTime;

              return timerMinutes ? (
                <Button
                  variant="secondary"
                  onClick={() => startMainTimer(timerMinutes)}
                  className="gap-2"
                >
                  <Timer className="h-4 w-4" />
                  Timer: {timerMinutes} min
                </Button>
              ) : null;
            })()
          )}
        </div>
      </div>

      {/* Voice Control */}
      <div className="py-4 border-b">
        <VoiceControl
          currentStepIndex={activeStep}
          totalSteps={recipe.steps?.length || 0}
          onNextStep={handleVoiceNext}
          onPreviousStep={handleVoicePrevious}
          onRepeat={handleVoiceRepeat}
          onPause={handleVoicePause}
          onResume={handleVoiceResume}
          onSetTimer={handleVoiceSetTimer}
          isEnabled={isVoiceEnabled}
          onToggle={setIsVoiceEnabled}
        />
      </div>

      {/* Progress bars */}
      <div className="flex gap-1 py-4">
        {recipe.steps?.map((_, idx: number) => (
          <div
            key={idx}
            className={cn(
              "flex-1 h-3 rounded-full cursor-pointer transition-all hover:scale-y-125",
              completedSteps.includes(idx)
                ? "bg-green-500"
                : idx === activeStep
                ? "bg-primary animate-pulse"
                : idx < activeStep
                ? "bg-green-300"
                : "bg-muted"
            )}
            onClick={() => setActiveStep(idx)}
            title={`Krok ${idx + 1}`}
          />
        ))}
      </div>

      {/* Główna zawartość */}
      <div className="flex-1 overflow-auto">
        <div className="grid md:grid-cols-3 gap-6 h-full">
          {/* Lewa kolumna - składniki */}
          <div className="md:col-span-1 bg-muted/30 rounded-lg p-3 flex flex-col max-h-full">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              📋 Składniki
              <Badge variant="outline" className="text-xs">
                {servings} porcji
              </Badge>
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="h-7 w-7 p-0"
              >
                -
              </Button>
              <span className="font-bold w-8 text-center text-sm">{servings}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setServings(servings + 1)}
                className="h-7 w-7 p-0"
              >
                +
              </Button>
              {servingMultiplier !== 1 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  x{servingMultiplier.toFixed(2)}
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1">
              <ul className="space-y-1.5 text-xs pr-2 mb-4">
                {recipe.ingredients?.map((ing) => {
                  const isUsed = usedIngredients.has(ing.id);
                  return (
                    <li
                      key={ing.id}
                      className={cn(
                        "flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all",
                        isUsed
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "hover:bg-muted/80"
                      )}
                      onClick={() => toggleIngredient(ing.id)}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center",
                          isUsed
                            ? "bg-green-500 border-green-600"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isUsed && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span
                        className={cn(
                          "flex-1 leading-tight",
                          isUsed && "line-through text-muted-foreground"
                        )}
                      >
                        {ing.name}
                      </span>
                      {ing.quantity && (
                        <span
                          className={cn(
                            "font-mono text-xs whitespace-nowrap",
                            isUsed && "text-muted-foreground"
                          )}
                        >
                          {(Number(ing.quantity) * servingMultiplier).toFixed(
                            Number(ing.quantity) * servingMultiplier % 1 === 0
                              ? 0
                              : 1
                          )}{" "}
                          {ing.unit || ""}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>

              {/* Wartości odżywcze - kompaktowe */}
              {(recipe.calories ||
                recipe.protein ||
                recipe.carbs ||
                recipe.fat ||
                recipe.fiber) && (
                <div className="p-2 rounded-lg bg-muted/50 border mb-3">
                  <h4 className="font-semibold text-xs mb-2">
                    📊 Wartości odżywcze
                  </h4>
                  <div className="grid grid-cols-2 gap-1 text-center text-[10px]">
                    {recipe.calories && (
                      <div className="p-1 rounded bg-orange-100 dark:bg-orange-900/30">
                        <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                          {recipe.calories}
                        </div>
                        <div className="text-muted-foreground">kcal</div>
                      </div>
                    )}
                    {recipe.protein && (
                      <div className="p-1 rounded bg-red-100 dark:bg-red-900/30">
                        <div className="text-sm font-bold text-red-600 dark:text-red-400">
                          {recipe.protein}g
                        </div>
                        <div className="text-muted-foreground">białko</div>
                      </div>
                    )}
                    {recipe.carbs && (
                      <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {recipe.carbs}g
                        </div>
                        <div className="text-muted-foreground">węgl.</div>
                      </div>
                    )}
                    {recipe.fat && (
                      <div className="p-1 rounded bg-yellow-100 dark:bg-yellow-900/30">
                        <div className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          {recipe.fat}g
                        </div>
                        <div className="text-muted-foreground">tłuszcz</div>
                      </div>
                    )}
                    {recipe.fiber && (
                      <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                        <div className="text-sm font-bold text-green-600 dark:text-green-400">
                          {recipe.fiber}g
                        </div>
                        <div className="text-muted-foreground">błonnik</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Film instruktażowy - kompaktowy */}
              {recipe.videoUrl &&
                (() => {
                  const embedUrl = getYouTubeEmbedUrl(recipe.videoUrl);
                  return embedUrl ? (
                    <div className="space-y-1 pr-2">
                      <h4 className="font-semibold text-xs flex items-center gap-1">
                        🎥 Film
                      </h4>
                      <div className="relative aspect-video rounded-md overflow-hidden bg-black">
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
                  ) : null;
                })()}
            </ScrollArea>
          </div>

          {/* Prawa kolumna - krok */}
          <div className="md:col-span-2 flex flex-col h-full relative">
            {/* Główna zawartość - scrollowana */}
            <div className="flex-1 overflow-auto px-2 pb-20">
              <div className="flex flex-col items-center justify-start py-3 min-h-full">
                {/* Numer kroku */}
                <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-3">
                  {activeStep + 1}
                </div>

                {/* Skonsolidowane informacje o gotowaniu */}
                {(() => {
                  const stepContent =
                    recipe.steps?.[activeStep]?.content?.toLowerCase() || "";
                  const keywords = [
                    "piecz",
                    "piekarnik",
                    "nagrzej",
                    "temperatura",
                    "grilluj",
                    "ustawień",
                    "tryb",
                    "wstaw",
                  ];
                  const isRelevant = keywords.some((keyword) =>
                    stepContent.includes(keyword)
                  );
                  const stepDuration = recipe.steps?.[activeStep]?.duration;
                  const stepTemp = recipe.steps?.[activeStep]?.temperature;

                  // Priorytet: temperatura z kroku > temperatura z przepisu
                  const displayTemp =
                    stepTemp || (isRelevant ? recipe.ovenTemp : null);

                  const hasCookingInfo =
                    isRelevant && (recipe.cookingMethod || recipe.ovenMode);
                  const hasStepInfo = stepDuration || displayTemp;

                  if (!hasCookingInfo && !hasStepInfo) return null;

                  return (
                    <div className="mb-3 w-full max-w-2xl">
                      {/* Informacje o metodzie gotowania i ustawieniach */}
                      {(hasCookingInfo || displayTemp) && (
                        <div className="mb-2 p-3 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
                          <div className="flex flex-wrap gap-2 justify-center items-center">
                            {recipe.cookingMethod &&
                              cookingMethodLabels[recipe.cookingMethod] &&
                              isRelevant && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-orange-900/40 shadow-sm">
                                  <span className="text-xl">
                                    {
                                      cookingMethodLabels[recipe.cookingMethod]
                                        .emoji
                                    }
                                  </span>
                                  <span className="font-semibold text-sm">
                                    {
                                      cookingMethodLabels[recipe.cookingMethod]
                                        .label
                                    }
                                  </span>
                                </div>
                              )}
                            {displayTemp && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-orange-900/40 shadow-sm">
                                <span className="text-lg">🌡️</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400">
                                  {displayTemp}°C
                                </span>
                              </div>
                            )}
                            {recipe.ovenMode &&
                              ovenModeLabels[recipe.ovenMode] &&
                              isRelevant && (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-orange-900/40 shadow-sm">
                                  <span className="text-lg">⚙️</span>
                                  <span className="font-semibold text-sm">
                                    {ovenModeLabels[recipe.ovenMode]}
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Czas trwania kroku */}
                      {stepDuration && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Badge
                            variant="secondary"
                            className="text-sm px-3 py-1.5 gap-1.5 shadow-sm"
                          >
                            <Timer className="h-4 w-4" />
                            {stepDuration} min
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Zdjęcie kroku - nad tekstem jeśli istnieje */}
                {recipe.steps?.[activeStep]?.image && (
                  <div className="relative w-full max-w-md aspect-video rounded-lg overflow-hidden bg-muted shadow-lg border-2 border-primary/20 mb-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={recipe.steps[activeStep].image!}
                      alt={`Krok ${activeStep + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Główna treść kroku */}
                <div className="w-full max-w-2xl mb-3">
                  <p className="text-base md:text-lg leading-relaxed text-center whitespace-pre-wrap">
                    {recipe.steps?.[activeStep]?.content}
                  </p>
                </div>

                {/* Składniki używane w tym kroku */}
                {(() => {
                  const stepIngredients = getIngredientsForStep(activeStep);
                  return stepIngredients.length > 0 ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-2 max-w-xl shadow-sm mb-2">
                      <h4 className="font-semibold text-xs mb-1.5 flex items-center gap-1.5 text-blue-900 dark:text-blue-100">
                        🥘 Składniki w tym kroku
                      </h4>
                      <ul className="space-y-1">
                        {stepIngredients.map((ingredient) => {
                          const isUsed = usedIngredients.has(ingredient.id);
                          return (
                            <li
                              key={ingredient.id}
                              className={cn(
                                "flex items-center gap-1.5 p-1.5 rounded-md cursor-pointer transition-all",
                                isUsed
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-white dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30"
                              )}
                              onClick={() => toggleIngredient(ingredient.id)}
                            >
                              <div
                                className={cn(
                                  "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center",
                                  isUsed
                                    ? "bg-green-500 border-green-600"
                                    : "border-blue-500 dark:border-blue-400"
                                )}
                              >
                                {isUsed && (
                                  <Check className="h-2.5 w-2.5 text-white" />
                                )}
                              </div>
                              <span
                                className={cn(
                                  "flex-1 text-xs",
                                  isUsed && "line-through text-muted-foreground"
                                )}
                              >
                                {ingredient.name}
                              </span>
                              {ingredient.quantity && (
                                <span
                                  className={cn(
                                    "font-mono text-xs",
                                    isUsed
                                      ? "text-muted-foreground"
                                      : "text-blue-700 dark:text-blue-300"
                                  )}
                                >
                                  {(
                                    Number(ingredient.quantity) * servingMultiplier
                                  ).toFixed(
                                    Number(ingredient.quantity) *
                                      servingMultiplier %
                                      1 ===
                                    0
                                      ? 0
                                      : 1
                                  )}{" "}
                                  {ingredient.unit || ""}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null;
                })()}

                {/* Wskazówka dla kroku */}
                {recipe.steps?.[activeStep]?.tip && (
                  <div className="flex gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 max-w-xl mb-2">
                    <Lightbulb className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                    <div className="text-left">
                      <p className="font-semibold text-xs text-yellow-900 dark:text-yellow-100">
                        Wskazówka
                      </p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        {recipe.steps[activeStep].tip}
                      </p>
                    </div>
                  </div>
                )}

                {/* Wykryty czas z tekstu lub duration */}
                {(() => {
                  const stepDuration = recipe.steps?.[activeStep]?.duration;
                  const extractedTime = extractTimeFromStep(
                    recipe.steps?.[activeStep]?.content || ""
                  );
                  const timerMinutes = stepDuration || extractedTime;

                  return timerMinutes && !mainTimer ? (
                    <Button
                      variant="outline"
                      className="mt-4 gap-2"
                      onClick={() => startMainTimer(timerMinutes)}
                    >
                      <Timer className="h-4 w-4" />
                      Ustaw timer na {timerMinutes} min
                    </Button>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Nawigacja - zawsze widoczna na dole */}
            <div className="sticky bottom-0 left-0 right-0 flex justify-between gap-3 p-3 border-t bg-background/95 backdrop-blur-sm shadow-lg z-10">
              <Button
                variant="outline"
                size="default"
                onClick={() => {
                  setActiveStep(Math.max(0, activeStep - 1));
                  setMainTimer(null);
                  setMainTimerRunning(false);
                }}
                disabled={activeStep === 0}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Poprzedni
              </Button>

              <Button
                variant={
                  completedSteps.includes(activeStep) ? "secondary" : "outline"
                }
                size="default"
                onClick={() => toggleStep(activeStep)}
              >
                {completedSteps.includes(activeStep) ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Ukończone
                  </>
                ) : (
                  "Oznacz"
                )}
              </Button>

              {activeStep === (recipe.steps?.length || 1) - 1 ? (
                <Button
                  size="default"
                  onClick={() => {
                    setActiveStep(0);
                    toast.success("🎉 Gratulacje! Przepis ukończony! Teraz możesz go ocenić.");
                    onClose();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Zakończ gotowanie
                </Button>
              ) : (
                <Button
                  size="default"
                  onClick={() => {
                    if (!completedSteps.includes(activeStep)) {
                      toggleStep(activeStep);
                    }
                    setActiveStep(activeStep + 1);
                    setMainTimer(null);
                    setMainTimerRunning(false);
                  }}
                  className="flex-1"
                >
                  Następny
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

