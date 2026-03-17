"use client";

import { useState, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, Plus, Trash2, Info, Clock, Flame,
  ChefHat, Apple, Heart, Wheat, Milk, AlertTriangle,
  Image as ImageIcon, Timer, Thermometer, Lightbulb
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ImageUpload } from "@/components/inventory/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const recipeFormSchema = z.object({
  // Podstawowe
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: z.string().optional(),
  image: z.string().optional().nullable(),
  category: z.string().optional(),
  cuisine: z.string().optional(),

  // Czasy
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  restTime: z.number().optional(),

  // Parametry gotowania
  cookingMethod: z.enum(["BAKING", "FRYING", "BOILING", "STEAMING", "GRILLING", "ROASTING", "STEWING", "SAUTEING", "AIR_FRYING", "MIXING", "OTHER"]).optional(),
  ovenTemp: z.number().optional(),
  ovenMode: z.enum(["CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"]).optional(),

  servings: z.number().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  tags: z.string().optional(),

  // Wartości odżywcze (na porcję)
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),

  // Dodatkowe
  tips: z.string().optional(),
  source: z.string().optional(),
  videoUrl: z.string().optional(),

  // Diety i alergeny
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  allergens: z.string().optional(),

  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Nazwa składnika jest wymagana"),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      optional: z.boolean().optional(),
    })
  ),
  steps: z.array(
    z.object({
      content: z.string().min(1, "Treść kroku jest wymagana"),
      duration: z.number().optional(),
      image: z.string().optional().nullable(),
      temperature: z.number().optional(),
      tip: z.string().optional(),
      isOptional: z.boolean().optional(),
    })
  ),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

const cookingMethods = [
  { value: "BAKING", label: "Pieczenie" },
  { value: "FRYING", label: "Smażenie" },
  { value: "BOILING", label: "Gotowanie" },
  { value: "STEAMING", label: "Gotowanie na parze" },
  { value: "GRILLING", label: "Grillowanie" },
  { value: "ROASTING", label: "Pieczenie (mięso)" },
  { value: "STEWING", label: "Duszenie" },
  { value: "SAUTEING", label: "Podsmażanie" },
  { value: "AIR_FRYING", label: "Air fryer" },
  { value: "MIXING", label: "Mieszanie" },
  { value: "OTHER", label: "Inne" },
];

const ovenModes = [
  { value: "CONVENTIONAL", label: "Góra-dół" },
  { value: "FAN_ASSISTED", label: "Termoobieg" },
  { value: "GRILL", label: "Grill" },
  { value: "PIZZA", label: "Tryb pizza" },
];

const cuisines = [
  { value: "polish", label: "Polska" },
  { value: "italian", label: "Włoska" },
  { value: "asian", label: "Azjatycka" },
  { value: "mexican", label: "Meksykańska" },
  { value: "french", label: "Francuska" },
  { value: "greek", label: "Grecka" },
  { value: "indian", label: "Indyjska" },
  { value: "other", label: "Inna" },
];

const categories = [
  { value: "breakfast", label: "Śniadanie" },
  { value: "lunch", label: "Obiad" },
  { value: "dinner", label: "Kolacja" },
  { value: "dessert", label: "Deser" },
  { value: "snack", label: "Przekąska" },
  { value: "drink", label: "Napój" },
  { value: "other", label: "Inne" },
];

const units = [
  "g", "kg", "ml", "l", "szt", "łyżka", "łyżeczka", "szklanka",
  "pęczek", "ząbek", "plaster", "garść", "szczypta"
];

// Type for Recipe from Prisma
type RecipeWithDetails = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  category?: string | null;
  cuisine?: string | null;
  prepTime?: number | null;
  cookTime?: number | null;
  restTime?: number | null;
  cookingMethod?: string | null;
  ovenTemp?: number | null;
  ovenMode?: string | null;
  servings: number;
  difficulty: string;
  tags?: string[] | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  fiber?: number | null;
  tips?: string | null;
  source?: string | null;
  videoUrl?: string | null;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  allergens?: string[] | null;
  ingredients?: Array<{
    name: string;
    quantity?: number | null;
    unit?: string | null;
    optional?: boolean;
  }>;
  steps?: Array<{
    content: string;
    duration?: number | null;
    image?: string | null;
    temperature?: number | null;
    tip?: string | null;
    isOptional?: boolean;
  }>;
};

interface EnhancedRecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: RecipeWithDetails | null;
  onSuccess: () => void;
}

