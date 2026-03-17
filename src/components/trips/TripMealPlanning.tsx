"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ChefHat, Plus, Trash2, ShoppingCart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { eachDayOfInterval } from "date-fns";

interface User {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
}

interface Recipe {
  id: string;
  name: string;
  image: string | null;
  prepTime: number | null;
  cookTime: number | null;
  servings: number;
}

interface TripMeal {
  id: string;
  date: Date;
  mealType: string;
  recipeId: string | null;
  customName: string | null;
  assignedTo: string | null;
  notes: string | null;
  budget: number | null;
  recipe: Recipe | null;
  assignee: User | null;
}

interface TripMealPlanningProps {
  tripId: string;
  tripStartDate: Date;
  tripEndDate: Date;
  members: User[];
  currentUserId: string;
  foodBudget?: number | null;
}

const mealTypes = [
  { value: "śniadanie", label: "🌅 Śniadanie", emoji: "🌅" },
  { value: "obiad", label: "🌞 Obiad", emoji: "🌞" },
  { value: "kolacja", label: "🌙 Kolacja", emoji: "🌙" },
  { value: "przekąska", label: "🍎 Przekąska", emoji: "🍎" },
];

export function TripMealPlanning({
  tripId,
  tripStartDate,
  tripEndDate,
  members,
  currentUserId: _currentUserId,
  foodBudget,
}: TripMealPlanningProps) {
  const [meals, setMeals] = useState<TripMeal[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRecipeSearch, setShowRecipeSearch] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [deletingMeal, setDeletingMeal] = useState<TripMeal | null>(null);
  const [newMeal, setNewMeal] = useState({
    date: "",
    mealType: "obiad",
    recipeId: null as string | null,
    customName: "",
    assignedTo: null as string | null,
    notes: "",
    budget: null as number | null,
  });

  const tripDays = eachDayOfInterval({ start: tripStartDate, end: tripEndDate });

  // Pobierz meals i przepisy
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mealsRes, recipesRes] = await Promise.all([
          fetch(`/api/trips/${tripId}/meals`),
          fetch(`/api/recipes`),
        ]);

        if (mealsRes.ok) {
          const mealsData = await mealsRes.json();
          setMeals(mealsData);
        }

        if (recipesRes.ok) {
          const recipesData = await recipesRes.json();
          setRecipes(recipesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tripId]);

  const handleAddMeal = async () => {
    if (!newMeal.date) {
      toast.error("Wybierz datę");
      return;
    }

    if (!newMeal.recipeId && !newMeal.customName) {
      toast.error("Wybierz przepis lub wpisz nazwę posiłku");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMeal),
      });

      if (response.ok) {
        const meal = await response.json();
        setMeals([...meals, meal]);
        setShowAddDialog(false);
        setNewMeal({
          date: "",
          mealType: "obiad",
          recipeId: null,
          customName: "",
          assignedTo: null,
          notes: "",
          budget: null,
        });
        toast.success("Dodano posiłek");
      }
    } catch (error) {
      console.error("Error adding meal:", error);
      toast.error("Nie udało się dodać posiłku");
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/meals/${mealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMeals(meals.filter((m) => m.id !== mealId));
        setDeletingMeal(null);
        toast.success("Usunięto posiłek");
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      toast.error("Nie udało się usunąć posiłku");
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/meals/shopping-list`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Utworzono listę zakupów z ${data.itemsCreated} produktami`);
      }
    } catch (error) {
      console.error("Error generating shopping list:", error);
      toast.error("Nie udało się wygenerować listy zakupów");
    }
  };

  const getMealsForDay = (day: Date, type: string) => {
    return meals.filter(
      (m) =>
        format(new Date(m.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd") &&
        m.mealType === type
    );
  };

  const totalBudgetUsed = meals.reduce((sum, m) => sum + (m.budget || 0), 0);
  const budgetPercentage = foodBudget ? (totalBudgetUsed / foodBudget) * 100 : 0;

  if (loading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  const filteredRecipes = recipeSearch
    ? recipes.filter((r) => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
    : recipes;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ChefHat className="h-5 w-5" />
          Plan Posiłków
        </h3>
        <div className="flex gap-2">
          {meals.length > 0 && (
            <Button onClick={handleGenerateShoppingList} variant="outline" size="sm">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Lista zakupów
            </Button>
          )}
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj posiłek
          </Button>
        </div>
      </div>

      {foodBudget && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Budżet na jedzenie</span>
              <span className="font-medium">
                {totalBudgetUsed.toFixed(2)} / {foodBudget.toFixed(2)} PLN
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  budgetPercentage > 100
                    ? "bg-red-500"
                    : budgetPercentage > 80
                    ? "bg-orange-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {tripDays.map((day) => (
          <Card key={day.toISOString()}>
            <CardHeader>
              <CardTitle className="text-base">
                {format(day, "EEEE, d MMMM", { locale: pl })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mealTypes.map((type) => {
                const dayMeals = getMealsForDay(day, type.value);

                return (
                  <div key={type.value} className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{type.emoji}</span>
                    <div className="flex-1">
                      {dayMeals.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">
                          {type.label.split(" ")[1]} - nie zaplanowano
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {dayMeals.map((meal) => (
                            <div
                              key={meal.id}
                              className="flex items-center justify-between bg-accent/50 rounded-lg p-3"
                            >
                              <div className="flex-1">
                                <div className="font-medium">
                                  {meal.recipe?.name || meal.customName}
                                </div>
                                {meal.assignee && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={meal.assignee.avatar || ""} />
                                      <AvatarFallback style={{ backgroundColor: meal.assignee.color }}>
                                        {meal.assignee.name?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    {meal.assignee.name}
                                  </div>
                                )}
                                {meal.budget && (
                                  <Badge variant="secondary" className="mt-1">
                                    {meal.budget} PLN
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeletingMeal(meal)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dodaj posiłek</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newMeal.date}
                  onChange={(e) => setNewMeal({ ...newMeal, date: e.target.value })}
                  min={format(tripStartDate, "yyyy-MM-dd")}
                  max={format(tripEndDate, "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label>Typ posiłku</Label>
                <Select value={newMeal.mealType} onValueChange={(v) => setNewMeal({ ...newMeal, mealType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Przepis lub nazwa własna</Label>
              <div className="flex gap-2">
                <Input
                  value={newMeal.customName}
                  onChange={(e) => setNewMeal({ ...newMeal, customName: e.target.value, recipeId: null })}
                  placeholder="np. Pizza na wynos"
                />
                <Button
                  variant="outline"
                  onClick={() => setShowRecipeSearch(!showRecipeSearch)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showRecipeSearch && (
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                <Input
                  placeholder="Szukaj przepisu..."
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                />
                <div className="space-y-1">
                  {filteredRecipes.slice(0, 10).map((recipe) => (
                    <button
                      key={recipe.id}
                      className="w-full text-left p-2 hover:bg-accent rounded text-sm"
                      onClick={() => {
                        setNewMeal({ ...newMeal, recipeId: recipe.id, customName: "" });
                        setShowRecipeSearch(false);
                        setRecipeSearch("");
                      }}
                    >
                      {recipe.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kto gotuje? (opcjonalnie)</Label>
                <Select
                  value={newMeal.assignedTo || "none"}
                  onValueChange={(v) => setNewMeal({ ...newMeal, assignedTo: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz osobę" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nie przypisano</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budżet (PLN)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newMeal.budget || ""}
                  onChange={(e) =>
                    setNewMeal({ ...newMeal, budget: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notatki (opcjonalnie)</Label>
              <Textarea
                value={newMeal.notes}
                onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                placeholder="Dodatkowe informacje..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddMeal}>Dodaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog dla usuwania posiłku */}
      <AlertDialog open={!!deletingMeal} onOpenChange={() => setDeletingMeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć posiłek?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMeal && (
                <>
                  Posiłek <strong>{deletingMeal.recipe?.name || deletingMeal.customName}</strong>
                  {" "}dla dnia <strong>{format(new Date(deletingMeal.date), "d MMMM", { locale: pl })}</strong>
                  {" "}zostanie trwale usunięty. Tej operacji nie można cofnąć.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingMeal && handleDeleteMeal(deletingMeal.id)}
            >
              Usuń posiłek
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
