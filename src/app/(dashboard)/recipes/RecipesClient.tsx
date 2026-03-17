"use client";

import { useState, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecipeFilters } from "@/hooks/useRecipeFilters";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  Plus,
  Clock,
  Users,
  Heart,
  MoreVertical,
  Trash2,
  Edit,
  ChefHat,
  Filter,
  ArrowUpDown,
  Package,
  TrendingUp,
  ExternalLink,
  Copy,
  Download,
  CheckSquare,
  Square,
  X,
  FolderOpen,
  GitBranch,
  Share2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPBadge } from "@/components/gamification/XPBadge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { RecipeIngredient, RecipeStep, FavoriteRecipe, StepIngredient } from "@prisma/client";
import { cn } from "@/lib/utils";
import { type RecipeData } from "@/types/recipe";
import { RecipeDetailDialog } from "@/components/recipes/RecipeDetailDialog";
import { ManageIngredientsDialog } from "@/components/recipes/ManageIngredientsDialog";
import { RecipeEmptyState } from "@/components/recipes/RecipeEmptyState";
import { RecipeAvailabilityCheck } from "@/components/recipes/RecipeAvailabilityCheck";
import { CookableRecipesDialog } from "@/components/recipes/CookableRecipesDialog";
import { useCookableNotifications } from "@/hooks/useCookableNotifications";
import Link from "next/link";
import { categoryLabels, difficultyLabels, formatTime } from "@/lib/recipe-utils";
import { calculateRecipeXP } from "@/lib/recipe-xp";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { useSoundEffects } from "@/lib/sound-effects";
import { checkAndNotifyAchievementProgress } from "@/lib/achievement-notifications";
// NEW: Must Have Features
import { SmartRecipeSearch } from "@/components/recipes/SmartRecipeSearch";
import { RecipeWizardDialog } from "@/components/recipes/RecipeWizardDialog";
import { MultiImportDialog } from "@/components/recipes/MultiImportDialog";
import { RecipeVariationsDialog } from "@/components/recipes/RecipeVariationsDialog";
import { CreateVariationDialog } from "@/components/recipes/CreateVariationDialog";
import { SmartFilters } from "@/components/recipes/SmartFilters";
import { CookingMode } from "@/components/recipes/CookingMode";
import { ShareRecipe } from "@/components/recipes/ShareRecipe";
import { RecipeQuickRating } from "@/components/recipes/RecipeQuickRating";
import { applySmartFilters, type SmartFilterCriteria, getSeasonalTag, seasonalTags } from "@/lib/seasonal-tags";

type RecipeIngredientWithRelations = RecipeIngredient & {
  stepIngredients: StepIngredient[];
};

type RecipeStepWithRelations = RecipeStep & {
  stepIngredients: (StepIngredient & {
    ingredient: RecipeIngredient;
  })[];
};

// RecipeWithRelations extends RecipeData with additional relations
type RecipeWithRelations = RecipeData & {
  ingredients: RecipeIngredientWithRelations[];
  steps: RecipeStepWithRelations[];
  createdBy: { id: string; name: string | null };
  favorites: FavoriteRecipe[];
  avgRating?: number;
};

interface RecipesClientProps {
  recipes: RecipeWithRelations[];
  currentUserId: string;
  inventoryItems?: { name: string; quantity: number; unit: string | null }[];
}

