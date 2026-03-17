"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  FolderOpen,
  CheckSquare,
  Palette,
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Heart,
  Briefcase,
  Book,
  Gamepad2,
  Wrench,
  Leaf,
  Dog,
  Baby,
  Sparkles,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Category } from "@prisma/client";

type CategoryWithCount = Category & {
  _count: { tasks: number };
};

const colorOptions = [
  { value: "#EF4444", name: "Czerwony" },
  { value: "#F97316", name: "Pomarańczowy" },
  { value: "#F59E0B", name: "Żółty" },
  { value: "#84CC16", name: "Limonkowy" },
  { value: "#22C55E", name: "Zielony" },
  { value: "#14B8A6", name: "Morski" },
  { value: "#06B6D4", name: "Cyjan" },
  { value: "#3B82F6", name: "Niebieski" },
  { value: "#8B5CF6", name: "Fioletowy" },
  { value: "#EC4899", name: "Różowy" },
  { value: "#6B7280", name: "Szary" },
];

const iconOptions: { value: string; name: string; icon: LucideIcon }[] = [
  { value: "home", name: "Dom", icon: Home },
  { value: "shopping", name: "Zakupy", icon: ShoppingCart },
  { value: "food", name: "Jedzenie", icon: Utensils },
  { value: "car", name: "Samochód", icon: Car },
  { value: "health", name: "Zdrowie", icon: Heart },
  { value: "work", name: "Praca", icon: Briefcase },
  { value: "education", name: "Nauka", icon: Book },
  { value: "entertainment", name: "Rozrywka", icon: Gamepad2 },
  { value: "repairs", name: "Naprawy", icon: Wrench },
  { value: "garden", name: "Ogród", icon: Leaf },
  { value: "pets", name: "Zwierzęta", icon: Dog },
  { value: "kids", name: "Dzieci", icon: Baby },
  { value: "cleaning", name: "Sprzątanie", icon: Sparkles },
  { value: "finance", name: "Finanse", icon: DollarSign },
  { value: "other", name: "Inne", icon: FolderOpen },
];

const getIconComponent = (iconName: string | null): LucideIcon => {
  const found = iconOptions.find((i) => i.value === iconName);
  return found?.icon || FolderOpen;
};

interface CategoriesClientProps {
  categories: CategoryWithCount[];
}

export function CategoriesClient({ categories: initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithCount | null>(null);
  const [formData, setFormData] = useState({ name: "", color: "#3B82F6", icon: "other" });
  const [isLoading, setIsLoading] = useState(false);

  const openAddDialog = () => {
    setEditingCategory(null);
    setFormData({ name: "", color: "#3B82F6", icon: "other" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: CategoryWithCount) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color, icon: category.icon || "other" });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (category: CategoryWithCount) => {
    setDeletingCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Podaj nazwę kategorii");
      return;
    }

    setIsLoading(true);

    try {
      if (editingCategory) {
        // Edycja
        const response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const updated = await response.json();
          setCategories(categories.map((c) =>
            c.id === editingCategory.id ? { ...updated, _count: c._count } : c
          ));
          toast.success("Kategoria została zaktualizowana");
          setIsDialogOpen(false);
        } else {
          const data = await response.json();
          toast.error(data.error || "Nie udało się zaktualizować kategorii");
        }
      } else {
        // Dodawanie
        const response = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          const newCategory = await response.json();
          setCategories([...categories, { ...newCategory, _count: { tasks: 0 } }]);
          toast.success("Kategoria została dodana");
          setIsDialogOpen(false);
        } else {
          const data = await response.json();
          toast.error(data.error || "Nie udało się dodać kategorii");
        }
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCategories(categories.filter((c) => c.id !== deletingCategory.id));
        toast.success("Kategoria została usunięta");
        setIsDeleteDialogOpen(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Nie udało się usunąć kategorii");
      }
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Nagłówek */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Kategorie zadań</h1>
            <p className="text-muted-foreground">
              Zarządzaj kategoriami dla zadań domowych
            </p>
          </div>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nowa kategoria
        </Button>
      </div>

      {/* Lista kategorii */}
      {categories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            return (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: category.color }}
                      >
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => openDeleteDialog(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckSquare className="h-4 w-4" />
                    <span>{category._count.tasks} zadań</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Brak kategorii</h3>
              <p className="text-muted-foreground mb-4 text-center">
                Utwórz pierwszą kategorię, aby organizować zadania
              </p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj kategorię
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog dodawania/edycji */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edytuj kategorię" : "Nowa kategoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Zmień nazwę lub kolor kategorii"
                : "Dodaj nową kategorię dla zadań"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="np. Sprzątanie, Zakupy, Ogród..."
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Kolor
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color.value
                        ? "border-primary scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Ikona
              </Label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map((iconOpt) => {
                  const IconComp = iconOpt.icon;
                  return (
                    <button
                      key={iconOpt.value}
                      type="button"
                      title={iconOpt.name}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        formData.icon === iconOpt.value
                          ? "border-primary bg-primary/10 scale-110"
                          : "border-muted hover:border-primary/50 hover:scale-105"
                      }`}
                      onClick={() => setFormData({ ...formData, icon: iconOpt.value })}
                    >
                      <IconComp className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: formData.color }}
              >
                {(() => {
                  const PreviewIcon = getIconComponent(formData.icon);
                  return <PreviewIcon className="h-4 w-4 text-white" />;
                })()}
              </div>
              <span className="font-medium">{formData.name || "Podgląd kategorii"}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isLoading}>
              Anuluj
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Zapisywanie..." : editingCategory ? "Zapisz zmiany" : "Dodaj kategorię"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog usuwania */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć kategorię?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć kategorię &quot;{deletingCategory?.name}&quot;?
              {deletingCategory && deletingCategory._count.tasks > 0 && (
                <span className="block mt-2 text-orange-600">
                  Uwaga: Ta kategoria zawiera {deletingCategory._count.tasks} zadań.
                  Zadania nie zostaną usunięte, ale stracą przypisaną kategorię.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {isLoading ? "Usuwanie..." : "Usuń kategorię"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

