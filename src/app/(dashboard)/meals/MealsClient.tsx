"use client";

import { useState, useMemo, useEffect } from "react";
import {
  format,
  startOfWeek,
  startOfMonth,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ShoppingCart,
  Search,
  CalendarDays,
  CalendarRange,
  Copy,
  GripVertical,
  UtensilsCrossed,
  Sparkles,
  Activity,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import type { Meal } from "@prisma/client";
import { cn } from "@/lib/utils";
import { SimpleDishManager } from "@/components/meals/SimpleDishManager";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { useSoundEffects } from "@/lib/sound-effects";

type MealWithRecipe = Meal & {
  recipe: {
    id: string;
    name: string;
    prepTime: number | null;
    cookTime: number | null;
    image: string | null;
  } | null;
  simpleDish: {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    fiber: number | null;
  } | null;
};

type RecipeOption = {
  id: string;
  name: string;
  category: string | null;
  prepTime: number | null;
  cookTime: number | null;
  image: string | null;
};

type SimpleDish = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  householdId: string;
  createdAt: Date;
  updatedAt: Date;
};

type MealTemplate = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  mealPattern: Array<{
    mealType: string;
  }>;
};

type NutritionMetrics = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type NutritionSummary = {
  dailyAverage: NutritionMetrics;
  recommendedDaily: NutritionMetrics;
  progress: NutritionMetrics;
  totals: NutritionMetrics;
  insights: string[];
  mealsWithNutrition: number;
  mealsCount: number;
};

interface MealsClientProps {
  initialMeals: MealWithRecipe[];
  recipes: RecipeOption[];
}

const mealTypes = [
  { value: "BREAKFAST", label: "Śniadanie", emoji: "🍳", time: "07:00" },
  { value: "SECOND_BREAKFAST", label: "II Śniadanie", emoji: "🥐", time: "10:00" },
  { value: "LUNCH", label: "Obiad", emoji: "🍲", time: "13:00" },
  { value: "SNACK", label: "Podwieczorek", emoji: "🍎", time: "16:00" },
  { value: "DINNER", label: "Kolacja", emoji: "🥗", time: "19:00" },
];

// Komponent przeciąganego posiłku
function DraggableMeal({
  meal,
  onRemove,
  onCopy,
  onEdit,
}: {
  meal: MealWithRecipe;
  onRemove: () => void;
  onCopy: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meal.id,
    data: { meal },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "h-full w-full group",
        isDragging && "opacity-50"
      )}
    >
      <div className="h-full w-full p-1 flex flex-col justify-between gap-1">
        <div className="min-w-0">
          <div className="text-xs font-medium flex items-start gap-1 min-w-0">
            <div
              {...listeners}
              {...attributes}
              className="h-5 w-5 shrink-0 rounded-sm flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-accent focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              aria-label="Przeciągnij posiłek"
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
            </div>

            {meal.simpleDish && meal.simpleDish.icon && (
              <span className="text-sm shrink-0">{meal.simpleDish.icon}</span>
            )}

            <span className={cn(
              "min-w-0 flex-1 break-words text-sm leading-tight",
              !(meal.recipe?.name || meal.simpleDish?.name || meal.customName) && "text-muted-foreground italic"
            )}>
              {meal.recipe?.name || meal.simpleDish?.name || meal.customName || "Brak nazwy"}
            </span>
          </div>

          {meal.recipe && (meal.recipe.prepTime || meal.recipe.cookTime) && (
            <div className="text-[10px] text-muted-foreground mt-1 pl-6 pr-1">
              {(meal.recipe.prepTime || 0) + (meal.recipe.cookTime || 0)} min
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edytuj"
          >
            <Pencil className="h-3 w-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Usuń"
          >
            <X className="h-3 w-3" />
          </Button>

          <div className="hidden group-hover:flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              title="Kopiuj"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponent slotu do upuszczania
function DroppableSlot({
  id,
  date,
  mealType,
  children,
  isToday: isTodayProp,
  copiedMeal,
  onPaste,
  onAdd,
}: {
  id: string;
  date: Date;
  mealType: string;
  children: React.ReactNode;
  isToday: boolean;
  copiedMeal: MealWithRecipe | null;
  onPaste: () => void;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { date, mealType },
  });

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "min-h-[96px] cursor-pointer hover:shadow-md transition-shadow",
        isTodayProp && "ring-1 ring-primary",
        copiedMeal && "ring-1 ring-dashed ring-primary/50",
        isOver && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => {
        if (copiedMeal) {
          onPaste();
        } else {
          onAdd();
        }
      }}
    >
      <CardContent className="p-2 h-full">
        {children}
      </CardContent>
    </Card>
  );
}

