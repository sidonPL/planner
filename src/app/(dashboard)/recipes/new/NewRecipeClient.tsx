"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UNITS_SHORT } from "@/lib/units";
import { IngredientAutocomplete } from "@/components/recipes/IngredientAutocomplete";
import { NutritionSummary } from "@/components/recipes/NutritionSummary";
import {
  hasQuantityInput,
  parseIngredientQuantity,
} from "@/lib/ingredient-quantity";

const INGREDIENT_QUANTITY_HINT = "Akceptuje: 0.5, 1/2, 1 1/2";

const recipeFormSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: z.string().optional(),
  category: z.string().optional(),
  prepTime: z.number().optional().nullable(),
  cookTime: z.number().optional().nullable(),
  servings: z.number().min(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  tags: z.string().optional(),
  ingredients: z.array(
    z.object({
      name: z.string().min(1, "Nazwa składnika jest wymagana"),
      quantity: z.string().optional().nullable(),
      unit: z.string().optional(),
      nutrition: z.object({
        calories: z.number().optional(),
        protein: z.number().optional(),
        carbohydrates: z.number().optional(),
        fat: z.number().optional(),
        fiber: z.number().optional(),
        salt: z.number().optional(),
        sugar: z.number().optional(),
        saturatedFat: z.number().optional(),
      }).optional().nullable(),
    })
  ),
  steps: z.array(
    z.object({
      content: z.string().min(1, "Treść kroku jest wymagana"),
      duration: z.number().optional().nullable(),
    })
  ),
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

const categories = [
  { value: "breakfast", label: "Śniadanie" },
  { value: "lunch", label: "Obiad" },
  { value: "dinner", label: "Kolacja" },
  { value: "dessert", label: "Deser" },
  { value: "snack", label: "Przekąska" },
  { value: "drink", label: "Napój" },
  { value: "other", label: "Inne" },
];

export function NewRecipeClient() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "other",
      prepTime: undefined,
      cookTime: undefined,
      servings: 4,
      difficulty: "MEDIUM",
      tags: "",
      ingredients: [{ name: "", quantity: "", unit: "", nutrition: null }],
      steps: [{ content: "", duration: undefined }],
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
      const normalizedIngredients = data.ingredients.map((ingredient) => ({
        ...ingredient,
        quantity: parseIngredientQuantity(ingredient.quantity),
      }));

      const hasInvalidQuantity = data.ingredients.some((ingredient, index) => {
        const parsedQuantity = normalizedIngredients[index].quantity;
        return hasQuantityInput(ingredient.quantity) && parsedQuantity === null;
      });

      if (hasInvalidQuantity) {
        toast.error(`Nieprawidłowa ilość składnika. ${INGREDIENT_QUANTITY_HINT}.`);
        return;
      }

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ingredients: normalizedIngredients,
          tags: data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        }),
      });

      if (response.ok) {
        const savedRecipe = await response.json();
        toast.success("Przepis został dodany");
        router.push(`/recipes/${savedRecipe.id}`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/recipes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Nowy przepis</h1>
          <p className="text-muted-foreground">Dodaj nowy przepis do swojej kolekcji</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Podstawowe informacje */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Podstawowe informacje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nazwa przepisu *</FormLabel>
                      <FormControl>
                        <Input placeholder="np. Spaghetti Carbonara" {...field} />
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
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz kategorię" />
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
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poziom trudności</FormLabel>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Czas przygotowania (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="15"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                        <FormLabel>Czas gotowania (min)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
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
                            min="1"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 1)}
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
                      <FormLabel>Tagi (oddzielone przecinkami)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="wegetariański, szybki, zdrowy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Wartości odżywcze - Sidebar */}
            <div className="space-y-6">
              <NutritionSummary
                ingredients={(form.watch("ingredients") || []).map((ingredient) => ({
                  ...ingredient,
                  quantity: parseIngredientQuantity(ingredient.quantity),
                }))}
                servings={form.watch("servings")}
              />
            </div>
          </div>

          {/* Składniki */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Składniki</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendIngredient({ name: "", quantity: undefined, unit: "", nutrition: null })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {ingredientFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-16">
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="np. 3/4"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormDescription>{INGREDIENT_QUANTITY_HINT}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.unit`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="j." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UNITS_SHORT.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`ingredients.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <IngredientAutocomplete
                            value={field.value}
                            onChange={(value, suggestion) => {
                              field.onChange(value);

                              // Auto-wypełnij jednostkę jeśli wybrano składnik
                              if (suggestion) {
                                if (suggestion.commonUnit) {
                                  form.setValue(`ingredients.${index}.unit`, suggestion.commonUnit);
                                }
                              }
                            }}
                            placeholder="Nazwa składnika"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {ingredientFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Kroki przygotowania */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kroki przygotowania</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendStep({ content: "", duration: undefined })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj krok
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {stepFields.map((field, index) => (
                <div key={field.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <FormField
                      control={form.control}
                      name={`steps.${index}.content`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Opisz ten krok..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`steps.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Czas trwania (min) - opcjonalne"
                              className="w-48"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {stepFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/recipes">Anuluj</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Zapisz przepis
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

