"use client";

import { useState, useEffect } from "react";
import { useForm, FormProvider, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RecipeData } from "@/types/recipe";
import {
  hasQuantityInput,
  INGREDIENT_QUANTITY_HINT,
  parseIngredientQuantity,
} from "@/lib/ingredient-quantity";
import {
  RecipeBasicsStep,
  RecipeIngredientsStep,
  RecipeStepsStep,
  RecipeDetailsStep,
  RecipePreviewStep
} from "@/components/recipes/wizard-steps";

// Types for imported recipe data
interface ImportedIngredient {
  name: string;
  quantity?: number | null;
  unit?: string | null;
  optional?: boolean;
}

interface ImportedStep {
  content: string;
  duration?: number | null;
  image?: string | null;
  temperature?: number | null;
  tip?: string | null;
  isOptional?: boolean;
  order?: number;
}

const recipeWizardSchema = z.object({
  // Step 1: Basics
  name: z.string().min(1, "Nazwa jest wymagana"),
  category: z.string().min(1).default("other"),
  image: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  cuisine: z.string().nullable().optional().default(null),

  // Step 2: Ingredients
  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Nazwa składnika jest wymagana"),
      quantity: z.string().nullable().optional(),
      unit: z.string().optional().nullable(),
      optional: z.boolean().optional(),
    })
  ).min(1, "Dodaj przynajmniej jeden składnik"),

  // Step 3: Cooking Steps
  steps: z.array(
    z.object({
      content: z.string().min(1, "Treść kroku jest wymagana"),
      duration: z.number().nullable().optional(),
      image: z.string().nullable().optional(),
      temperature: z.number().nullable().optional(),
      tip: z.string().nullable().optional(),
      isOptional: z.boolean().optional(),
      ingredientIds: z.array(z.number()).optional().default([]),
    })
  ).min(1, "Dodaj przynajmniej jeden krok"),

  // Step 3b: Opisowy sposób przygotowania (opcjonalnie, jako alternatywa lub uzupełnienie kroków)
  instructions: z.string().nullable().optional(),

  // Step 4: Details
  servings: z.number().min(1).default(4),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  prepTime: z.number().nullable().optional(),
  cookTime: z.number().nullable().optional(),
  restTime: z.number().nullable().optional(),
  cookingMethod: z.enum([
    "BAKING", "FRYING", "BOILING", "STEAMING", "GRILLING",
    "ROASTING", "STEWING", "SAUTEING", "AIR_FRYING", "MIXING", "OTHER"
  ]).nullable().optional(),
  ovenTemp: z.number().nullable().optional(),
  ovenMode: z.enum([
    "CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"
  ]).nullable().optional(),
  tags: z.string().optional(),

  // Nutrition
  calories: z.number().nullable().optional(),
  protein: z.number().nullable().optional(),
  carbs: z.number().nullable().optional(),
  fat: z.number().nullable().optional(),
  fiber: z.number().nullable().optional(),

  // Dietary
  isVegetarian: z.boolean().optional().default(false),
  isVegan: z.boolean().optional().default(false),
  isGlutenFree: z.boolean().optional().default(false),
  isDairyFree: z.boolean().optional().default(false),
  allergens: z.string().optional(),

  // Additional
  tips: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
});

export type RecipeWizardFormData = z.infer<typeof recipeWizardSchema>;

type RecipeDataWithInstructions = RecipeData & {
  instructions?: string | null;
};

interface RecipeWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: RecipeDataWithInstructions | null;
  onRecipeCreated: (recipe: RecipeData) => void;
  onRecipeUpdated: (recipe: RecipeData) => void;
}

const STEPS = [
  { id: 1, name: "Podstawy", description: "Nazwa i kategoria" },
  { id: 2, name: "Składniki", description: "Lista składników" },
  { id: 3, name: "Kroki", description: "Instrukcje przygotowania" },
  { id: 4, name: "Szczegóły", description: "Czas, trudność, wartości odżywcze" },
  { id: 5, name: "Podgląd", description: "Sprawdź i zapisz" },
];