// Komponent przepisu do przeciągnięcia z listy
function DraggableRecipe({ recipe }: { recipe: RecipeOption }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `recipe-${recipe.id}`,
    data: { recipe, type: "recipe" },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded cursor-grab active:cursor-grabbing hover:bg-accent transition-colors border",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{recipe.name}</span>
        </div>
        {recipe.category && (
          <Badge variant="secondary" className="text-xs">
            {recipe.category}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Komponent gotowego dania do przeciągnięcia z listy
function DraggableSimpleDish({ dish }: { dish: SimpleDish }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `simple-dish-${dish.id}`,
    data: { simpleDish: dish, type: "simpleDish" },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-2 rounded cursor-grab active:cursor-grabbing hover:bg-accent transition-colors border",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-base">{dish.icon}</span>
        <span className="font-medium">{dish.name}</span>
      </div>
    </div>
  );
}

export function MealsClient({ initialMeals, recipes }: MealsClientProps) {
  // State
  const [meals, setMeals] = useState(initialMeals);
  const [simpleDishes, setSimpleDishes] = useState<SimpleDish[]>([]);
  const [isSimpleDishManagerOpen, setIsSimpleDishManagerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [currentWeekStart, setCurrentWeekStart] = useState(
    startOfWeek(new Date(), { locale: pl })
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    mealType: string;
  } | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealWithRecipe | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [selectedSimpleDishId, setSelectedSimpleDishId] = useState<string>("");
  const [customMealName, setCustomMealName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Shopping list generation
  const [isShoppingDialogOpen, setIsShoppingDialogOpen] = useState(false);
  const [shoppingDateRange, setShoppingDateRange] = useState<"week" | "month" | "custom">("week");
  const [checkInventory, setCheckInventory] = useState(true);
  const [isGeneratingShopping, setIsGeneratingShopping] = useState(false);

  // Templates
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  // Nutrition Summary
  const [isNutritionDialogOpen, setIsNutritionDialogOpen] = useState(false);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary | null>(null);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);

  // Dni tygodnia
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // Dni miesiąca
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const startDay = startOfWeek(monthStart, { locale: pl });

    const days: Date[] = [];
    let day = startDay;

    // Generuj 6 tygodni (42 dni) dla pełnej siatki kalendarza
    for (let i = 0; i < 42; i++) {
      days.push(day);
      day = addDays(day, 1);
    }

    return days;
  }, [currentMonth]);

  // Filtrowane przepisy
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pobierz posiłek dla konkretnego dnia i typu
  const getMeal = (date: Date, mealType: string) => {
    return meals.find(
      (meal) =>
        isSameDay(new Date(meal.date), date) && meal.mealType === mealType
    );
  };

  // Pobierz wszystkie posiłki dla danego dnia
  const getMealsForDay = (date: Date) => {
    return meals.filter((meal) => isSameDay(new Date(meal.date), date));
  };

  const handleOpenAddDialog = (date: Date, mealType: string) => {
    setSelectedSlot({ date, mealType });
    setEditingMeal(null);
    setSelectedRecipeId("");
    setSelectedSimpleDishId("");
    setCustomMealName("");
    setSearchQuery("");
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (meal: MealWithRecipe) => {
    setSelectedSlot({ date: new Date(meal.date), mealType: meal.mealType });
    setEditingMeal(meal);
    setSelectedRecipeId(meal.recipeId ?? "");
    setSelectedSimpleDishId(meal.simpleDishId ?? "");
    setCustomMealName(meal.customName ?? "");
    setSearchQuery(meal.recipe?.name ?? meal.simpleDish?.name ?? meal.customName ?? "");
    setIsAddDialogOpen(true);
  };

  const toDateInputValue = (date: Date) => format(date, "yyyy-MM-dd");

  const fromDateInputValue = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    // Ustawiamy południe, żeby uniknąć przesunięć dnia przy strefach czasowych.
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  // Stan kopiowania posiłku
  const [copiedMeal, setCopiedMeal] = useState<MealWithRecipe | null>(null);

  // Stan dla drag & drop
  const [activeDragItem, setActiveDragItem] = useState<MealWithRecipe | RecipeOption | SimpleDish | null>(null);
  const [activeDragType, setActiveDragType] = useState<"meal" | "recipe" | "simpleDish" | null>(null);

  // Sensory dla dnd-kit
  // Ładuj gotowe dania
  useEffect(() => {
    fetch('/api/simple-dishes')
      .then(res => res.json())
      .then(data => setSimpleDishes(data))
      .catch(err => console.error('Error loading simple dishes:', err));
  }, []);

  // Ładuj szablony po otwarciu dialogu
  useEffect(() => {
    if (isTemplatesDialogOpen && templates.length === 0) {
      setIsLoadingTemplates(true);
      fetch('/api/meals/templates')
        .then(res => res.json())
        .then(data => setTemplates(data.templates || []))
        .catch(err => {
          console.error('Error loading templates:', err);
          toast.error('Nie udało się załadować szablonów');
        })
        .finally(() => setIsLoadingTemplates(false));
    }
  }, [isTemplatesDialogOpen, templates.length]);

  // Ładuj nutrition summary po otwarciu dialogu
  useEffect(() => {
    if (isNutritionDialogOpen) {
      setIsLoadingNutrition(true);
      const weekStart = viewMode === "week" ? currentWeekStart : startOfWeek(currentMonth, { locale: pl });

      fetch(`/api/meals/nutrition-summary?weekStart=${weekStart.toISOString()}`)
        .then(res => res.json())
        .then(data => setNutritionSummary(data))
        .catch(err => {
          console.error('Error loading nutrition summary:', err);
          toast.error('Nie udało się załadować podsumowania odżywczego');
        })
        .finally(() => setIsLoadingNutrition(false));
    }
  }, [isNutritionDialogOpen, viewMode, currentWeekStart, currentMonth]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "recipe") {
      setActiveDragItem(active.data.current.recipe);
      setActiveDragType("recipe");
    } else if (active.data.current?.type === "simpleDish") {
      setActiveDragItem(active.data.current.simpleDish);
      setActiveDragType("simpleDish");
    } else if (active.data.current?.meal) {
      setActiveDragItem(active.data.current.meal);
      setActiveDragType("meal");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDragItem(null);
    setActiveDragType(null);

    if (!over) return;

    const overData = over.data.current as { date: Date; mealType: string } | undefined;
    if (!overData) return;

    // Przeciągnięcie przepisu z listy
    if (active.data.current?.type === "recipe") {
      const recipe = active.data.current.recipe as RecipeOption;
      try {
        const response = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: overData.date.toISOString(),
            mealType: overData.mealType,
            recipeId: recipe.id,
          }),
        });

        if (response.ok) {
          const newMeal = await response.json();
          setMeals([...meals.filter(
            (m) => !(isSameDay(new Date(m.date), overData.date) && m.mealType === overData.mealType)
          ), newMeal]);
          toast.success("Przepis dodany do jadłospisu");

          // 🎮 Gamification: Reward XP for planning meal
          showFlyingXP(10);
          playSound('xp-earn');
        }
      } catch {
        toast.error("Nie udało się dodać przepisu");
      }
      return;
    }

    // Przeciągnięcie gotowego dania z listy
    if (active.data.current?.type === "simpleDish") {
      const simpleDish = active.data.current.simpleDish as SimpleDish;
      try {
        const response = await fetch("/api/meals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: overData.date.toISOString(),
            mealType: overData.mealType,
            simpleDishId: simpleDish.id,
          }),
        });

        if (response.ok) {
          const newMeal = await response.json();
          setMeals([...meals.filter(
            (m) => !(isSameDay(new Date(m.date), overData.date) && m.mealType === overData.mealType)
          ), newMeal]);
          toast.success("Gotowe danie dodane do jadłospisu");

          // 🎮 Gamification: Reward XP for planning meal
          showFlyingXP(10);
          playSound('xp-earn');
        }
      } catch {
        toast.error("Nie udało się dodać gotowego dania");
      }
      return;
    }

    // Przeciągnięcie istniejącego posiłku
    if (active.data.current?.meal) {
      const meal = active.data.current.meal as MealWithRecipe;

      // Sprawdź czy to nie ten sam slot
      if (isSameDay(new Date(meal.date), overData.date) && meal.mealType === overData.mealType) {
        return;
      }

      try {
        const response = await fetch(`/api/meals/${meal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: overData.date.toISOString(),
            mealType: overData.mealType,
            recipeId: meal.recipeId,
            simpleDishId: meal.simpleDishId,
            customName: meal.customName,
          }),
        });

        if (response.ok) {
          const updatedMeal = await response.json();
          setMeals(meals.map((m) => m.id === meal.id ? updatedMeal : m));
          toast.success("Posiłek przeniesiony");
        }
      } catch {
        toast.error("Nie udało się przenieść posiłku");
      }
    }
  };

  const handleCopyMeal = (meal: MealWithRecipe) => {
    setCopiedMeal(meal);
    toast.success("Posiłek skopiowany. Kliknij na pustą komórkę, aby wkleić.");
  };

  const handlePasteMeal = async (date: Date, mealType: string) => {
    if (!copiedMeal) return;

    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          mealType: mealType,
          recipeId: copiedMeal.recipeId || null,
          simpleDishId: copiedMeal.simpleDishId || null,
          customName: copiedMeal.customName || null,
        }),
      });

      if (response.ok) {
        const newMeal = await response.json();
        setMeals([...meals.filter(
          (m) => !(isSameDay(new Date(m.date), date) && m.mealType === mealType)
        ), newMeal]);
        toast.success("Posiłek wklejony");
      }
    } catch {
      toast.error("Nie udało się wkleić posiłku");
    }
  };

  const handleAddMeal = async () => {
    if (!selectedSlot) return;
    if (!selectedRecipeId && !selectedSimpleDishId && !customMealName.trim()) {
      toast.error("Wybierz przepis, gotowe danie lub wpisz własną nazwę");
      return;
    }

    try {
      const isEditMode = !!editingMeal;
      const endpoint = isEditMode ? `/api/meals/${editingMeal.id}` : "/api/meals";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedSlot.date.toISOString(),
          mealType: selectedSlot.mealType,
          recipeId: selectedRecipeId || null,
          simpleDishId: selectedSimpleDishId || null,
          customName: customMealName || null,
        }),
      });

      if (response.ok) {
        const savedMeal = await response.json();

        if (isEditMode) {
          setMeals(meals.map((m) => (m.id === savedMeal.id ? savedMeal : m)));
        } else {
          setMeals([
            ...meals.filter(
              (m) =>
                !(
                  isSameDay(new Date(m.date), selectedSlot.date) &&
                  m.mealType === selectedSlot.mealType
                )
            ),
            savedMeal,
          ]);
        }

        setIsAddDialogOpen(false);
        setEditingMeal(null);
        toast.success(isEditMode ? "Posiłek został zaktualizowany" : "Posiłek został dodany");

        if (!isEditMode) {
          // XP tylko za dodanie nowego planu
          showFlyingXP(10);
          playSound('xp-earn');
        }
      }
    } catch {
      toast.error(editingMeal ? "Nie udało się zaktualizować posiłku" : "Nie udało się dodać posiłku");
    }
  };

  const handleRemoveMeal = async (mealId: string) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMeals(meals.filter((m) => m.id !== mealId));
        toast.success("Posiłek został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć posiłku");
    }
  };

  const handleApplyTemplate = async (templateId: string, overwrite: boolean = false) => {
    setIsApplyingTemplate(true);
    try {
      const weekStart = viewMode === "week" ? currentWeekStart : startOfWeek(currentMonth, { locale: pl });

      const response = await fetch('/api/meals/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          weekStart: weekStart.toISOString(),
          overwrite,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Aktualizuj lokalne meals
        if (overwrite) {
          // Usuń stare meals z tego tygodnia
          const weekEnd = addDays(weekStart, 7);
          const filteredMeals = meals.filter(m => {
            const mealDate = new Date(m.date);
            return mealDate < weekStart || mealDate >= weekEnd;
          });
          setMeals([...filteredMeals, ...data.meals]);
        } else {
          setMeals([...meals, ...data.meals]);
        }

        setIsTemplatesDialogOpen(false);
        toast.success(data.message || `Dodano ${data.mealsCreated} posiłków`);
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.error || `Nie udało się zastosować szablonu (${response.status})`);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Wystąpił błąd podczas aplikowania szablonu');
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const handleGenerateShoppingList = async () => {
    setIsGeneratingShopping(true);

    // Ustal zakres dat
    let startDate: Date;
    let endDate: Date;

    if (shoppingDateRange === "week") {
      startDate = weekDays[0];
      endDate = weekDays[6];
    } else if (shoppingDateRange === "month") {
      startDate = startOfMonth(currentMonth);
      endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    } else {
      // custom - póki co używamy tygodnia
      startDate = weekDays[0];
      endDate = weekDays[6];
    }

    try {
      const response = await fetch("/api/meals/generate-shopping-from-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          checkInventory,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.added === 0 && data.updated === 0) {
          toast.info(data.message || "Wszystkie składniki są już na liście lub w inwentarzu");
        } else {
          const parts = [];
          if (data.added > 0) parts.push(`${data.added} dodanych`);
          if (data.updated > 0) parts.push(`${data.updated} zaktualizowanych`);
          if (data.skipped > 0) parts.push(`${data.skipped} pominiętych`);

          toast.success(`Lista zakupów: ${parts.join(", ")}`);
        }

        setIsShoppingDialogOpen(false);
      } else {
        toast.error("Nie udało się wygenerować listy");
      }
    } catch (error) {
      console.error("Error generating shopping list:", error);
      toast.error("Nie udało się wygenerować listy");
    } finally {
      setIsGeneratingShopping(false);
    }
  };

  // Gamification hooks
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();
  const { playSound } = useSoundEffects();

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadłospis</h1>
          <p className="text-muted-foreground">
            Planuj posiłki na cały {viewMode === "week" ? "tydzień" : "miesiąc"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {copiedMeal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCopiedMeal(null)}
            >
              <X className="h-4 w-4 mr-1" />
              Anuluj kopiowanie
            </Button>
          )}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("week")}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Tydzień
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setViewMode("month")}
            >
              <CalendarRange className="h-4 w-4 mr-1" />
              Miesiąc
            </Button>
          </div>
          <Button variant="outline" onClick={() => setIsNutritionDialogOpen(true)}>
            <Activity className="mr-2 h-4 w-4" />
            Odżywianie
          </Button>
          <Button variant="outline" onClick={() => setIsTemplatesDialogOpen(true)}>
            <Sparkles className="mr-2 h-4 w-4" />
            Szablony
          </Button>
          <Button variant="outline" onClick={() => setIsSimpleDishManagerOpen(true)}>
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Gotowe dania
          </Button>
          <Button variant="outline" onClick={() => setIsShoppingDialogOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Lista zakupów
          </Button>
        </div>
      </div>

      {/* Nawigacja */}
      {viewMode === "week" ? (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className="font-semibold">
              {format(weekDays[0], "d MMM", { locale: pl })} - {format(weekDays[6], "d MMM yyyy", { locale: pl })}
            </h2>
            <Button
              variant="link"
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { locale: pl }))}
            >
              Bieżący tydzień
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h2 className="font-semibold">
              {format(currentMonth, "LLLL yyyy", { locale: pl })}
            </h2>
            <Button
              variant="link"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Bieżący miesiąc
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Widok tygodniowy */}
      {viewMode === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Nagłówki dni */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              <div className="p-2" /> {/* Pusta komórka */}
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-2 text-center rounded-lg",
                    isToday(day) && "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="text-xs uppercase">
                    {format(day, "EEE", { locale: pl })}
                  </div>
                  <div className="text-lg font-bold">{format(day, "d")}</div>
                </div>
              ))}
            </div>

            {/* Wiersze posiłków */}
            {mealTypes.map((mealType) => (
              <div key={mealType.value} className="grid grid-cols-8 gap-2 mb-2">
                {/* Etykieta typu posiłku */}
                <div className="p-2 flex items-center gap-2">
                  <span className="text-xl">{mealType.emoji}</span>
                  <div>
                    <div className="text-sm font-medium">{mealType.label}</div>
                    <div className="text-xs text-muted-foreground">{mealType.time}</div>
                  </div>
                </div>

                {/* Komórki dla każdego dnia */}
                {weekDays.map((day, idx) => {
                  const meal = getMeal(day, mealType.value);
                  const slotId = `${format(day, "yyyy-MM-dd")}-${mealType.value}`;

                  return (
                    <DroppableSlot
                      key={idx}
                      id={slotId}
                      date={day}
                      mealType={mealType.value}
                      isToday={isToday(day)}
                      copiedMeal={!meal ? copiedMeal : null}
                      onPaste={() => handlePasteMeal(day, mealType.value)}
                      onAdd={() => handleOpenAddDialog(day, mealType.value)}
                    >
                      {meal ? (
                        <DraggableMeal
                          meal={meal}
                          onRemove={() => handleRemoveMeal(meal.id)}
                          onCopy={() => handleCopyMeal(meal)}
                          onEdit={() => handleOpenEditDialog(meal)}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground opacity-0 hover:opacity-100 transition-opacity">
                          {copiedMeal ? (
                            <span className="text-xs">Kliknij aby wkleić</span>
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </DroppableSlot>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Widok miesięczny */}
      {viewMode === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Nagłówki dni tygodnia */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Siatka dni */}
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day, idx) => {
                const dayMeals = getMealsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <Card
                    key={idx}
                    className={cn(
                      "min-h-[100px] cursor-pointer hover:shadow-md transition-shadow",
                      !isCurrentMonth && "opacity-40",
                      isToday(day) && "ring-2 ring-primary"
                    )}
                    onClick={() => handleOpenAddDialog(day, "LUNCH")}
                  >
                    <CardContent className="p-2">
                      <div className={cn(
                        "text-sm font-medium mb-1",
                        isToday(day) && "text-primary"
                      )}>
                        {format(day, "d")}
                      </div>
                      <div className="space-y-0.5">
                        {dayMeals.slice(0, 3).map((meal) => {
                          const mealInfo = mealTypes.find(m => m.value === meal.mealType);
                          return (
                            <div
                              key={meal.id}
                              className="flex items-center gap-1 text-[10px] bg-muted rounded px-1 py-0.5 group"
                            >
                              <span>{mealInfo?.emoji}</span>
                              {meal.simpleDish?.icon && (
                                <span className="text-sm">{meal.simpleDish.icon}</span>
                              )}
                              <span className="truncate flex-1">
                                {meal.recipe?.name || meal.simpleDish?.name || meal.customName}
                              </span>
                              <div className="ml-auto flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditDialog(meal);
                                  }}
                                  title="Edytuj"
                                >
                                  <Pencil className="h-2 w-2" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMeal(meal.id);
                                  }}
                                >
                                  <X className="h-2 w-2" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        {dayMeals.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayMeals.length - 3} więcej
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Dialog dodawania posiłku */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) setEditingMeal(null);
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingMeal ? "Edytuj posiłek" : "Dodaj posiłek"}
              {selectedSlot && (
                <span className="text-muted-foreground font-normal ml-2">
                  {format(selectedSlot.date, "EEEE, d MMMM", { locale: pl })} - {" "}
                  {mealTypes.find((m) => m.value === selectedSlot.mealType)?.label}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Wybór dnia */}
            {selectedSlot && (
              <div className="space-y-2">
                <Label htmlFor="meal-date">Dzień</Label>
                <Input
                  id="meal-date"
                  type="date"
                  value={toDateInputValue(selectedSlot.date)}
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    if (!nextValue) return;

                    setSelectedSlot((prev) =>
                      prev
                        ? {
                            ...prev,
                            date: fromDateInputValue(nextValue),
                          }
                        : prev
                    );
                  }}
                />
              </div>
            )}

            {/* Wybór pory dnia */}
            {selectedSlot && (
              <div className="space-y-2">
                <Label>Pora dnia</Label>
                <RadioGroup
                  value={selectedSlot.mealType}
                  onValueChange={(value) => {
                    setSelectedSlot((prev) =>
                      prev
                        ? {
                            ...prev,
                            mealType: value,
                          }
                        : prev
                    );
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {mealTypes.map((mealType) => (
                    <label
                      key={mealType.value}
                      htmlFor={`meal-type-${mealType.value}`}
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2 cursor-pointer transition-colors",
                        selectedSlot.mealType === mealType.value && "border-primary bg-primary/5"
                      )}
                    >
                      <RadioGroupItem id={`meal-type-${mealType.value}`} value={mealType.value} />
                      <span className="text-base">{mealType.emoji}</span>
                      <span className="text-sm font-medium">{mealType.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{mealType.time}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Wyszukiwarka przepisów */}
            <div className="space-y-2">
              <Label>Wybierz przepis</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj przepisów..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredRecipes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {recipes.length === 0 ? "Brak przepisów. Dodaj przepisy w zakładce Przepisy." : "Nie znaleziono przepisów"}
                  </div>
                ) : (
                  filteredRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className={cn(
                        "p-2 rounded cursor-pointer hover:bg-accent transition-colors",
                        selectedRecipeId === recipe.id && "bg-accent"
                      )}
                      onClick={() => {
                        setSelectedRecipeId(recipe.id);
                        setSelectedSimpleDishId("");
                        setCustomMealName("");
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{recipe.name}</span>
                        {recipe.category && (
                          <Badge variant="secondary" className="text-xs">
                            {recipe.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">lub</span>
              </div>
            </div>

            {/* Gotowe dania */}
            {simpleDishes.length > 0 && (
              <div className="space-y-2">
                <Label>Lub wybierz gotowe danie</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-1 border rounded-lg p-2">
                  {simpleDishes.map((dish) => (
                    <div
                      key={dish.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors",
                        selectedSimpleDishId === dish.id && "bg-accent"
                      )}
                      onClick={() => {
                        setSelectedSimpleDishId(dish.id);
                        setSelectedRecipeId("");
                        setCustomMealName("");
                      }}
                    >
                      <span className="text-xl">{dish.icon}</span>
                      <div className="flex-1">
                        <span className="font-medium">{dish.name}</span>
                        {dish.description && (
                          <p className="text-xs text-muted-foreground">{dish.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Własna nazwa */}
            <div className="space-y-2">
              <Label>Lub wpisz własną nazwę</Label>
              <Input
                placeholder="Np. Kanapki z szynką"
                value={customMealName}
                onChange={(e) => {
                  setCustomMealName(e.target.value);
                  setSelectedRecipeId("");
                  setSelectedSimpleDishId("");
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              setEditingMeal(null);
            }}>
              Anuluj
            </Button>
            <Button onClick={handleAddMeal}>{editingMeal ? "Zapisz zmiany" : "Dodaj"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel boczny z przepisami do przeciągania */}
      {viewMode === "week" && (
        <>
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GripVertical className="h-4 w-4" />
                Przeciągnij przepis do jadłospisu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj przepisów..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[200px] overflow-y-auto">
                {filteredRecipes.slice(0, 12).map((recipe) => (
                  <DraggableRecipe key={recipe.id} recipe={recipe} />
                ))}
                {filteredRecipes.length === 0 && (
                  <div className="col-span-full text-center py-4 text-muted-foreground text-sm">
                    {recipes.length === 0 ? "Brak przepisów" : "Nie znaleziono"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Panel z gotowymi daniami */}
          {simpleDishes.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UtensilsCrossed className="h-4 w-4" />
                    Przeciągnij gotowe danie do jadłospisu
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSimpleDishManagerOpen(true)}
                  >
                    Zarządzaj
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[150px] overflow-y-auto">
                  {simpleDishes.map((dish) => (
                    <DraggableSimpleDish key={dish.id} dish={dish} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* DragOverlay - podgląd przeciąganego elementu */}
      <DragOverlay>
        {activeDragItem && activeDragType === "meal" && (
          <Card className="w-[150px] shadow-lg">
            <CardContent className="p-2">
              <div className="text-xs font-medium flex items-center gap-1">
                {(activeDragItem as MealWithRecipe).simpleDish?.icon && (
                  <span className="text-sm">{(activeDragItem as MealWithRecipe).simpleDish?.icon}</span>
                )}
                {(activeDragItem as MealWithRecipe).recipe?.name ||
                 (activeDragItem as MealWithRecipe).simpleDish?.name ||
                 (activeDragItem as MealWithRecipe).customName}
              </div>
            </CardContent>
          </Card>
        )}
        {activeDragItem && activeDragType === "recipe" && (
          <Card className="w-[200px] shadow-lg">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{(activeDragItem as RecipeOption).name}</span>
              </div>
            </CardContent>
          </Card>
        )}
        {activeDragItem && activeDragType === "simpleDish" && (
          <Card className="w-[200px] shadow-lg">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-base">{(activeDragItem as SimpleDish).icon}</span>
                <span className="font-medium text-sm">{(activeDragItem as SimpleDish).name}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </DragOverlay>

      {/* Dialog generowania listy zakupów */}
      <Dialog open={isShoppingDialogOpen} onOpenChange={setIsShoppingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Generuj listę zakupów
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Zakres dat</Label>
              <RadioGroup value={shoppingDateRange} onValueChange={(v) => setShoppingDateRange(v as typeof shoppingDateRange)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="week" id="week" />
                  <Label htmlFor="week" className="font-normal cursor-pointer">
                    Obecny tydzień ({format(weekDays[0], "d MMM", { locale: pl })} - {format(weekDays[6], "d MMM", { locale: pl })})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month" id="month" />
                  <Label htmlFor="month" className="font-normal cursor-pointer">
                    Obecny miesiąc ({format(currentMonth, "LLLL yyyy", { locale: pl })})
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="check-inventory" className="flex flex-col space-y-1">
                <span>Sprawdź inwentarz</span>
                <span className="font-normal text-sm text-muted-foreground">
                  Nie dodawaj produktów które już masz
                </span>
              </Label>
              <Switch
                id="check-inventory"
                checked={checkInventory}
                onCheckedChange={setCheckInventory}
              />
            </div>

            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Składniki z przepisów zostaną dodane do listy zakupów.
                {checkInventory && " Produkty dostępne w inwentarzu zostaną pominięte."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShoppingDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleGenerateShoppingList} disabled={isGeneratingShopping}>
              {isGeneratingShopping ? "Generowanie..." : "Generuj"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Podsumowanie odżywcze */}
      <Dialog open={isNutritionDialogOpen} onOpenChange={setIsNutritionDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Podsumowanie odżywcze tygodnia
            </DialogTitle>
          </DialogHeader>

          {isLoadingNutrition ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : nutritionSummary ? (
            <div className="space-y-6 py-4">
              {/* Średnie dzienne */}
              <div>
                <h3 className="font-semibold mb-3">Średnia dzienna</h3>
                <div className="space-y-3">
                  {/* Kalorie */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Kalorie</span>
                      <span className="font-medium">
                        {nutritionSummary.dailyAverage.calories} / {nutritionSummary.recommendedDaily.calories} kcal
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          nutritionSummary.progress.calories > 110 ? "bg-red-500" :
                          nutritionSummary.progress.calories > 90 ? "bg-green-500" :
                          "bg-yellow-500"
                        )}
                        style={{ width: `${Math.min(nutritionSummary.progress.calories, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nutritionSummary.progress.calories}% zalecanej wartości
                    </div>
                  </div>

                  {/* Białko */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Białko</span>
                      <span className="font-medium">
                        {nutritionSummary.dailyAverage.protein} / {nutritionSummary.recommendedDaily.protein} g
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full bg-blue-500 transition-all"
                        )}
                        style={{ width: `${Math.min(nutritionSummary.progress.protein, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nutritionSummary.progress.protein}% zalecanej wartości
                    </div>
                  </div>

                  {/* Węglowodany */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Węglowodany</span>
                      <span className="font-medium">
                        {nutritionSummary.dailyAverage.carbs} / {nutritionSummary.recommendedDaily.carbs} g
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{ width: `${Math.min(nutritionSummary.progress.carbs, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nutritionSummary.progress.carbs}% zalecanej wartości
                    </div>
                  </div>

                  {/* Tłuszcze */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tłuszcze</span>
                      <span className="font-medium">
                        {nutritionSummary.dailyAverage.fat} / {nutritionSummary.recommendedDaily.fat} g
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${Math.min(nutritionSummary.progress.fat, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nutritionSummary.progress.fat}% zalecanej wartości
                    </div>
                  </div>

                  {/* Błonnik */}
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Błonnik</span>
                      <span className="font-medium">
                        {nutritionSummary.dailyAverage.fiber} / {nutritionSummary.recommendedDaily.fiber} g
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${Math.min(nutritionSummary.progress.fiber, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {nutritionSummary.progress.fiber}% zalecanej wartości
                    </div>
                  </div>
                </div>
              </div>

              {/* Insights */}
              {nutritionSummary.insights && nutritionSummary.insights.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">💡 Rekomendacje</h3>
                  <div className="space-y-2">
                    {nutritionSummary.insights.map((insight: string, idx: number) => (
                      <div key={idx} className="text-sm bg-muted p-3 rounded-lg">
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals tygodniowe */}
              <div>
                <h3 className="font-semibold mb-2">Sumy tygodniowe</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Kalorie</div>
                    <div className="text-lg font-bold">{nutritionSummary.totals.calories}</div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Białko</div>
                    <div className="text-lg font-bold">{nutritionSummary.totals.protein}</div>
                    <div className="text-xs text-muted-foreground">g</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Węgle</div>
                    <div className="text-lg font-bold">{nutritionSummary.totals.carbs}</div>
                    <div className="text-xs text-muted-foreground">g</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Tłuszcze</div>
                    <div className="text-lg font-bold">{nutritionSummary.totals.fat}</div>
                    <div className="text-xs text-muted-foreground">g</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-xs text-muted-foreground">Błonnik</div>
                    <div className="text-lg font-bold">{nutritionSummary.totals.fiber}</div>
                    <div className="text-xs text-muted-foreground">g</div>
                  </Card>
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                📊 Podsumowanie oparte na {nutritionSummary.mealsWithNutrition} z {nutritionSummary.mealsCount} posiłków z danymi odżywczymi.
                {nutritionSummary.mealsWithNutrition === 0 && (
                  <div className="mt-2 text-yellow-600 dark:text-yellow-400">
                    ⚠️ Dodaj wartości odżywcze do swoich przepisów aby zobaczyć dokładne podsumowanie!
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Brak danych do wyświetlenia
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNutritionDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog z szablonami */}
      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Szablony planów posiłków
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {isLoadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{template.icon}</div>
                          <div className="space-y-1">
                            <CardTitle className="text-base">{template.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {template.description}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {template.mealPattern.length} posiłków
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleApplyTemplate(template.id, false)}
                            disabled={isApplyingTemplate}
                          >
                            Dodaj
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Czy na pewno chcesz zastąpić obecne posiłki?')) {
                                handleApplyTemplate(template.id, true);
                              }
                            }}
                            disabled={isApplyingTemplate}
                          >
                            Zastąp
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(new Set(template.mealPattern.map((p: { mealType: string }) => {
                            const mealType = mealTypes.find(m => m.value === p.mealType);
                            return mealType?.emoji || '';
                          }))).filter(Boolean).map((emoji, i) => (
                            <span key={i}>{emoji as string}</span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
              <p className="text-muted-foreground">
                <strong>Dodaj:</strong> Doda posiłki z szablonu do obecnego planu
              </p>
              <p className="text-muted-foreground">
                <strong>Zastąp:</strong> Usuwa obecne posiłki i zastępuje je szablonem
              </p>
              <p className="text-muted-foreground text-xs">
                💡 Szablony dobierają przepisy z Twojej kolekcji na podstawie kategorii i tagów
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplatesDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manager gotowych dań */}
      <SimpleDishManager
        open={isSimpleDishManagerOpen}
        onOpenChange={setIsSimpleDishManagerOpen}
        onDishesUpdated={() => {
          // Odśwież listę gotowych dań
          fetch('/api/simple-dishes')
            .then(res => res.json())
            .then(data => setSimpleDishes(data))
            .catch(err => console.error('Error reloading dishes:', err));
        }}
      />

      {/* Flying XP Animation */}
      <FlyingXPComponent />
    </div>
    </DndContext>
  );
}

