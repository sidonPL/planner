"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Edit2,
  Trash2,
  Search,
  Loader2,
  X,
  ChefHat,
  Package,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GlobalIngredient {
  id: string;
  name: string;
  category: string | null;
  commonUnit: string | null;
  usageCount: number;
}

interface ManageIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: "mąki", label: "Mąki i skrobie" },
  { value: "nabiał", label: "Nabiał" },
  { value: "mięso", label: "Mięso" },
  { value: "ryby", label: "Ryby i owoce morza" },
  { value: "warzywa", label: "Warzywa" },
  { value: "owoce", label: "Owoce" },
  { value: "przyprawy", label: "Przyprawy" },
  { value: "zioła", label: "Zioła" },
  { value: "oleje", label: "Oleje i tłuszcze" },
  { value: "makarony", label: "Makarony" },
  { value: "ryże", label: "Ryż" },
  { value: "kasze", label: "Kasze" },
  { value: "jaja", label: "Jaja" },
  { value: "dodatki", label: "Dodatki" },
  { value: "inne", label: "Inne" },
];

const units = [
  { value: "g", label: "g - gramy" },
  { value: "kg", label: "kg - kilogramy" },
  { value: "ml", label: "ml - mililitry" },
  { value: "l", label: "l - litry" },
  { value: "szt", label: "szt - sztuki" },
  { value: "łyżka", label: "łyżka" },
  { value: "łyżeczka", label: "łyżeczka" },
  { value: "szklanka", label: "szklanka" },
  { value: "szczypta", label: "szczypta" },
  { value: "opakowanie", label: "opakowanie" },
  { value: "puszka", label: "puszka" },
  { value: "kromka", label: "kromka" },
  { value: "plaster", label: "plaster" },
  { value: "ząbek", label: "ząbek" },
  { value: "do smaku", label: "do smaku" },
];

