"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

type SimpleDish = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  icon: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
};

interface SimpleDishManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDishesUpdated?: () => void;
}

const categories = [
  { value: "breakfast", label: "Śniadanie", icon: "🍳" },
  { value: "lunch", label: "Obiad", icon: "🍛" },
  { value: "dinner", label: "Kolacja", icon: "🍽️" },
  { value: "snack", label: "Przekąska", icon: "🍿" },
  { value: "sandwich", label: "Kanapki", icon: "🥪" },
  { value: "fast", label: "Fast food", icon: "🍕" },
  { value: "other", label: "Inne", icon: "🍴" },
];

const defaultIcons = ["🍽️", "🥪", "🌭", "🍕", "🍔", "🥗", "🍝", "🍜", "🥣", "🍲", "🍳", "🥞", "🧇", "🍿", "🥤"];

const parseNutritionInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export function SimpleDishManager({ open, onOpenChange, onDishesUpdated }: SimpleDishManagerProps) {
  const [dishes, setDishes] = useState<SimpleDish[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDish, setEditingDish] = useState<SimpleDish | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "other",
    description: "",
    icon: "🍽️",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
  });

  useEffect(() => {
    if (open) {
      loadDishes();
    }
  }, [open]);

  const loadDishes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/simple-dishes");
      if (response.ok) {
        const data = await response.json();
        setDishes(data);
      }
    } catch (error) {
      console.error("Error loading dishes:", error);
      toast.error("Nie udało się załadować dań");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nazwa dania jest wymagana");
      return;
    }

    try {
      const url = editingDish ? `/api/simple-dishes/${editingDish.id}` : "/api/simple-dishes";
      const method = editingDish ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          calories: parseNutritionInput(formData.calories),
          protein: parseNutritionInput(formData.protein),
          carbs: parseNutritionInput(formData.carbs),
          fat: parseNutritionInput(formData.fat),
          fiber: parseNutritionInput(formData.fiber),
        }),
      });

      if (response.ok) {
        toast.success(editingDish ? "Danie zaktualizowane" : "Danie dodane");
        loadDishes();
        onDishesUpdated?.();
        handleCloseForm();
      } else {
        toast.error("Wystąpił błąd");
      }
    } catch (error) {
      console.error("Error saving dish:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to danie?")) {
      return;
    }

    try {
      const response = await fetch(`/api/simple-dishes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Danie usunięte");
        loadDishes();
        onDishesUpdated?.();
      } else {
        toast.error("Nie udało się usunąć dania");
      }
    } catch (error) {
      console.error("Error deleting dish:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleEdit = (dish: SimpleDish) => {
    setEditingDish(dish);
    setFormData({
      name: dish.name,
      category: dish.category,
      description: dish.description || "",
      icon: dish.icon,
      calories: dish.calories?.toString() || "",
      protein: dish.protein?.toString() || "",
      carbs: dish.carbs?.toString() || "",
      fat: dish.fat?.toString() || "",
      fiber: dish.fiber?.toString() || "",
    });
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDish(null);
    setFormData({
      name: "",
      category: "other",
      description: "",
      icon: "🍽️",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      fiber: "",
    });
  };

  const groupedDishes = dishes.reduce((acc, dish) => {
    if (!acc[dish.category]) {
      acc[dish.category] = [];
    }
    acc[dish.category].push(dish);
    return acc;
  }, {} as Record<string, SimpleDish[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gotowe dania</DialogTitle>
          <DialogDescription>
            Zarządzaj listą gotowych dań bez przepisów (kanapki, parówki, itp.)
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Lista dań */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Twoje dania ({dishes.length})</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingDish(null);
                  setFormData({
                    name: "",
                    category: "other",
                    description: "",
                    icon: "🍽️",
                    calories: "",
                    protein: "",
                    carbs: "",
                    fat: "",
                    fiber: "",
                  });
                  setIsFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Dodaj danie
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
              ) : dishes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Brak gotowych dań</p>
                  <p className="text-sm mt-2">Dodaj pierwsze danie aby zacząć</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const categoryDishes = groupedDishes[cat.value] || [];
                    if (categoryDishes.length === 0) return null;

                    return (
                      <div key={cat.value} className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                          <span className="text-xs">({categoryDishes.length})</span>
                        </h4>
                        <div className="space-y-1">
                          {categoryDishes.map((dish) => (
                            <div
                              key={dish.id}
                              className="flex items-center gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                            >
                              <span className="text-2xl">{dish.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{dish.name}</p>
                                {dish.description && (
                                  <p className="text-xs text-muted-foreground truncate">{dish.description}</p>
                                )}
                                {(dish.calories || dish.protein || dish.carbs || dish.fat || dish.fiber) && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {dish.calories ? `${Math.round(dish.calories)} kcal` : "0 kcal"}
                                    {` • B ${dish.protein ?? 0} g • W ${dish.carbs ?? 0} g • T ${dish.fat ?? 0} g`}
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => handleEdit(dish)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(dish.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Formularz */}
          {isFormOpen && (
            <div className="w-96 border-l pl-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">{editingDish ? "Edytuj danie" : "Nowe danie"}</h3>
                <Button size="icon" variant="ghost" onClick={handleCloseForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nazwa *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="np. Kanapki z szynką"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Kategoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="icon">Ikona</Label>
                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-1">
                      {defaultIcons.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon })}
                          className={`text-2xl p-2 rounded-lg border hover:bg-accent transition-colors ${
                            formData.icon === icon ? "ring-2 ring-primary bg-accent" : ""
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Opis (opcjonalnie)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="np. Z serem żółtym i ogórkiem"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Właściwości odżywcze (na porcję)</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Kalorie (kcal)"
                        value={formData.calories}
                        onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Białko (g)"
                        value={formData.protein}
                        onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Węglowodany (g)"
                        value={formData.carbs}
                        onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Tłuszcz (g)"
                        value={formData.fat}
                        onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                      />
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Błonnik (g)"
                        value={formData.fiber}
                        onChange={(e) => setFormData({ ...formData, fiber: e.target.value })}
                        className="col-span-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleCloseForm} className="flex-1">
                    Anuluj
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingDish ? "Zapisz" : "Dodaj"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

