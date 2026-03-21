"use client";

import { UseFormReturn } from "react-hook-form";
import { Plus, Trash2, GripVertical, FileText } from "lucide-react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/inventory/ImageUpload";
import { IngredientAutocomplete } from "@/components/recipes/IngredientAutocomplete";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { RecipeWizardFormData } from "@/components/recipes/RecipeWizardDialog";

// Helper types for array items
type WizardIngredient = RecipeWizardFormData["ingredients"][number];
type WizardStep = RecipeWizardFormData["steps"][number];

// Step 1: Basics
export function RecipeBasicsStep({ form }: { form: UseFormReturn<RecipeWizardFormData> }) {
  const imageValue = form.watch("image");
  const isExternalImage = imageValue && (imageValue.startsWith("http://") || imageValue.startsWith("https://"));

  return (
    <div className="space-y-4">
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
        name="category"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Kategoria</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="breakfast">Śniadanie</SelectItem>
                <SelectItem value="lunch">Obiad</SelectItem>
                <SelectItem value="dinner">Kolacja</SelectItem>
                <SelectItem value="dessert">Deser</SelectItem>
                <SelectItem value="snack">Przekąska</SelectItem>
                <SelectItem value="drink">Napój</SelectItem>
                <SelectItem value="other">Inne</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zdjęcie</FormLabel>
            <FormControl>
              <div className="space-y-2">
                {isExternalImage ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                      <Image
                        src={field.value || ""}
                        alt="Podgląd przepisu"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="URL zdjęcia"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => field.onChange("")}
                      >
                        Usuń
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ImageUpload
                    value={field.value || ""}
                    onChange={field.onChange}
                    folder="recipes"
                  />
                )}
              </div>
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
                className="resize-none"
                rows={3}
                {...field}
                value={field.value || ""}
              />
            </FormControl>
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
            <FormControl>
              <Input placeholder="np. Włoska, Polska, Azjatycka" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