export function ManageIngredientsDialog({ open, onOpenChange }: ManageIngredientsDialogProps) {
  const [ingredients, setIngredients] = useState<GlobalIngredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<GlobalIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("popular");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
    commonUnit: "",
  });
  const [newForm, setNewForm] = useState({
    name: "",
    category: "",
    commonUnit: "",
  });

  useEffect(() => {
    if (open) {
      fetchIngredients();
    }
  }, [open]);

  useEffect(() => {
    let filtered = ingredients;

    // Filtruj po wyszukiwaniu
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (ing) =>
          ing.name.toLowerCase().includes(query) ||
          ing.category?.toLowerCase().includes(query)
      );
    }

    // Filtruj po kategorii
    if (categoryFilter !== "all") {
      filtered = filtered.filter((ing) =>
        categoryFilter === "no-category"
          ? !ing.category
          : ing.category === categoryFilter
      );
    }

    // Sortuj
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.usageCount - a.usageCount;
        case "alphabetical":
          return a.name.localeCompare(b.name, "pl");
        case "alphabetical-desc":
          return b.name.localeCompare(a.name, "pl");
        case "category":
          return (a.category || "zzz").localeCompare(b.category || "zzz", "pl");
        default:
          return 0;
      }
    });

    setFilteredIngredients(filtered);
  }, [searchQuery, categoryFilter, sortBy, ingredients]);

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/global-ingredients?limit=1000");
      if (response.ok) {
        const data = await response.json();
        setIngredients(data);
        setFilteredIngredients(data);
      } else {
        toast.error("Nie udało się pobrać składników");
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = (ingredient: GlobalIngredient) => {
    setEditingId(ingredient.id);
    setEditForm({
      name: ingredient.name,
      category: ingredient.category || "none",
      commonUnit: ingredient.commonUnit || "none",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ name: "", category: "", commonUnit: "" });
  };

  const startAdding = () => {
    setIsAdding(true);
    setNewForm({ name: "", category: "", commonUnit: "" });
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewForm({ name: "", category: "", commonUnit: "" });
  };

  const saveNew = async () => {
    if (!newForm.name.trim()) {
      toast.error("Nazwa składnika jest wymagana");
      return;
    }

    try {
      const response = await fetch("/api/global-ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name,
          category: newForm.category === "none" ? null : newForm.category,
          commonUnit: newForm.commonUnit === "none" ? null : newForm.commonUnit,
        }),
      });

      if (response.ok) {
        toast.success("Składnik dodany");
        fetchIngredients();
        cancelAdding();
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się dodać składnika");
      }
    } catch (error) {
      console.error("Error creating ingredient:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) {
      toast.error("Nazwa składnika jest wymagana");
      return;
    }

    try {
      const response = await fetch(`/api/global-ingredients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          category: editForm.category === "none" ? null : editForm.category,
          commonUnit: editForm.commonUnit === "none" ? null : editForm.commonUnit,
        }),
      });

      if (response.ok) {
        toast.success("Składnik zaktualizowany");
        fetchIngredients();
        cancelEditing();
      } else {
        toast.error("Nie udało się zaktualizować składnika");
      }
    } catch (error) {
      console.error("Error updating ingredient:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const deleteIngredient = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć składnik "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/global-ingredients/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Składnik usunięty");
        fetchIngredients();
      } else {
        toast.error("Nie udało się usunąć składnika");
      }
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const getCategoryLabel = (category: string | null) => {
    if (!category) return "Bez kategorii";
    return categories.find((c) => c.value === category)?.label || category;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Zarządzaj składnikami
          </DialogTitle>
          <DialogDescription>
            Edytuj, dodawaj lub usuń składniki z bazy danych gospodarstwa
          </DialogDescription>
        </DialogHeader>

        {/* Wyszukiwarka i filtry */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj składnika..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                <SelectItem value="no-category">Bez kategorii</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sortuj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Najpopularniejsze</SelectItem>
                <SelectItem value="alphabetical">A-Z</SelectItem>
                <SelectItem value="alphabetical-desc">Z-A</SelectItem>
                <SelectItem value="category">Według kategorii</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={startAdding} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </div>
        </div>

        {/* Lista składników */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y">
              {/* Formularz dodawania nowego składnika */}
              {isAdding && (
                <div className="p-3 bg-primary/5 border-b-2 border-primary">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">Nowy składnik</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Nazwa *</Label>
                        <Input
                          value={newForm.name}
                          onChange={(e) =>
                            setNewForm({ ...newForm, name: e.target.value })
                          }
                          placeholder="Nazwa składnika"
                          className="h-9"
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Kategoria</Label>
                        <Select
                          value={newForm.category}
                          onValueChange={(value) =>
                            setNewForm({ ...newForm, category: value })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Wybierz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Bez kategorii</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Jednostka</Label>
                        <Select
                          value={newForm.commonUnit}
                          onValueChange={(value) =>
                            setNewForm({ ...newForm, commonUnit: value })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Wybierz" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Brak</SelectItem>
                            {units.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveNew}
                        className="flex-1"
                      >
                        Dodaj składnik
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelAdding}
                        className="flex-1"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista istniejących składników */}
              {filteredIngredients.length === 0 && !isAdding ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ChefHat className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">
                    {searchQuery || categoryFilter !== "all"
                      ? "Nie znaleziono składników"
                      : "Brak składników w bazie"}
                  </p>
                  {!searchQuery && categoryFilter === "all" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startAdding}
                      className="mt-3"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Dodaj pierwszy składnik
                    </Button>
                  )}
                </div>
              ) : filteredIngredients.length > 0 ? (
                filteredIngredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="p-3 hover:bg-muted/50 transition-colors"
                >
                  {editingId === ingredient.id ? (
                    // Tryb edycji
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Nazwa *</Label>
                          <Input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="Nazwa składnika"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Kategoria</Label>
                          <Select
                            value={editForm.category}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, category: value })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Wybierz" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Bez kategorii</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Jednostka</Label>
                          <Select
                            value={editForm.commonUnit}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, commonUnit: value })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Wybierz" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Brak</SelectItem>
                              {units.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(ingredient.id)}
                          className="flex-1"
                        >
                          Zapisz
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          className="flex-1"
                        >
                          Anuluj
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Tryb wyświetlania
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{ingredient.name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{getCategoryLabel(ingredient.category)}</span>
                          {ingredient.commonUnit && (
                            <>
                              <span>•</span>
                              <span className="px-1.5 py-0.5 bg-primary/10 rounded">
                                {ingredient.commonUnit}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>użyto {ingredient.usageCount}x</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(ingredient)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteIngredient(ingredient.id, ingredient.name)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
              ) : null}
            </div>
          )}
        </div>

        {/* Statystyki */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <span>
            Wyświetlono: {filteredIngredients.length} / {ingredients.length} składników
          </span>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