export function RecipeWizardDialog({
  open,
  onOpenChange,
  recipe,
  onRecipeCreated,
  onRecipeUpdated,
}: RecipeWizardDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!recipe;

  const form = useForm<RecipeWizardFormData>({
    resolver: zodResolver(recipeWizardSchema) as unknown as Resolver<RecipeWizardFormData>,
    defaultValues: {
      name: recipe?.name || "",
      category: recipe?.category || "other",
      image: recipe?.image || null,
      description: recipe?.description || "",
      cuisine: recipe?.cuisine || "",
      servings: recipe?.servings || 4,
      difficulty: recipe?.difficulty || "MEDIUM",
      prepTime: recipe?.prepTime || null,
      cookTime: recipe?.cookTime || null,
      restTime: recipe?.restTime || null,
      cookingMethod: (recipe?.cookingMethod && ["BAKING", "FRYING", "BOILING", "STEAMING", "GRILLING", "ROASTING", "STEWING", "SAUTEING", "AIR_FRYING", "MIXING", "OTHER"].includes(recipe.cookingMethod)) ? recipe.cookingMethod as unknown as RecipeWizardFormData["cookingMethod"] : null,
      ovenTemp: recipe?.ovenTemp || null,
      ovenMode: (recipe?.ovenMode && ["CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"].includes(recipe.ovenMode)) ? recipe.ovenMode as unknown as RecipeWizardFormData["ovenMode"] : null,
      tags: recipe?.tags?.join(", ") || "",
      calories: recipe?.calories || null,
      protein: recipe?.protein || null,
      carbs: recipe?.carbs || null,
      fat: recipe?.fat || null,
      fiber: recipe?.fiber || null,
      isVegetarian: recipe?.isVegetarian || false,
      isVegan: recipe?.isVegan || false,
      isGlutenFree: recipe?.isGlutenFree || false,
      isDairyFree: recipe?.isDairyFree || false,
      allergens: recipe?.allergens?.join(", ") || "",
      tips: recipe?.tips || "",
      source: recipe?.source || "",
      videoUrl: recipe?.videoUrl || "",
      isPublic: recipe?.isPublic || false,
      ingredients: recipe?.ingredients?.map(ing => ({
        name: ing.name,
        quantity: ing.quantity != null ? String(ing.quantity) : "",
        unit: ing.unit || "",
        optional: ing.optional || false,
      })) || [{ name: "", quantity: "", unit: "", optional: false }],
      steps: recipe?.steps?.map(step => ({
        content: step.content,
        duration: step.duration || null,
        image: step.image || null,
        temperature: step.temperature || null,
        tip: step.tip || "",
        isOptional: step.isOptional || false,
        ingredientIds: [],
      })) || [{ content: "", duration: null, image: null, temperature: null, tip: "", isOptional: false, ingredientIds: [] }],
      instructions: recipe?.instructions || null,
    },
  });

  // Reset form when recipe changes (e.g., after import)
  useEffect(() => {
    if (recipe) {
      form.reset({
        name: recipe.name || "",
        category: recipe.category || "other",
        image: recipe.image || null,
        description: recipe.description || "",
        cuisine: recipe.cuisine || "",
        servings: recipe.servings || 4,
        difficulty: recipe.difficulty || "MEDIUM",
        prepTime: recipe.prepTime || null,
        cookTime: recipe.cookTime || null,
        restTime: recipe.restTime || null,
        cookingMethod: (recipe.cookingMethod && ["BAKING", "FRYING", "BOILING", "STEAMING", "GRILLING", "ROASTING", "STEWING", "SAUTEING", "AIR_FRYING", "MIXING", "OTHER"].includes(recipe.cookingMethod)) ? recipe.cookingMethod as unknown as RecipeWizardFormData["cookingMethod"] : null,
        ovenTemp: recipe.ovenTemp || null,
        ovenMode: (recipe.ovenMode && ["CONVENTIONAL", "FAN_ASSISTED", "GRILL", "PIZZA"].includes(recipe.ovenMode)) ? recipe.ovenMode as unknown as RecipeWizardFormData["ovenMode"] : null,
        tags: recipe.tags?.join(", ") || "",
        calories: recipe.calories || null,
        protein: recipe.protein || null,
        carbs: recipe.carbs || null,
        fat: recipe.fat || null,
        fiber: recipe.fiber || null,
        isVegetarian: recipe.isVegetarian || false,
        isVegan: recipe.isVegan || false,
        isGlutenFree: recipe.isGlutenFree || false,
        isDairyFree: recipe.isDairyFree || false,
        allergens: recipe.allergens?.join(", ") || "",
        tips: recipe.tips || "",
        source: recipe.source || "",
        videoUrl: recipe.videoUrl || "",
        isPublic: recipe.isPublic || false,
        ingredients: recipe.ingredients?.map((ing: ImportedIngredient) => ({
          name: ing.name,
          quantity: ing.quantity != null ? String(ing.quantity) : "",
          unit: ing.unit || "",
          optional: ing.optional || false,
        })) || [{ name: "", quantity: "", unit: "", optional: false }],
        steps: recipe.steps?.map((step: ImportedStep) => ({
          content: step.content,
          duration: step.duration || null,
          image: step.image || null,
          temperature: step.temperature || null,
          tip: step.tip || "",
          isOptional: step.isOptional || false,
          ingredientIds: [],
        })) || [{ content: "", duration: null, image: null, temperature: null, tip: "", isOptional: false, ingredientIds: [] }],
        instructions: recipe?.instructions || null,
      });
    }
  }, [recipe, form]);

  const nextStep = async () => {
    // Validate current step fields
    let fieldsToValidate: (keyof RecipeWizardFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ["name", "category"];
        break;
      case 2:
        fieldsToValidate = ["ingredients"];
        break;
      case 3:
        fieldsToValidate = ["steps"];
        break;
      case 4:
        fieldsToValidate = ["servings", "difficulty"];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);

    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: RecipeWizardFormData) => {
    setIsSubmitting(true);

    try {
      const parsedIngredients = data.ingredients.map((ingredient) => {
        const parsedQuantity = parseIngredientQuantity(ingredient.quantity);
        return {
          ...ingredient,
          quantity: parsedQuantity,
        };
      });

      const hasInvalidQuantity = data.ingredients.some((ingredient, index) => {
        const parsedQuantity = parsedIngredients[index].quantity;
        return hasQuantityInput(ingredient.quantity) && parsedQuantity === null;
      });

      if (hasInvalidQuantity) {
        toast.error(`Nieprawidłowa ilość składnika. ${INGREDIENT_QUANTITY_HINT}.`);
        return;
      }

      const payload = {
        ...data,
        ingredients: parsedIngredients,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        allergens: data.allergens ? data.allergens.split(",").map(a => a.trim()).filter(Boolean) : [],
        totalTime: (data.prepTime || 0) + (data.cookTime || 0) + (data.restTime || 0) || null,
      };

      const url = isEditing ? `/api/recipes/${recipe.id}` : "/api/recipes";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save recipe");
      }

      const savedRecipe = await response.json();

      toast.success(isEditing ? "Przepis zaktualizowany!" : "Przepis dodany!");

      if (isEditing) {
        onRecipeUpdated(savedRecipe);
      } else {
        onRecipeCreated(savedRecipe);
      }

      onOpenChange(false);
      form.reset();
      setCurrentStep(1);
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Nie udało się zapisać przepisu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {!open ? null : (
          <>
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edytuj przepis" : "Dodaj nowy przepis"}
              </DialogTitle>
              <DialogDescription>
                Krok {currentStep} z {STEPS.length}: {STEPS[currentStep - 1].description}
              </DialogDescription>
            </DialogHeader>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={step.id === currentStep ? "font-semibold text-foreground" : ""}
                  >
                    {step.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Steps */}
            <FormProvider {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {currentStep === 1 && <RecipeBasicsStep form={form} />}
                {currentStep === 2 && <RecipeIngredientsStep form={form} />}
                {currentStep === 3 && <RecipeStepsStep form={form} />}
                {currentStep === 4 && <RecipeDetailsStep form={form} />}
                {currentStep === 5 && <RecipePreviewStep form={form} />}

                {/* Navigation */}
                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || isSubmitting}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Wstecz
                  </Button>

                  {currentStep < STEPS.length ? (
                    <Button type="button" onClick={nextStep}>
                      Dalej
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Zapisywanie...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          {isEditing ? "Zaktualizuj" : "Dodaj przepis"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </FormProvider>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