export function EnhancedRecipeFormDialog({
  open,
  onOpenChange,
  recipe,
  onSuccess,
}: EnhancedRecipeFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [existingIngredients, setExistingIngredients] = useState<Array<{name: string; units: string[]}>>([]);
  const isEditing = !!recipe;

  // Załaduj istniejące składniki
  useEffect(() => {
    if (open) {
      fetch("/api/ingredients")
        .then(res => res.json())
        .then(data => setExistingIngredients(data))
        .catch(err => console.error("Error loading ingredients:", err));
    }
  }, [open]);

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: recipe?.name ?? "",
      description: recipe?.description ?? "",
      image: recipe?.image ?? null,
      category: recipe?.category ?? "other",
      cuisine: recipe?.cuisine ?? "",
      prepTime: recipe?.prepTime ?? undefined,
      cookTime: recipe?.cookTime ?? undefined,
      restTime: recipe?.restTime ?? undefined,
      cookingMethod: (recipe?.cookingMethod as RecipeFormData["cookingMethod"]) ?? undefined,
      ovenTemp: recipe?.ovenTemp ?? undefined,
      ovenMode: (recipe?.ovenMode as RecipeFormData["ovenMode"]) ?? undefined,
      servings: recipe?.servings ?? 4,
      difficulty: (recipe?.difficulty as RecipeFormData["difficulty"]) ?? "MEDIUM",
      tags: Array.isArray(recipe?.tags) ? recipe.tags.join(", ") : "",
      calories: recipe?.calories ?? undefined,
      protein: recipe?.protein ?? undefined,
      carbs: recipe?.carbs ?? undefined,
      fat: recipe?.fat ?? undefined,
      fiber: recipe?.fiber ?? undefined,
      tips: recipe?.tips ?? "",
      source: recipe?.source ?? "",
      videoUrl: recipe?.videoUrl ?? "",
      isVegetarian: recipe?.isVegetarian ?? false,
      isVegan: recipe?.isVegan ?? false,
      isGlutenFree: recipe?.isGlutenFree ?? false,
      isDairyFree: recipe?.isDairyFree ?? false,
      allergens: Array.isArray(recipe?.allergens) ? recipe.allergens.join(", ") : "",
      ingredients: Array.isArray(recipe?.ingredients) && recipe.ingredients.length > 0
        ? recipe.ingredients.map((i) => ({
            name: i.name ?? "",
            quantity: i.quantity ?? undefined,
            unit: i.unit ?? "",
            optional: i.optional ?? false,
          }))
        : [{ name: "", quantity: undefined, unit: "", optional: false }],
      steps: Array.isArray(recipe?.steps) && recipe.steps.length > 0
        ? recipe.steps.map((s) => ({
            content: s.content ?? "",
            duration: s.duration ?? undefined,
            image: s.image ?? null,
            temperature: s.temperature ?? undefined,
            tip: s.tip ?? "",
            isOptional: s.isOptional ?? false,
          }))
        : [{ content: "", duration: undefined, image: null, temperature: undefined, tip: "", isOptional: false }],
    },
  });

  const {
    fields: ingredientFields,
    append: appendIngredient,
    remove: removeIngredient,
  } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const {
    fields: stepFields,
    append: appendStep,
    remove: removeStep,
  } = useFieldArray({
    control: form.control,
    name: "steps",
  });

  const onSubmit = async (data: RecipeFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/recipes/${recipe.id}` : "/api/recipes";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        ...data,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        allergens: data.allergens ? data.allergens.split(",").map((a) => a.trim()).filter(Boolean) : [],
        totalTime: (data.prepTime || 0) + (data.cookTime || 0) + (data.restTime || 0) || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(isEditing ? "Przepis zaktualizowany" : "Przepis dodany");
        form.reset();
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Nie udało się zapisać przepisu");
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj przepis" : "Nowy przepis"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="basic">
                  <Info className="h-4 w-4 mr-2" />
                  Podstawowe
                </TabsTrigger>
                <TabsTrigger value="cooking">
                  <ChefHat className="h-4 w-4 mr-2" />
                  Gotowanie
                </TabsTrigger>
                <TabsTrigger value="ingredients">
                  <Apple className="h-4 w-4 mr-2" />
                  Składniki
                </TabsTrigger>
                <TabsTrigger value="steps">
                  <Clock className="h-4 w-4 mr-2" />
                  Kroki
                </TabsTrigger>
                <TabsTrigger value="nutrition">
                  <Heart className="h-4 w-4 mr-2" />
                  Odżywianie
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto p-4">
                {/* TAB 1: PODSTAWOWE */}
                <TabsContent value="basic" className="space-y-4 m-0">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nazwa przepisu *</FormLabel>
                        <FormControl>
                          <Input placeholder="Np. Spaghetti Bolognese" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opis</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Krótki opis przepisu..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zdjęcie główne</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value}
                            onChange={field.onChange}
                            folder="recipes"
                            aspectRatio="video"
                            placeholder="Dodaj zdjęcie przepisu"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategoria</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cuisine"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kuchnia</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Wybierz" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {cuisines.map((cuisine) => (
                                <SelectItem key={cuisine.value} value={cuisine.value}>
                                  {cuisine.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trudność</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="EASY">Łatwy</SelectItem>
                              <SelectItem value="MEDIUM">Średni</SelectItem>
                              <SelectItem value="HARD">Trudny</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="servings"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Liczba porcji</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagi</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Np. wegetariański, szybki, zdrowy (oddzielone przecinkami)"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Oddziel przecinkami
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Źródło przepisu</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Np. Książka kucharрська, babcia, link..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link do wideo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://youtube.com/..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 2: GOTOWANIE */}
                <TabsContent value="cooking" className="space-y-4 m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Czasy przygotowania
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="prepTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Przygotowanie (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="15"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cookTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gotowanie (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="30"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="restTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Odpoczynek (min)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Np. studzenie, nabiłenie ciasta
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        Parametry gotowania
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="cookingMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sposób gotowania</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Wybierz sposób" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cookingMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="ovenTemp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Temperatura piekarnika (°C)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  max={300}
                                  placeholder="180"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ovenMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tryb piekarnika</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Wybierz tryb" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ovenModes.map((mode) => (
                                    <SelectItem key={mode.value} value={mode.value}>
                                      {mode.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <FormField
                    control={form.control}
                    name="tips"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4" />
                          Wskazówki i porady
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Dodatkowe wskazówki, jak można zmodyfikować przepis, czym zastąpić składniki..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                {/* TAB 3: SKŁADNIKI */}
                <TabsContent value="ingredients" className="space-y-4 m-0">
                  <div className="flex items-center justify-between">
                    <FormLabel>Lista składników</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendIngredient({ name: "", quantity: undefined, unit: "", optional: false })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Dodaj składnik
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {ingredientFields.map((field, index) => (
                      <Card key={field.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-3">
                              <FormField
                                control={form.control}
                                name={`ingredients.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Składnik</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Np. mąka pszenna"
                                        list={`ingredients-list-${index}`}
                                        {...field}
                                      />
                                    </FormControl>
                                    <datalist id={`ingredients-list-${index}`}>
                                      {existingIngredients.map((ing, i) => (
                                        <option key={i} value={ing.name} />
                                      ))}
                                    </datalist>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Ilość</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="500"
                                          {...field}
                                          value={field.value || ""}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.unit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Jednostka</FormLabel>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Wybierz" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {units.map((unit) => (
                                            <SelectItem key={unit} value={unit}>
                                              {unit}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name={`ingredients.${index}.optional`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>
                                        Składnik opcjonalny
                                      </FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeIngredient(index)}
                              disabled={ingredientFields.length === 1}
                              className="mt-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB 4: KROKI */}
                <TabsContent value="steps" className="space-y-4 m-0">
                  <div className="flex items-center justify-between">
                    <FormLabel>Kroki przygotowania</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendStep({
                        content: "",
                        duration: undefined,
                        image: null,
                        temperature: undefined,
                        tip: "",
                        isOptional: false
                      })}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Dodaj krok
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {stepFields.map((field, index) => (
                      <Card key={field.id}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              Krok {index + 1}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStep(index)}
                              disabled={stepFields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`steps.${index}.content`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Opis kroku *</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Opisz dokładnie co należy zrobić w tym kroku..."
                                    rows={3}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`steps.${index}.image`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <ImageIcon className="h-4 w-4 inline mr-1" />
                                  Zdjęcie kroku
                                </FormLabel>
                                <FormControl>
                                  <ImageUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    folder="recipes/steps"
                                    aspectRatio="square"
                                    placeholder="Dodaj zdjęcie tego kroku"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`steps.${index}.duration`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    <Timer className="h-4 w-4 inline mr-1" />
                                    Czas (min)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      placeholder="10"
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`steps.${index}.temperature`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    <Thermometer className="h-4 w-4 inline mr-1" />
                                    Temperatura (°C)
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={300}
                                      placeholder="180"
                                      {...field}
                                      value={field.value || ""}
                                      onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`steps.${index}.tip`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  <Lightbulb className="h-4 w-4 inline mr-1" />
                                  Wskazówka
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Dodatkowa podpowiedź do tego kroku..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`steps.${index}.isOptional`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>
                                    Krok opcjonalny
                                  </FormLabel>
                                  <FormDescription className="text-xs">
                                    Ten krok można pominąć
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB 5: ODŻYWIANIE */}
                <TabsContent value="nutrition" className="space-y-4 m-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Wartości odżywcze (na porcję)</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="calories"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kalorie (kcal)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                placeholder="350"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="protein"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Białko (g)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                placeholder="25"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="carbs"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Węglowodany (g)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                placeholder="45"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tłuszcz (g)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                placeholder="12"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="fiber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Błonnik (g)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                placeholder="5"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Diety i preferencje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="isVegetarian"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="flex items-center gap-2">
                                  <Apple className="h-4 w-4" />
                                  Wegetariańskie
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isVegan"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="flex items-center gap-2">
                                  <Heart className="h-4 w-4" />
                                  Wegańskie
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isGlutenFree"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="flex items-center gap-2">
                                  <Wheat className="h-4 w-4" />
                                  Bezglutenowe
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="isDairyFree"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="flex items-center gap-2">
                                  <Milk className="h-4 w-4" />
                                  Bez nabiału
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="allergens"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              Alergeny
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Np. orzechy, jajka, soja (oddzielone przecinkami)"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Lista składników będących alergenami
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>

            {/* Sticky footer z przyciskami */}
            <div className="border-t p-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : isEditing ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj przepis"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

