"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  Minus,
  Search,
  Package,
  AlertTriangle,
  Calendar,
  Trash2,
  Edit,
  ShoppingCart,
  Filter,
  RefreshCw,
  Scan,
  ChefHat,
  Book,
  History as HistoryIcon,
  Settings as SettingsIcon,
  BarChart3,
  Grid3x3,
  ShoppingBag,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { InventoryItem } from "@prisma/client";
import { format, differenceInDays, isPast } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ProductScannerDialog } from "@/components/inventory/ProductScannerDialog";
import { AddToInventoryDialog } from "@/components/inventory/AddToInventoryDialog";
import { RecipeSuggestionsDialog } from "@/components/inventory/RecipeSuggestionsDialog";
import { ManualProductDialog } from "@/components/inventory/ManualProductDialog";
import { InventoryRecipesDialog } from "@/components/inventory/InventoryRecipesDialog";
import { InventoryHistoryDialog } from "@/components/inventory/InventoryHistoryDialog";
import { InventoryNotificationSettings } from "@/components/inventory/InventoryNotificationSettings";
import { InventoryDashboard } from "@/components/inventory/InventoryDashboard";
import { FridgeView } from "@/components/inventory/FridgeView";
import { ShoppingAssistantDialog } from "@/components/inventory/ShoppingAssistantDialog";
import { ImageUpload } from "@/components/inventory/ImageUpload";
import { useInventoryNotifications } from "@/hooks/useInventoryNotifications";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { useSoundEffects } from "@/lib/sound-effects";

interface InventoryClientProps {
  items: InventoryItem[];
}

const UNITS = [
  { value: "szt", label: "sztuk" },
  { value: "kg", label: "kilogram" },
  { value: "g", label: "gram" },
  { value: "l", label: "litr" },
  { value: "ml", label: "mililitr" },
  { value: "opak", label: "opakowanie" },
  { value: "puszka", label: "puszka" },
  { value: "słoik", label: "słoik" },
  { value: "butelka", label: "butelka" },
  { value: "pęczek", label: "pęczek" },
  { value: "główka", label: "główka" },
  { value: "łyżka", label: "łyżka" },
  { value: "łyżeczka", label: "łyżeczka" },
  { value: "szczypta", label: "szczypta" },
  { value: "plaster", label: "plaster" },
  { value: "kromka", label: "kromka" },
  { value: "kostka", label: "kostka" },
  { value: "szkl", label: "szklanka" },
  { value: "garść", label: "garść" },
  { value: "ząbek", label: "ząbek" },
];

const categories = [
  { value: "dairy", label: "Nabiał" },
  { value: "meat", label: "Mięso" },
  { value: "vegetables", label: "Warzywa" },
  { value: "fruits", label: "Owoce" },
  { value: "grains", label: "Pieczywo i zboża" },
  { value: "canned", label: "Konserwy" },
  { value: "frozen", label: "Mrożonki" },
  { value: "spices", label: "Przyprawy" },
  { value: "beverages", label: "Napoje" },
  { value: "snacks", label: "Przekąski" },
  { value: "cleaning", label: "Środki czystości" },
  { value: "other", label: "Inne" },
];

const locations = [
  { value: "fridge", label: "Lodówka", icon: "🧊" },
  { value: "freezer", label: "Zamrażarka", icon: "❄️" },
  { value: "pantry", label: "Spiżarnia", icon: "🏠" },
  { value: "cabinet", label: "Szafka kuchenna", icon: "🗄️" },
  { value: "counter", label: "Blat kuchenny", icon: "🍽️" },
  { value: "cellar", label: "Piwnica", icon: "🪨" },
  { value: "other", label: "Inne", icon: "📦" },
];

const categoryLabels: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.value, c.label])
);

const locationLabels: Record<string, string> = Object.fromEntries(
  locations.map((l) => [l.value, l.label])
);

const locationIcons: Record<string, string> = Object.fromEntries(
  locations.map((l) => [l.value, l.icon])
);

const itemFormSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  quantity: z.number().min(0, "Ilość musi być >= 0"),
  unit: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  expiryDate: z.string().optional(),
  minQuantity: z.number().optional(),
  autoRestock: z.boolean().optional(),
  price: z.number().optional(), // Cena produktu
  imageUrl: z.string().optional(), // Zdjęcie produktu
});

type ItemFormData = z.infer<typeof itemFormSchema>;

export function InventoryClient({ items: initialItems }: InventoryClientProps) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stany dla skanowania produktów
  const [showScannerDialog, setShowScannerDialog] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{
    barcode: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    source: string;
  } | null>(null);
  const [showAddFromScanDialog, setShowAddFromScanDialog] = useState(false);
  const [showRecipeSuggestions, setShowRecipeSuggestions] = useState(false);
  const [showManualProductDialog, setShowManualProductDialog] = useState(false);
  const [manualProductBarcode, setManualProductBarcode] = useState<string | undefined>();

  // State dla history dialog
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<{ id: string; name: string } | null>(null);

  // State dla recipes dialog
  const [showRecipesDialog, setShowRecipesDialog] = useState(false);
  const [selectedItemForRecipes, setSelectedItemForRecipes] = useState<{ id: string; name: string } | null>(null);

  // Cache dla liczby przepisów
  const [recipeCounts, setRecipeCounts] = useState<Record<string, number>>({});

  // Loading state dla quick update (debouncing)
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  // State dla notification settings
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // State dla tabs (widoki)
  const [activeTab, setActiveTab] = useState("list");

  // State dla Shopping Assistant
  const [showShoppingAssistant, setShowShoppingAssistant] = useState(false);

  // Gamification hooks
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();
  const { playSound } = useSoundEffects();

  // Hook do powiadomień o stanie inwentarza
  useInventoryNotifications();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSearch: () => {
      const searchInput = document.querySelector('input[placeholder="Szukaj produktów..."]') as HTMLInputElement;
      searchInput?.focus();
    },
    onNew: () => {
      openCreateDialog();
    },
  });

  // Załaduj zapisane preferencje sortowania
  useEffect(() => {
    try {
      const savedSort = localStorage.getItem("inventory-sort-preference");
      if (savedSort) {
        setSortBy(savedSort);
      }
    } catch (error) {
      console.error("Error loading sort preference:", error);
    }
  }, []);

  // Zapisuj preferencje sortowania
  useEffect(() => {
    try {
      localStorage.setItem("inventory-sort-preference", sortBy);
    } catch (error) {
      console.error("Error saving sort preference:", error);
    }
  }, [sortBy]);

  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: "",
      quantity: 1,
      unit: "",
      category: "other",
      location: "pantry",
      expiryDate: "",
      minQuantity: undefined,
      autoRestock: false,
    },
  });

  // Filtrowanie
  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesLocation = locationFilter === "all" || item.location === locationFilter;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  // Sortowanie
  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "quantity-asc":
        return a.quantity - b.quantity;
      case "quantity-desc":
        return b.quantity - a.quantity;
      case "expiry-asc":
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      case "expiry-desc":
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Grupowanie po kategorii
  const groupedItems = sortedItems.reduce((acc, item) => {
    const category = item.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Wykrywanie duplikatów (ten sam produkt wielokrotnie)
  const getDuplicateCount = (itemName: string): number => {
    return items.filter(i => i.name.toLowerCase() === itemName.toLowerCase()).length;
  };

  const getDuplicateIndex = (item: InventoryItem): number => {
    const duplicates = items
      .filter(i => i.name.toLowerCase() === item.name.toLowerCase())
      .sort((a, b) => {
        // Sortuj po dacie ważności (najkrótszy termin pierwszy)
        if (a.expiryDate && b.expiryDate) {
          return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        if (a.expiryDate) return -1;
        if (b.expiryDate) return 1;
        return 0;
      });
    return duplicates.findIndex(d => d.id === item.id) + 1;
  };

  // Statystyki
  const lowStockItems = items.filter(
    (item) => item.minQuantity && item.quantity <= item.minQuantity
  );
  const expiringItems = items.filter((item) => {
    if (!item.expiryDate) return false;
    const daysUntil = differenceInDays(new Date(item.expiryDate), new Date());
    return daysUntil <= 7 && daysUntil >= 0;
  });
  const expiredItems = items.filter(
    (item) => item.expiryDate && isPast(new Date(item.expiryDate))
  );

  // Pobierz liczbę przepisów dla produktu
  const fetchRecipeCount = async (itemId: string) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/recipes`);
      if (response.ok) {
        const data = await response.json();
        setRecipeCounts(prev => ({ ...prev, [itemId]: data.count || 0 }));
      }
    } catch (error) {
      console.error("Error fetching recipe count:", error);
    }
  };

  // Szybka aktualizacja ilości z debouncing
  const quickUpdateQuantity = async (itemId: string, newQuantity: number) => {
    // Zapobiegaj wielokrotnym kliknięciom (debouncing)
    if (updatingItems.has(itemId)) {
      return;
    }

    // Znajdź obecną ilość
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const oldQuantity = item.quantity;

    try {
      // Dodaj do updating
      setUpdatingItems(prev => new Set(prev).add(itemId));

      const response = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        toast.success("Ilość zaktualizowana");

        // 🎮 Gamification: Reward XP for managing inventory
        showFlyingXP(5);
        playSound('xp-earn');

        // ✨ AUTO-LOGGING do historii
        try {
          await fetch(`/api/inventory/${itemId}/history`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: newQuantity > oldQuantity ? 'ADDED' : 'USED',
              quantityChange: newQuantity - oldQuantity,
              source: 'manual',
              notes: 'Ręczna aktualizacja przez użytkownika',
            }),
          });
        } catch (historyError) {
          // Silent fail - nie chcemy blokować UI jeśli historia nie zadziała
          console.warn("Failed to log history:", historyError);
        }
      } else {
        toast.error("Nie udało się zaktualizować");
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Wystąpił błąd");
    } finally {
      // Usuń z updating po 500ms (debounce)
      setTimeout(() => {
        setUpdatingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 500);
    }
  };

  const addToShopping = async (item: InventoryItem) => {
    try {
      const response = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          unit: item.unit,
          note: "Uzupełnienie zapasów",
        }),
      });
      if (response.ok) {
        toast.success(`Dodano "${item.name}" do listy zakupów`);
      }
    } catch (error) {
      console.error("Error adding to shopping:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const openCreateDialog = () => {
    form.reset({
      name: "",
      quantity: 1,
      unit: "",
      category: "other",
      location: "pantry",
      expiryDate: "",
      minQuantity: undefined,
      autoRestock: false,
      imageUrl: undefined,
    });
    setEditingItem(null);
    setShowFormDialog(true);
  };

  const openEditDialog = (item: InventoryItem) => {
    console.log("Opening edit dialog for item:", item);
    console.log("Category:", item.category, "Location:", item.location);

    form.reset({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || "",
      category: item.category || "other",
      location: item.location || "pantry",
      expiryDate: item.expiryDate
        ? format(new Date(item.expiryDate), "yyyy-MM-dd")
        : "",
      minQuantity: item.minQuantity || undefined,
      autoRestock: item.autoRestock || false,
      price: item.price || undefined,
    });

    console.log("Form values after reset:", form.getValues());

    setEditingItem(item);
    setShowFormDialog(true);
  };

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    try {
      const url = editingItem ? `/api/inventory/${editingItem.id}` : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          expiryDate: data.expiryDate || null,
        }),
      });

      if (response.ok) {
        const savedItem = await response.json();
        if (editingItem) {
          setItems(items.map((i) => (i.id === savedItem.id ? savedItem : i)));
          toast.success("Produkt zaktualizowany");
        } else {
          setItems([savedItem, ...items]);
          toast.success("Produkt dodany");
        }
        setShowFormDialog(false);
      } else {
        toast.error("Nie udało się zapisać");
      }
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItemId) return;
    try {
      const response = await fetch(`/api/inventory/${deleteItemId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setItems(items.filter((i) => i.id !== deleteItemId));
        toast.success("Produkt usunięty");
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setDeleteItemId(null);
    }
  };

  const getExpiryStatus = (expiryDate: Date | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: "Przeterminowany", color: "bg-red-100 text-red-800" };
    if (days <= 3) return { label: `${days} dni`, color: "bg-red-100 text-red-800" };
    if (days <= 7) return { label: `${days} dni`, color: "bg-yellow-100 text-yellow-800" };
    return null;
  };

  const addAllLowStockToShopping = async () => {
    try {
      const response = await fetch("/api/inventory/add-low-stock-to-shopping", {
        method: "POST",
      });
      if (response.ok) {
        const { added, skipped } = await response.json();
        if (added > 0) {
          toast.success(`Dodano ${added} produktów do listy zakupów`);
        } else if (skipped > 0) {
          toast.info("Wszystkie produkty są już na liście zakupów");
        } else {
          toast.info("Brak produktów do uzupełnienia");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Wystąpił błąd");
    }
  };

  // Obsługa skanowania produktu
  const handleScan = async (barcode: string) => {
    try {
      const response = await fetch("/api/products/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      });

      if (!response.ok) {
        // Produkt nie znaleziony - pokaż dialog ręcznego dodania
        setManualProductBarcode(barcode);
        setShowManualProductDialog(true);
        setShowScannerDialog(false);
        toast.info("Produkt nie znaleziony w bazie. Dodaj go ręcznie.");
        return;
      }

      const data = await response.json();

      console.log("Scan response:", data);

      if (!data.success || !data.product) {
        // Produkt nie znaleziony - pokaż dialog ręcznego dodania
        setManualProductBarcode(barcode);
        setShowManualProductDialog(true);
        setShowScannerDialog(false);
        toast.info("Produkt nie znaleziony w bazie. Dodaj go ręcznie.");
        return;
      }

      console.log("Setting scanned product:", data.product);

      // Dodaj source jeśli nie istnieje
      const productWithSource = {
        ...data.product,
        source: data.product.source || 'scan'
      };

      setScannedProduct(productWithSource);
      setShowAddFromScanDialog(true);

      toast.success(`Znaleziono: ${data.product.name}`);
    } catch (error) {
      console.error("Error scanning product:", error);
      toast.error("Wystąpił błąd podczas skanowania");
    }
  };

  const handleAddFromScanSuccess = () => {
    // Odśwież listę produktów
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zapasy</h1>
          <p className="text-muted-foreground">
            Zarządzaj produktami w swoim domu
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowNotificationSettings(true)}
            title="Ustawienia powiadomień"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowShoppingAssistant(true)}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Asystent Zakupów
          </Button>
          <Button variant="outline" onClick={() => setShowRecipeSuggestions(true)}>
            <ChefHat className="mr-2 h-4 w-4" />
            Co mogę ugotować?
          </Button>
          {lowStockItems.length > 0 && (
            <Button variant="outline" onClick={addAllLowStockToShopping}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              Uzupełnij zapasy ({lowStockItems.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowScannerDialog(true)}>
            <Scan className="mr-2 h-4 w-4" />
            Skanuj produkt
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj produkt
          </Button>
        </div>
      </div>

      {/* Tabs dla różnych widoków */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="fridge" className="gap-2">
            <Grid3x3 className="h-4 w-4" />
            Widok Lodówki
          </TabsTrigger>
        </TabsList>

        {/* TAB: Lista produktów */}
        <TabsContent value="list" className="space-y-4">
          {/* Alerts */}
          {(lowStockItems.length > 0 || expiredItems.length > 0 || expiringItems.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {lowStockItems.length > 0 && (
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Kończące się zapasy</p>
                      <p className="text-sm text-yellow-600">{lowStockItems.length} produktów</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {expiringItems.length > 0 && (
                <Card className="border-orange-300 bg-orange-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Calendar className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">Wkrótce wygasną</p>
                      <p className="text-sm text-orange-600">{expiringItems.length} produktów (7 dni)</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              {expiredItems.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Przeterminowane</p>
                      <p className="text-sm text-red-600">{expiredItems.length} produktów</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj produktów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sortuj" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Nazwa A-Z</SelectItem>
            <SelectItem value="name-desc">Nazwa Z-A</SelectItem>
            <SelectItem value="quantity-asc">Ilość rosnąco</SelectItem>
            <SelectItem value="quantity-desc">Ilość malejąco</SelectItem>
            <SelectItem value="expiry-asc">Wygasa najszybciej</SelectItem>
            <SelectItem value="expiry-desc">Wygasa najpóźniej</SelectItem>
            <SelectItem value="newest">Ostatnio dodane</SelectItem>
            <SelectItem value="oldest">Najstarsze</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie kategorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <Package className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Lokalizacja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie miejsca</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.value} value={loc.value}>
                {loc.icon} {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Items */}
      {sortedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <p className="text-muted-foreground">Brak produktów do wyświetlenia</p>
            <Button variant="link" onClick={openCreateDialog}>
              Dodaj pierwszy produkt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems)
            .sort(([a], [b]) => (categoryLabels[a] || a).localeCompare(categoryLabels[b] || b))
            .map(([category, categoryItems]) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {categoryLabels[category] || category}
                    <Badge variant="secondary" className="ml-2">
                      {categoryItems.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {categoryItems.map((item) => {
                      const expiryStatus = getExpiryStatus(item.expiryDate);
                      const isLowStock = item.minQuantity && item.quantity <= item.minQuantity;

                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between py-3 gap-4",
                            isLowStock && "bg-yellow-50 -mx-4 px-4",
                            expiryStatus?.color.includes("red") && "bg-red-50 -mx-4 px-4"
                          )}
                        >
                          {/* Zdjęcie produktu */}
                          {item.imageUrl && (
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden border bg-muted flex-shrink-0">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {item.name}
                                {getDuplicateCount(item.name) > 1 && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    #{getDuplicateIndex(item)}
                                  </span>
                                )}
                              </span>
                              {/* Termin ważności */}
                              {item.expiryDate && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(item.expiryDate), "dd.MM.yyyy")}
                                </Badge>
                              )}
                              {item.location && (
                                <Badge variant="outline" className="text-gray-600 border-gray-300">
                                  {locationIcons[item.location] || "📦"} {locationLabels[item.location] || item.location}
                                </Badge>
                              )}
                              {isLowStock && (
                                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                  Mało
                                </Badge>
                              )}
                              {item.autoRestock && (
                                <Badge variant="outline" className="text-blue-700 border-blue-300">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Auto
                                </Badge>
                              )}
                              {expiryStatus && (
                                <Badge className={expiryStatus.color}>
                                  {expiryStatus.label}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {/* Quick quantity update z przyciskami +/- */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    const newQty = Math.max(0, item.quantity - 1);
                                    void quickUpdateQuantity(item.id, newQty);
                                  }}
                                  disabled={updatingItems.has(item.id)}
                                  title="Zmniejsz ilość"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className={cn(
                                  "font-medium min-w-[80px] text-center transition-all",
                                  updatingItems.has(item.id) && "opacity-50"
                                )}>
                                  {item.quantity} {item.unit}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    const newQty = item.quantity + 1;
                                    void quickUpdateQuantity(item.id, newQty);
                                  }}
                                  disabled={updatingItems.has(item.id)}
                                  title="Zwiększ ilość"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              {item.expiryDate && !expiryStatus && (
                                <span className="mt-1 block">
                                  Ważne do {format(new Date(item.expiryDate), "d MMM yyyy", { locale: pl })}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedItemForHistory({ id: item.id, name: item.name });
                                setShowHistoryDialog(true);
                              }}
                              title="Zobacz historię"
                            >
                              <HistoryIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItemForRecipes({ id: item.id, name: item.name });
                                setShowRecipesDialog(true);
                                // Pobierz liczbę przepisów jeśli jeszcze nie mamy
                                if (recipeCounts[item.id] === undefined) {
                                  void fetchRecipeCount(item.id);
                                }
                              }}
                              title="Zobacz przepisy"
                              className="h-8 gap-1"
                            >
                              <Book className="h-4 w-4" />
                              {recipeCounts[item.id] !== undefined && recipeCounts[item.id] > 0 && (
                                <Badge variant="secondary" className="h-5 px-1 text-xs bg-green-600 text-white">
                                  {recipeCounts[item.id]}
                                </Badge>
                              )}
                            </Button>
                            {isLowStock && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => addToShopping(item)}
                                title="Dodaj do zakupów"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                // Szybkie dodanie kolejnej sztuki tego produktu
                                form.reset({
                                  name: item.name,
                                  quantity: item.quantity,
                                  unit: item.unit || "",
                                  category: item.category || "other",
                                  location: item.location || "pantry",
                                  expiryDate: "", // Pustny - użytkownik poda nowy termin
                                  minQuantity: item.minQuantity || undefined,
                                  autoRestock: item.autoRestock || false,
                                  price: item.price || undefined,
                                  imageUrl: item.imageUrl || undefined,
                                });
                                setEditingItem(null);
                                setShowFormDialog(true);
                              }}
                              title="Dodaj kolejną sztukę z innym terminem"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteItemId(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
        </TabsContent>

        {/* TAB: Dashboard */}
        <TabsContent value="dashboard">
          <InventoryDashboard />
        </TabsContent>

        {/* TAB: Widok Lodówki */}
        <TabsContent value="fridge">
          <FridgeView items={items} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edytuj produkt" : "Nowy produkt"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nazwa *</FormLabel>
                    <FormControl>
                      <Input placeholder="np. Mleko" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      💡 Możesz dodać ten sam produkt wielokrotnie z różnymi terminami ważności
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ilość *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jednostka</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz jednostkę" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cena (zł za jednostkę)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="np. 4.99"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zdjęcie produktu</FormLabel>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        onChange={field.onChange}
                        onRemove={() => field.onChange(undefined)}
                        disabled={isSubmitting}
                      />
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
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lokalizacja</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz lokalizację" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.value} value={loc.value}>
                            {loc.icon} {loc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Termin ważności</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      System automatycznie powiadomi przed upływem terminu
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimalna ilość (alert)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Powiadom gdy spadnie poniżej"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="autoRestock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Automatyczne uzupełnianie
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatycznie dodaj do listy zakupów gdy ilość spadnie poniżej minimum
                      </p>
                    </div>
                  </FormItem>
                )}
              />


              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFormDialog(false)}
                >
                  Anuluj
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {editingItem ? "Zapisz" : "Dodaj"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć produkt?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć ten produkt z zapasów?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Product Scanner Dialog */}
      <ProductScannerDialog
        open={showScannerDialog}
        onOpenChange={setShowScannerDialog}
        onScan={handleScan}
      />

      {/* Add to Inventory from Scan Dialog */}
      <AddToInventoryDialog
        open={showAddFromScanDialog}
        onOpenChange={setShowAddFromScanDialog}
        product={scannedProduct}
        onSuccess={handleAddFromScanSuccess}
      />

      {/* Recipe Suggestions Dialog */}
      <RecipeSuggestionsDialog
        open={showRecipeSuggestions}
        onOpenChange={setShowRecipeSuggestions}
      />

      {/* Manual Product Dialog */}
      <ManualProductDialog
        open={showManualProductDialog}
        onOpenChange={setShowManualProductDialog}
        barcode={manualProductBarcode}
        onSuccess={handleAddFromScanSuccess}
      />

      {/* Inventory Recipes Dialog */}
      {selectedItemForRecipes && (
        <InventoryRecipesDialog
          open={showRecipesDialog}
          onOpenChange={setShowRecipesDialog}
          itemId={selectedItemForRecipes.id}
          itemName={selectedItemForRecipes.name}
        />
      )}

      {/* Inventory History Dialog */}
      {selectedItemForHistory && (
        <InventoryHistoryDialog
          open={showHistoryDialog}
          onOpenChange={setShowHistoryDialog}
          itemId={selectedItemForHistory.id}
          itemName={selectedItemForHistory.name}
        />
      )}

      {/* Notification Settings Dialog */}
      <InventoryNotificationSettings
        open={showNotificationSettings}
        onOpenChange={setShowNotificationSettings}
      />

      {/* Shopping Assistant Dialog */}
      <ShoppingAssistantDialog
        open={showShoppingAssistant}
        onOpenChange={setShowShoppingAssistant}
      />

      {/* Flying XP Component */}
      <FlyingXPComponent />
    </div>
  );
}