export function RecipesClient({ recipes: initialRecipes, currentUserId, inventoryItems = [] }: RecipesClientProps) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce 300ms
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [quickFilter, setQuickFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all"); // all, 4+, 3+
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewingRecipe, setViewingRecipe] = useState<RecipeWithRelations | null>(null);
  const [manageIngredientsOpen, setManageIngredientsOpen] = useState(false);
  // Wizard and Import states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardRecipe, setWizardRecipe] = useState<RecipeWithRelations | null>(null);

  // Recipe Variations states
  const [createVariationRecipe, setCreateVariationRecipe] = useState<RecipeWithRelations | null>(null);
  const [isCreateVariationOpen, setIsCreateVariationOpen] = useState(false);
  const [variationMetadata, setVariationMetadata] = useState<{variationName: string; description?: string} | null>(null);
  const [isVariationWizardOpen, setIsVariationWizardOpen] = useState(false);

  // Smart Filters states
  const [smartFilterCriteria, setSmartFilterCriteria] = useState<SmartFilterCriteria>({});

  // Cooking Mode states
  const [cookingModeRecipe, setCookingModeRecipe] = useState<RecipeWithRelations | null>(null);
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);

  // Bulk Actions states
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  // Collections
  type Collection = {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    isShared: boolean;
    _count: { recipes: number };
    recipes?: { id: string; recipe: { id: string; name: string; image: string | null } }[];
  };

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCollectionsDialogOpen, setIsCollectionsDialogOpen] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionIcon, setNewCollectionIcon] = useState("📁");
  const [newCollectionColor, setNewCollectionColor] = useState("#3B82F6");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // Hook do powiadomień o nowych możliwościach
  useCookableNotifications();

  // Preload collections for dropdown menu
  const preloadCollections = () => {
    if (collections.length === 0 && !isLoadingCollections) {
      loadCollections();
    }
  };

  // Gamification hooks
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();
  const { playSound } = useSoundEffects();

  // Import na górze pliku
  // import { checkAndNotifyAchievementProgress } from '@/lib/achievement-notifications';

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => searchInputRef.current?.focus(),
    onNew: () => setIsWizardOpen(true),
    enabled: !isWizardOpen && !viewingRecipe,
  });

  // Użyj custom hooka do filtrowania i sortowania
  let filteredRecipes = useRecipeFilters(recipes, {
    searchQuery: debouncedSearchQuery,
    categoryFilter,
    difficultyFilter,
    quickFilter,
    ratingFilter,
    sortBy,
  });

  // Apply smart filters
  filteredRecipes = applySmartFilters(filteredRecipes, smartFilterCriteria);

  // Load collections when dialog opens
  const loadCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const response = await fetch('/api/recipes/collections');
      if (response.ok) {
        const data = await response.json();
        setCollections(data.collections || []);
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      toast.error('Nie udało się załadować kolekcji');
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Nazwa kolekcji jest wymagana');
      return;
    }

    setIsCreatingCollection(true);
    try {
      const response = await fetch('/api/recipes/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          icon: newCollectionIcon,
          color: newCollectionColor,
          isShared: false,
        }),
      });

      if (response.ok) {
        const { collection } = await response.json();
        setCollections([collection, ...collections]);
        setNewCollectionName('');
        setNewCollectionIcon('📁');
        setNewCollectionColor('#3B82F6');
        toast.success(`Kolekcja "${collection.name}" została utworzona`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Nie udało się utworzyć kolekcji');
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      toast.error('Wystąpił błąd podczas tworzenia kolekcji');
    } finally {
      setIsCreatingCollection(false);
    }
  };

  const handleDeleteCollection = async (collectionId: string, collectionName: string) => {
    if (!confirm(`Czy na pewno chcesz usunąć kolekcję "${collectionName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/recipes/collections/${collectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCollections(collections.filter(c => c.id !== collectionId));
        toast.success('Kolekcja została usunięta');
      } else {
        toast.error('Nie udało się usunąć kolekcji');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast.error('Wystąpił błąd podczas usuwania kolekcji');
    }
  };

  const handleAddToCollection = async (recipeId: string, collectionId: string) => {
    try {
      const response = await fetch(`/api/recipes/collections/${collectionId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId }),
      });

      if (response.ok) {
        toast.success('Przepis dodany do kolekcji');
        // Reload collections to update counts
        loadCollections();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Nie udało się dodać przepisu');
      }
    } catch (error) {
      console.error('Error adding to collection:', error);
      toast.error('Wystąpił błąd');
    }
  };

  const handleToggleFavorite = async (recipe: RecipeWithRelations) => {
    const isFavorite = (recipe.favorites?.length || 0) > 0;

    try {
      const response = await fetch(`/api/recipes/${recipe.id}/favorite`, {
        method: isFavorite ? "DELETE" : "POST",
      });

      if (response.ok) {
        setRecipes(
          recipes.map((r) =>
            r.id === recipe.id
              ? {
                  ...r,
                  favorites: isFavorite
                    ? []
                    : [{ id: "temp", userId: currentUserId, recipeId: recipe.id, createdAt: new Date() }],
                }
              : r
          )
        );
        toast.success(isFavorite ? "Usunięto z ulubionych" : "Dodano do ulubionych");
      }
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRecipes(recipes.filter((r) => r.id !== id));
        toast.success("Przepis został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć przepisu");
    }
  };

  const handleDuplicate = async (recipe: RecipeWithRelations) => {
    try {
      const response = await fetch(`/api/recipes/${recipe.id}/duplicate`, {
        method: "POST",
      });

      if (response.ok) {
        const { recipe: duplicatedRecipe } = await response.json();

        // Konwertuj do pełnego RecipeWithRelations
        const fullRecipe: RecipeWithRelations = {
          ...duplicatedRecipe,
          ingredients: duplicatedRecipe.ingredients as RecipeIngredientWithRelations[],
          steps: duplicatedRecipe.steps as RecipeStepWithRelations[],
          createdBy: { id: currentUserId, name: null },
          favorites: [],
        };

        setRecipes([fullRecipe, ...recipes]);
        toast.success(`Przepis został zduplikowany: ${duplicatedRecipe.name}`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się zduplikować przepisu");
      }
    } catch (error) {
      console.error("Error duplicating recipe:", error);
      toast.error("Wystąpił błąd podczas duplikacji");
    }
  };

  const handleRecipeCreated = (newRecipe: RecipeData) => {
    // Konwertuj do pełnego RecipeWithRelations z domyślnymi wartościami
    const fullRecipe: RecipeWithRelations = {
      ...newRecipe,
      ingredients: (newRecipe.ingredients || []) as RecipeIngredientWithRelations[],
      steps: (newRecipe.steps || []) as RecipeStepWithRelations[],
      createdBy: newRecipe.createdBy || { id: currentUserId, name: null },
      favorites: newRecipe.favorites || [],
    };

    setRecipes([fullRecipe, ...recipes]);
    setWizardRecipe(null);

    // 🎮 Gamification: Show XP reward for creating recipe
    const xpEarned = calculateRecipeXP(newRecipe);
    showFlyingXP(xpEarned);
    playSound('xp-earn');

    // Sprawdź progress osiągnięć związanych z przepisami
    setTimeout(() => {
      checkAndNotifyAchievementProgress('userId', ['RECIPES_ADDED'])
        .catch(err => console.error('Achievement notification error:', err));
    }, 500);
  };

  const handleRecipeUpdated = (updatedRecipe: RecipeData) => {
    // Konwertuj do pełnego RecipeWithRelations
    const fullRecipe: RecipeWithRelations = {
      ...updatedRecipe,
      ingredients: (updatedRecipe.ingredients || []) as RecipeIngredientWithRelations[],
      steps: (updatedRecipe.steps || []) as RecipeStepWithRelations[],
      createdBy: updatedRecipe.createdBy || { id: currentUserId, name: null },
      favorites: updatedRecipe.favorites || [],
    };

    setRecipes(recipes.map((r) => (r.id === fullRecipe.id ? fullRecipe : r)));
    setWizardRecipe(null);
  };

  // Bulk Actions handlers
  const toggleBulkMode = () => {
    setIsBulkMode(!isBulkMode);
    setSelectedRecipes(new Set());
  };

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipes);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipes(newSelected);
  };

  const selectAll = () => {
    if (selectedRecipes.size === filteredRecipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(filteredRecipes.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRecipes.size === 0) return;

    const confirmDelete = window.confirm(
      `Czy na pewno chcesz usunąć ${selectedRecipes.size} przepisów? Ta operacja jest nieodwracalna.`
    );

    if (!confirmDelete) return;

    try {
      const deletePromises = Array.from(selectedRecipes).map(id =>
        fetch(`/api/recipes/${id}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      setRecipes(recipes.filter(r => !selectedRecipes.has(r.id)));
      setSelectedRecipes(new Set());
      toast.success(`Usunięto ${selectedRecipes.size} przepisów`);
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Nie udało się usunąć wszystkich przepisów");
    }
  };

  const handleBulkExport = async () => {
    if (selectedRecipes.size === 0) return;

    try {
      const selectedRecipesData = recipes.filter(r => selectedRecipes.has(r.id));
      const dataStr = JSON.stringify(selectedRecipesData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `przepisy_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Wyeksportowano ${selectedRecipes.size} przepisów`);
    } catch (error) {
      console.error("Bulk export error:", error);
      toast.error("Nie udało się wyeksportować przepisów");
    }
  };

  const handleCreateVariation = (recipe: RecipeWithRelations) => {
    setCreateVariationRecipe(recipe);
    setIsCreateVariationOpen(true);
  };

  const handleVariationMetadataSubmit = (data: {variationName: string; description?: string}) => {
    setVariationMetadata(data);
    setIsCreateVariationOpen(false);
    setIsVariationWizardOpen(true);
  };

  const handleVariationRecipeCreated = async (recipeData: RecipeData) => {
    if (!variationMetadata || !createVariationRecipe) return;

    try {
      const res = await fetch(`/api/recipes/${createVariationRecipe.id}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variationName: variationMetadata.variationName,
          description: variationMetadata.description,
          recipeData,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nie udało się utworzyć wariantu");
      }

      await res.json(); // Parse response
      toast.success("Wariant przepisu został utworzony!");

      // Reload recipes to show the new variation
      // Można tutaj dodać nowy przepis do listy

      // Reset states
      setIsVariationWizardOpen(false);
      setCreateVariationRecipe(null);
      setVariationMetadata(null);
    } catch (error) {
      console.error("Error creating variation:", error);
      toast.error(
        error instanceof Error ? error.message : "Błąd podczas tworzenia wariantu"
      );
    }
  };

  const handleApplySmartFilters = (criteria: SmartFilterCriteria) => {
    setSmartFilterCriteria(criteria);
  };

  const handleStartCookingMode = (recipe: RecipeWithRelations) => {
    setCookingModeRecipe(recipe);
    setIsCookingModeOpen(true);
  };

  const countActiveSmartFilters = (): number => {
    let count = 0;
    if (smartFilterCriteria.season) count++;
    if (smartFilterCriteria.dietary && smartFilterCriteria.dietary.length > 0) count += smartFilterCriteria.dietary.length;
    if (smartFilterCriteria.timeRange) count++;
    if (smartFilterCriteria.mealType) count++;
    if (smartFilterCriteria.difficulty) count++;
    if (smartFilterCriteria.servings) count++;
    if (smartFilterCriteria.calories) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Przepisy</h1>
          <p className="text-muted-foreground">
            {recipes.length} przepisów w kolekcji
          </p>
        </div>
        <div className="flex gap-2">
          {!isBulkMode && (
            <>
              <CookableRecipesDialog />
              <Button variant="outline" asChild>
                <Link href="/recipes/statistics">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Statystyki
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCollectionsDialogOpen(true);
                  loadCollections();
                }}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Kolekcje
              </Button>
              <Button variant="outline" onClick={() => setManageIngredientsOpen(true)}>
                <Package className="mr-2 h-4 w-4" />
                Składniki
              </Button>
              <MultiImportDialog
                onImport={(importedRecipe) => {
                  setWizardRecipe(importedRecipe as unknown as RecipeWithRelations);
                  setIsWizardOpen(true);
                  toast.success("Przepis zaimportowany! Sprawdź dane i zapisz.");
                }}
                triggerButton={
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Importuj przepis
                  </Button>
                }
              />
              <Button onClick={() => setIsWizardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nowy przepis
              </Button>
              <Button variant="outline" onClick={toggleBulkMode}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Zaznacz wiele
              </Button>
            </>
          )}
          {isBulkMode && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-md">
                <CheckSquare className="h-4 w-4" />
                <span className="font-medium">{selectedRecipes.size} zaznaczonych</span>
              </div>
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedRecipes.size === filteredRecipes.length ? "Odznacz wszystkie" : "Zaznacz wszystkie"}
              </Button>
              {selectedRecipes.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={handleBulkExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Eksportuj ({selectedRecipes.size})
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń ({selectedRecipes.size})
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={toggleBulkMode}>
                <X className="mr-2 h-4 w-4" />
                Anuluj
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtry */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* NEW: Smart Recipe Search */}
          <div className="flex-1">
            <SmartRecipeSearch
              ref={searchInputRef}
              placeholder="Szukaj przepisów, składników, tagów..."
              onRecipeSelect={(recipeId) => {
                const recipe = recipes.find(r => r.id === recipeId);
                if (recipe) {
                  setViewingRecipe(recipe);
                }
              }}
            />
          </div>
          {/* NEW: Smart Filters */}
          <SmartFilters
            onApplyFilters={handleApplySmartFilters}
            activeFiltersCount={countActiveSmartFilters()}
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Kategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Trudność" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="EASY">Łatwy</SelectItem>
              <SelectItem value="MEDIUM">Średni</SelectItem>
              <SelectItem value="HARD">Trudny</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sortuj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Najnowsze</SelectItem>
              <SelectItem value="oldest">Najstarsze</SelectItem>
              <SelectItem value="top-rated">⭐ Najwyżej oceniane</SelectItem>
              <SelectItem value="alphabetical">A-Z</SelectItem>
              <SelectItem value="alphabetical-desc">Z-A</SelectItem>
              <SelectItem value="popular">Popularne</SelectItem>
              <SelectItem value="time-asc">Czas: rosnąco</SelectItem>
              <SelectItem value="time-desc">Czas: malejąco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Szybkie filtry */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quickFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickFilter("all")}
          >
            Wszystkie
          </Button>
          <Button
            variant={quickFilter === "quick" ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickFilter("quick")}
          >
            ⚡ Szybkie (&lt;30 min)
          </Button>
          <Button
            variant={quickFilter === "vegetarian" ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickFilter("vegetarian")}
          >
            🥬 Wegetariańskie
          </Button>
          <Button
            variant={quickFilter === "vegan" ? "default" : "outline"}
            size="sm"
            onClick={() => setQuickFilter("vegan")}
          >
            🌱 Wegańskie
          </Button>
          <Button
            variant={ratingFilter === "4+" ? "default" : "outline"}
            size="sm"
            onClick={() => setRatingFilter(ratingFilter === "4+" ? "all" : "4+")}
          >
            ⭐ 4+ gwiazdek
          </Button>
          <Button
            variant={ratingFilter === "3+" ? "default" : "outline"}
            size="sm"
            onClick={() => setRatingFilter(ratingFilter === "3+" ? "all" : "3+")}
          >
            ⭐ 3+ gwiazdek
          </Button>
        </div>
      </div>

      {/* Lista przepisów */}
      {filteredRecipes.length === 0 ? (
        <RecipeEmptyState
          variant={recipes.length === 0 ? "no-recipes" : "no-results"}
          onCreateNew={() => setIsWizardOpen(true)}
          onClearFilters={() => {
            setSearchQuery("");
            setCategoryFilter("all");
            setDifficultyFilter("all");
            setQuickFilter("all");
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const isFavorite = (recipe.favorites?.length || 0) > 0;
            const difficulty = difficultyLabels[recipe.difficulty];
            const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

            return (
              <Card
                key={recipe.id}
                className={cn(
                  "relative overflow-hidden hover:shadow-lg transition-shadow",
                  isBulkMode ? "cursor-default" : "cursor-pointer",
                  isBulkMode && selectedRecipes.has(recipe.id) && "ring-2 ring-primary"
                )}
                onClick={() => {
                  if (isBulkMode) {
                    toggleRecipeSelection(recipe.id);
                  } else {
                    setViewingRecipe(recipe);
                  }
                }}
              >
                {/* Checkbox overlay w bulk mode */}
                {isBulkMode && (
                  <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleRecipeSelection(recipe.id)}
                    >
                      {selectedRecipes.has(recipe.id) ? (
                        <CheckSquare className="h-5 w-5" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                )}

                {recipe.image ? (
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{ backgroundImage: `url(${recipe.image})` }}
                  />
                ) : (
                  <div className="h-40 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <ChefHat className="h-16 w-16 text-orange-300" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold line-clamp-1">{recipe.name}</h3>
                      {recipe.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {recipe.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu onOpenChange={(open) => open && preloadCollections()}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setWizardRecipe(recipe);
                            setIsWizardOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edytuj
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(recipe);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Duplikuj
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateVariation(recipe);
                          }}
                        >
                          <GitBranch className="mr-2 h-4 w-4" />
                          Utwórz wariant
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartCookingMode(recipe);
                          }}
                        >
                          <ChefHat className="mr-2 h-4 w-4" />
                          Tryb gotowania
                        </DropdownMenuItem>

                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <FolderOpen className="mr-2 h-4 w-4" />
                            Dodaj do kolekcji
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {collections.length === 0 ? (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                Brak kolekcji
                              </div>
                            ) : (
                              collections.map((collection) => (
                                <DropdownMenuItem
                                  key={collection.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCollection(recipe.id, collection.id);
                                  }}
                                >
                                  <span className="mr-2">{collection.icon}</span>
                                  {collection.name}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(recipe.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {recipe.category && (
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[recipe.category] || recipe.category}
                      </Badge>
                    )}
                    <Badge variant="secondary" className={cn("text-xs", difficulty.color)}>
                      {difficulty.label}
                    </Badge>
                    {/* XP Badge - gamification (dynamic based on complexity) */}
                    <XPBadge xp={calculateRecipeXP(recipe)} size="sm" />
                    {/* Seasonal tag */}
                    {(() => {
                      const seasonalTag = getSeasonalTag(recipe.ingredients);
                      if (seasonalTag) {
                        const season = seasonalTags[seasonalTag];
                        return (
                          <Badge variant="outline" className={cn("text-xs", season.color)}>
                            {season.icon} {season.name}
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {recipe.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{recipe.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-2 border-t flex-col gap-2">
                  <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {totalTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(totalTime)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {recipe.servings}
                      </span>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(recipe);
                            }}
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4",
                                isFavorite && "fill-red-500 text-red-500"
                              )}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="w-full" onClick={(e) => e.stopPropagation()}>
                    <RecipeAvailabilityCheck
                      recipeId={recipe.id}
                      recipeName={recipe.name}
                      variant="badge"
                      className="w-full justify-center"
                    />
                  </div>
                  <div className="w-full flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <RecipeQuickRating recipeId={recipe.id} compact />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link href={`/recipes/${recipe.id}`} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Zobacz szczegółowo
                    </Link>
                  </Button>
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <div onClick={(e) => e.stopPropagation()}>
                      <RecipeVariationsDialog
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        onCreateVariation={() => handleCreateVariation(recipe)}
                      >
                        <Button variant="ghost" size="sm" className="w-full">
                          <GitBranch className="h-4 w-4 mr-2" />
                          Warianty
                        </Button>
                      </RecipeVariationsDialog>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartCookingMode(recipe);
                      }}
                      className="w-full"
                    >
                      <ChefHat className="h-4 w-4 mr-2" />
                      Gotowanie
                    </Button>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ShareRecipe
                        recipeId={recipe.id}
                        recipeName={recipe.name}
                        isPublic={recipe.isPublic}
                      >
                        <Button variant="ghost" size="sm" className="w-full">
                          <Share2 className="h-4 w-4 mr-2" />
                          Udostępnij
                        </Button>
                      </ShareRecipe>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recipe Wizard Dialog - Tworzenie i edycja przepisów */}
      <RecipeWizardDialog
        open={isWizardOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsWizardOpen(false);
            setWizardRecipe(null);
          }
        }}
        recipe={wizardRecipe || undefined}
        onRecipeCreated={handleRecipeCreated}
        onRecipeUpdated={handleRecipeUpdated}
      />

      {/* Dialog szczegółów */}
      <RecipeDetailDialog
        recipe={viewingRecipe}
        onClose={() => setViewingRecipe(null)}
        onToggleFavorite={handleToggleFavorite}
        isFavorite={viewingRecipe ? (viewingRecipe.favorites?.length || 0) > 0 : false}
        inventoryItems={inventoryItems}
      />

      {/* Dialog zarządzania składnikami */}
      <ManageIngredientsDialog
        open={manageIngredientsOpen}
        onOpenChange={setManageIngredientsOpen}
      />

      {/* Dialog Kolekcje */}
      <Dialog open={isCollectionsDialogOpen} onOpenChange={setIsCollectionsDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Kolekcje przepisów
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Create New Collection */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Utwórz nową kolekcję</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nazwa kolekcji..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isCreatingCollection) {
                        handleCreateCollection();
                      }
                    }}
                  />
                  <Input
                    placeholder="📁"
                    value={newCollectionIcon}
                    onChange={(e) => setNewCollectionIcon(e.target.value)}
                    className="w-20"
                  />
                  <Input
                    type="color"
                    value={newCollectionColor}
                    onChange={(e) => setNewCollectionColor(e.target.value)}
                    className="w-20"
                  />
                  <Button
                    onClick={handleCreateCollection}
                    disabled={isCreatingCollection || !newCollectionName.trim()}
                  >
                    {isCreatingCollection ? "Tworzenie..." : "Utwórz"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Collections List */}
            {isLoadingCollections ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak kolekcji</p>
                <p className="text-sm">Utwórz swoją pierwszą kolekcję powyżej!</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {collections.map((collection) => (
                  <Card
                    key={collection.id}
                    className="overflow-hidden hover:shadow-md transition-shadow"
                    style={{ borderLeftColor: collection.color, borderLeftWidth: '4px' }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{collection.icon}</div>
                          <div>
                            <h3 className="font-semibold">{collection.name}</h3>
                            {collection.description && (
                              <p className="text-sm text-muted-foreground">
                                {collection.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary">
                                {collection._count.recipes} {collection._count.recipes === 1 ? 'przepis' : 'przepisów'}
                              </Badge>
                              {collection.isShared && (
                                <Badge variant="outline">Udostępniona</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCollection(collection.id, collection.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    {collection.recipes && collection.recipes.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="flex gap-2 overflow-x-auto">
                          {collection.recipes.slice(0, 5).map((cr) => (
                            <div
                              key={cr.id}
                              className="flex-shrink-0 w-20 h-20 rounded bg-muted flex items-center justify-center text-xs text-center p-1 overflow-hidden"
                              style={{
                                backgroundImage: cr.recipe.image ? `url(${cr.recipe.image})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }}
                            >
                              {!cr.recipe.image && (
                                <span className="line-clamp-3">{cr.recipe.name}</span>
                              )}
                            </div>
                          ))}
                          {collection._count.recipes > 5 && (
                            <div className="flex-shrink-0 w-20 h-20 rounded bg-muted flex items-center justify-center text-xs">
                              +{collection._count.recipes - 5}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}

            <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              💡 <strong>Wskazówka:</strong> Organizuj przepisy w kolekcje jak &quot;Ulubione desery&quot;, &quot;Szybkie obiady&quot; czy &quot;Święta&quot;.
              Możesz dodać przepis do kolekcji z menu ⋮ przy każdym przepisie.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCollectionsDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tworzenia wariantu przepisu - krok 1: metadata */}
      {createVariationRecipe && (
        <CreateVariationDialog
          open={isCreateVariationOpen}
          onOpenChange={setIsCreateVariationOpen}
          parentRecipeName={createVariationRecipe.name}
          onSubmit={handleVariationMetadataSubmit}
        />
      )}

      {/* Dialog tworzenia wariantu przepisu - krok 2: przepis */}
      {createVariationRecipe && variationMetadata && (
        <RecipeWizardDialog
          open={isVariationWizardOpen}
          onOpenChange={(open) => {
            setIsVariationWizardOpen(open);
            if (!open) {
              // Reset when closing
              setCreateVariationRecipe(null);
              setVariationMetadata(null);
            }
          }}
          recipe={{
            id: "",
            name: `${createVariationRecipe.name} - ${variationMetadata.variationName}`,
            description: createVariationRecipe.description,
            instructions: createVariationRecipe.instructions,
            image: createVariationRecipe.image,
            category: createVariationRecipe.category,
            prepTime: createVariationRecipe.prepTime,
            cookTime: createVariationRecipe.cookTime,
            restTime: createVariationRecipe.restTime,
            servings: createVariationRecipe.servings,
            difficulty: createVariationRecipe.difficulty,
            tags: createVariationRecipe.tags,
            allergens: createVariationRecipe.allergens,
            calories: createVariationRecipe.calories,
            protein: createVariationRecipe.protein,
            carbs: createVariationRecipe.carbs,
            fat: createVariationRecipe.fat,
            fiber: createVariationRecipe.fiber,
            isVegan: createVariationRecipe.isVegan,
            isVegetarian: createVariationRecipe.isVegetarian,
            isGlutenFree: createVariationRecipe.isGlutenFree,
            isDairyFree: createVariationRecipe.isDairyFree,
            cuisine: createVariationRecipe.cuisine,
            cookingMethod: createVariationRecipe.cookingMethod,
            ovenTemp: createVariationRecipe.ovenTemp,
            ovenMode: createVariationRecipe.ovenMode,
            source: createVariationRecipe.source,
            videoUrl: createVariationRecipe.videoUrl,
            tips: createVariationRecipe.tips,
            isPublic: createVariationRecipe.isPublic,
            ingredients: createVariationRecipe.ingredients.map((ing) => ({
              id: ing.id,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              optional: ing.optional,
              recipeId: ing.recipeId,
              globalIngredientId: ing.globalIngredientId,
              stepIngredients: ing.stepIngredients,
            })),
            steps: createVariationRecipe.steps.map((step) => ({
              id: step.id,
              content: step.content,
              order: step.order,
              duration: step.duration,
              temperature: step.temperature,
              image: step.image,
              tip: step.tip,
              isOptional: step.isOptional,
              recipeId: step.recipeId,
              stepIngredients: step.stepIngredients,
            })),
            householdId: createVariationRecipe.householdId,
            createdById: createVariationRecipe.createdById,
            createdAt: createVariationRecipe.createdAt,
            updatedAt: createVariationRecipe.updatedAt,
            totalTime: createVariationRecipe.totalTime,
            createdBy: createVariationRecipe.createdBy,
            favorites: [],
          }}
          onRecipeCreated={handleVariationRecipeCreated}
          onRecipeUpdated={handleVariationRecipeCreated}
        />
      )}

      {/* Cooking Mode Dialog */}
      {cookingModeRecipe && (
        <CookingMode
          open={isCookingModeOpen}
          onOpenChange={setIsCookingModeOpen}
          recipeName={cookingModeRecipe.name}
          steps={cookingModeRecipe.steps}
          servings={cookingModeRecipe.servings}
        />
      )}

      {/* Flying XP Animation */}
      <FlyingXPComponent />
    </div>
  );
}