// Step 2: Ingredients
export function RecipeIngredientsStep({ form }: { form: UseFormReturn<RecipeWizardFormData> }) {
  const ingredients = form.watch("ingredients") || [];

  const addIngredient = () => {
    const current = form.getValues("ingredients");
    form.setValue("ingredients", [...current, { name: "", quantity: null, unit: "", optional: false }]);
  };

  const removeIngredient = (index: number) => {
    const current = form.getValues("ingredients");
    form.setValue("ingredients", current.filter((_: WizardIngredient, i: number) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label>Składniki *</Label>
        <Button type="button" size="sm" onClick={addIngredient}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj składnik
        </Button>
      </div>

      <div className="space-y-3">
        {ingredients.map((ingredient: WizardIngredient, index: number) => (
          <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
            <div className="flex-1 grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <IngredientAutocomplete
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Nazwa składnika"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.quantity`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ilość"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-3">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.unit`}
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Jednostka" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="ml">ml</SelectItem>
                          <SelectItem value="l">l</SelectItem>
                          <SelectItem value="szt">szt</SelectItem>
                          <SelectItem value="łyżka">łyżka</SelectItem>
                          <SelectItem value="łyżeczka">łyżeczka</SelectItem>
                          <SelectItem value="szklanka">szklanka</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
              <div className="col-span-1 flex items-center">
                <FormField
                  control={form.control}
                  name={`ingredients.${index}.optional`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <Label className="text-xs">Opcj.</Label>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeIngredient(index)}
              disabled={ingredients.length === 1}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {form.formState.errors.ingredients && (
        <p className="text-sm text-destructive">{form.formState.errors.ingredients.message as string}</p>
      )}
    </div>
  );
}

// Step 3: Steps
export function RecipeStepsStep({ form }: { form: UseFormReturn<RecipeWizardFormData> }) {
  const steps = form.watch("steps") || [];

  const addStep = () => {
    const current = form.getValues("steps");
    form.setValue("steps", [
      ...current,
      { content: "", duration: null, image: null, temperature: null, tip: "", isOptional: false, ingredientIds: [] },
    ]);
  };

  const removeStep = (index: number) => {
    const current = form.getValues("steps");
    form.setValue("steps", current.filter((_: WizardStep, i: number) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Opisowy sposób przygotowania */}
      <div className="p-4 border rounded-lg bg-muted/30">
        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Opisowy sposób przygotowania (opcjonalnie)
              </FormLabel>
              <FormDescription>
                Możesz podać ciągły opis przygotowania jako alternatywę lub uzupełnienie do kroków poniżej.
                Świetne dla przepisów z blogów kulinarnych.
              </FormDescription>
              <FormControl>
                <Textarea
                  placeholder="Umyj truskawki pod zimną wodą i osusz. Przygotuj cztery czyste słoiki o pojemności 800 ml każdy. Do każdego słoika umieść po około 250 g truskawek, następnie wsyp po 4 łyżki cukru..."
                  className="resize-none min-h-[120px]"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Separator */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">lub/i</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Kroki szczegółowe */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Kroki przygotowania (szczegółowe) *</Label>
          <Button type="button" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj krok
          </Button>
        </div>

        <div className="space-y-4">
          {steps.map((step: WizardStep, index: number) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="outline">Krok {index + 1}</Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <FormField
                control={form.control}
                name={`steps.${index}.content`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instrukcja *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Opisz krok przygotowania..."
                        className="resize-none"
                        rows={3}
                        {...field}
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
                      <FormLabel>Czas (minuty)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="np. 15"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`steps.${index}.temperature`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura (°C)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="np. 180"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name={`steps.${index}.tip`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wskazówka</FormLabel>
                    <FormControl>
                      <Input placeholder="Opcjonalna wskazówka..." {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Sekcja przypisania składników do kroku */}
              <div className="border-t pt-3 mt-3">
                <FormLabel className="mb-2 block">Składniki w tym kroku</FormLabel>
                <FormDescription className="mb-2 text-xs">
                  Wybierz które składniki są używane w tym kroku. W trybie gotowania będzie można je odkliknąć.
                </FormDescription>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md bg-muted/30">
                  {form.getValues("ingredients")?.map((ingredient: WizardIngredient, ingIndex: number) => {
                    const currentIngredientIds = form.getValues(`steps.${index}.ingredientIds`) || [];
                    const isSelected = currentIngredientIds.includes(ingIndex);

                    return (
                      <div key={ingIndex} className="flex items-center space-x-2">
                        <Checkbox
                          id={`step-${index}-ingredient-${ingIndex}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const updatedIds = checked
                              ? [...currentIngredientIds, ingIndex]
                              : currentIngredientIds.filter((id: number) => id !== ingIndex);
                            form.setValue(`steps.${index}.ingredientIds`, updatedIds);
                          }}
                        />
                        <label
                          htmlFor={`step-${index}-ingredient-${ingIndex}`}
                          className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {ingredient.name}
                          {ingredient.quantity && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({ingredient.quantity} {ingredient.unit || ""})
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {form.formState.errors.steps && (
          <p className="text-sm text-destructive">{form.formState.errors.steps.message as string}</p>
        )}
      </div>
    </div>
  );
}

// Step 4: Details
export function RecipeDetailsStep({ form }: { form: UseFormReturn<RecipeWizardFormData> }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="servings"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Porcje *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="difficulty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trudność *</FormLabel>
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

      <div className="space-y-2">
        <Label>Czasy przygotowania</Label>
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="prepTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Przygotowanie (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="15"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cookTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Gotowanie (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="restTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Odpoczynek (min)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="60"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Metoda gotowania</Label>
        <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cookingMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sposób przygotowania</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz metodę" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BAKING">🔥 Pieczenie</SelectItem>
                  <SelectItem value="FRYING">🍳 Smażenie</SelectItem>
                  <SelectItem value="BOILING">💧 Gotowanie</SelectItem>
                  <SelectItem value="STEAMING">♨️ Gotowanie na parze</SelectItem>
                  <SelectItem value="GRILLING">🔥 Grillowanie</SelectItem>
                  <SelectItem value="ROASTING">🔥 Pieczenie (духовка)</SelectItem>
                  <SelectItem value="STEWING">🍲 Duszenie</SelectItem>
                  <SelectItem value="SAUTEING">🥘 Smażenie (sauté)</SelectItem>
                  <SelectItem value="AIR_FRYING">💨 Frytkownica beztłuszczowa</SelectItem>
                  <SelectItem value="MIXING">🥄 Mieszanie (bez gotowania)</SelectItem>
                  <SelectItem value="OTHER">🍴 Inne</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

          <FormField
            control={form.control}
            name="ovenTemp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperatura pieca (°C)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="180"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ovenMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tryb pieca</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz tryb pieca" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CONVENTIONAL">🔥 Góra/dół (konwencjonalny)</SelectItem>
                  <SelectItem value="FAN_ASSISTED">🌀 Termoobieg</SelectItem>
                  <SelectItem value="GRILL">🔥 Grill</SelectItem>
                  <SelectItem value="PIZZA">🍕 Tryb pizza</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-3">
        <Label>Wartości odżywcze (na porcję)</Label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <FormField
            control={form.control}
            name="calories"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Kalorie (kcal)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="250"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="protein"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Białko (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="15"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="carbs"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Węglowodany (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="30"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fat"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tłuszcze (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="10"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Błonnik (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="5"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Dieta</Label>
        <div className="flex flex-wrap gap-4">
          <FormField
            control={form.control}
            name="isVegetarian"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <Label className="!mt-0">🥬 Wegetariańskie</Label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isVegan"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <Label className="!mt-0">🌱 Wegańskie</Label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isGlutenFree"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <Label className="!mt-0">🌾 Bezglutenowe</Label>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDairyFree"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <Label className="!mt-0">🥛 Bez nabiału</Label>
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="allergens"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Alergeny (oddzielone przecinkami)</FormLabel>
            <FormControl>
              <Input placeholder="np. orzechy, jaja, gluten, nabiał" {...field} />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Lista alergenów zawartych w przepisie
            </p>
          </FormItem>
        )}
      />

      <div className="space-y-3">
        <Label>Udostępnianie</Label>
        <FormField
          control={form.control}
          name="isPublic"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <Label className="!mt-0">🌐 Udostępnij publicznie</Label>
                <p className="text-xs text-muted-foreground">
                  Przepis będzie widoczny dla innych użytkowników aplikacji
                </p>
              </div>
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
              <Input placeholder="np. szybkie, łatwe, zdrowe" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tips"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Wskazówki</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Dodatkowe porady i wskazówki dotyczące przygotowania..."
                className="min-h-[80px]"
                {...field}
                value={field.value || ""}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Źródło przepisu</FormLabel>
              <FormControl>
                <Input placeholder="np. Kuchnia Lidla, babcia Maria" {...field} value={field.value || ""} />
              </FormControl>
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
                <Input placeholder="https://youtube.com/..." {...field} value={field.value || ""} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

// Step 5: Preview
export function RecipePreviewStep({ form }: { form: UseFormReturn<RecipeWizardFormData> }) {
  const values = form.getValues();
  const totalTime = (values.prepTime || 0) + (values.cookTime || 0) + (values.restTime || 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">{values.name || "Nowy przepis"}</h3>
        {values.description && (
          <p className="text-muted-foreground mt-2">{values.description}</p>
        )}
      </div>

      {values.image && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden">
          <Image
            src={values.image}
            alt={values.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold">{values.servings}</div>
          <div className="text-sm text-muted-foreground">Porcji</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{totalTime || "—"}</div>
          <div className="text-sm text-muted-foreground">Minut</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{values.difficulty === "EASY" ? "Łatwy" : values.difficulty === "MEDIUM" ? "Średni" : "Trudny"}</div>
          <div className="text-sm text-muted-foreground">Trudność</div>
        </div>
      </div>

      {/* Metoda gotowania i parametry pieca */}
      {(values.cookingMethod || values.ovenTemp || values.ovenMode) && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Metoda przygotowania</h4>
          <div className="space-y-1 text-sm">
            {values.cookingMethod && (
              <p>
                <span className="font-medium">Sposób: </span>
                {values.cookingMethod === "BAKING" && "🔥 Pieczenie"}
                {values.cookingMethod === "FRYING" && "🍳 Smażenie"}
                {values.cookingMethod === "BOILING" && "💧 Gotowanie"}
                {values.cookingMethod === "STEAMING" && "♨️ Gotowanie na parze"}
                {values.cookingMethod === "GRILLING" && "🔥 Grillowanie"}
                {values.cookingMethod === "ROASTING" && "🔥 Pieczenie"}
                {values.cookingMethod === "STEWING" && "🍲 Duszenie"}
                {values.cookingMethod === "SAUTEING" && "🥘 Smażenie (sauté)"}
                {values.cookingMethod === "AIR_FRYING" && "💨 Frytkownica"}
                {values.cookingMethod === "MIXING" && "🥄 Mieszanie"}
                {values.cookingMethod === "OTHER" && "🍴 Inne"}
              </p>
            )}
            {values.ovenTemp && (
              <p><span className="font-medium">Temperatura pieca: </span>{values.ovenTemp}°C</p>
            )}
            {values.ovenMode && (
              <p>
                <span className="font-medium">Tryb pieca: </span>
                {values.ovenMode === "CONVENTIONAL" && "🔥 Góra/dół"}
                {values.ovenMode === "FAN_ASSISTED" && "🌀 Termoobieg"}
                {values.ovenMode === "GRILL" && "🔥 Grill"}
                {values.ovenMode === "PIZZA" && "🍕 Tryb pizza"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wartości odżywcze */}
      {(values.calories || values.protein || values.carbs || values.fat || values.fiber) && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-semibold mb-2">Wartości odżywcze (na porcję)</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            {values.calories && (
              <div>
                <div className="font-bold text-lg">{values.calories}</div>
                <div className="text-muted-foreground">kcal</div>
              </div>
            )}
            {values.protein && (
              <div>
                <div className="font-bold text-lg">{values.protein}g</div>
                <div className="text-muted-foreground">Białko</div>
              </div>
            )}
            {values.carbs && (
              <div>
                <div className="font-bold text-lg">{values.carbs}g</div>
                <div className="text-muted-foreground">Węglowodany</div>
              </div>
            )}
            {values.fat && (
              <div>
                <div className="font-bold text-lg">{values.fat}g</div>
                <div className="text-muted-foreground">Tłuszcze</div>
              </div>
            )}
            {values.fiber && (
              <div>
                <div className="font-bold text-lg">{values.fiber}g</div>
                <div className="text-muted-foreground">Błonnik</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dieta i alergeny */}
      {(values.isVegetarian || values.isVegan || values.isGlutenFree || values.isDairyFree || values.allergens) && (
        <div>
          <h4 className="font-semibold mb-2">Dieta i alergeny</h4>
          <div className="flex flex-wrap gap-2">
            {values.isVegetarian && <Badge variant="secondary">🥬 Wegetariańskie</Badge>}
            {values.isVegan && <Badge variant="secondary">🌱 Wegańskie</Badge>}
            {values.isGlutenFree && <Badge variant="secondary">🌾 Bezglutenowe</Badge>}
            {values.isDairyFree && <Badge variant="secondary">🥛 Bez nabiału</Badge>}
            {values.allergens && (
              <div className="w-full mt-2 text-sm">
                <span className="font-medium">Alergeny: </span>
                <span className="text-muted-foreground">{values.allergens}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold mb-2">Składniki ({values.ingredients?.length || 0})</h4>
        <ul className="list-disc list-inside space-y-1">
          {values.ingredients?.map((ing: WizardIngredient, i: number) => (
            <li key={i} className="text-sm">
              {ing.quantity} {ing.unit} {ing.name}
              {ing.optional && <span className="text-muted-foreground"> (opcjonalny)</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Opisowy sposób przygotowania */}
      {values.instructions && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sposób przygotowania
          </h4>
          <p className="text-sm whitespace-pre-wrap">{values.instructions}</p>
        </div>
      )}

      {/* Kroki szczegółowe */}
      {values.steps && values.steps.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Kroki szczegółowe ({values.steps.length})</h4>
          <ol className="list-decimal list-inside space-y-2">
            {values.steps.map((step: WizardStep, i: number) => (
              <li key={i} className="text-sm">
                {step.content}
                {step.duration && (
                  <span className="text-muted-foreground"> ({step.duration} min)</span>
                )}
                {step.temperature && (
                  <span className="text-muted-foreground"> | {step.temperature}°C</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Wskazówki */}
      {values.tips && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            💡 Wskazówki
          </h4>
          <p className="text-sm whitespace-pre-wrap">{values.tips}</p>
        </div>
      )}

      {/* Dodatkowe informacje */}
      {(values.tags || values.source || values.videoUrl) && (
        <div className="space-y-2 text-sm">
          {values.tags && (
            <div>
              <span className="font-medium">Tagi: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {values.tags.split(",").map((tag: string, i: number) => (
                  <Badge key={i} variant="outline">{tag.trim()}</Badge>
                ))}
              </div>
            </div>
          )}
          {values.source && (
            <p><span className="font-medium">Źródło: </span>{values.source}</p>
          )}
          {values.videoUrl && (
            <p>
              <span className="font-medium">Wideo: </span>
              <a href={values.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {values.videoUrl}
              </a>
            </p>
          )}
        </div>
      )}

      <div className="p-4 bg-muted rounded-lg">
      <p className="text-sm text-muted-foreground">
        Sprawdź wszystkie dane i kliknij &quot;Dodaj przepis&quot; aby zapisać.
      </p>
      </div>
    </div>
  );
}

