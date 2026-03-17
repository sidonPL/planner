"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Check,
  AlertTriangle,
  MoreVertical,
  History,
  Edit,
  BookOpen,
  TrendingUp,
  Filter,
  Users,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ShoppingItem, InventoryItem } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ShoppingAnalytics } from "@/components/shopping/ShoppingAnalytics";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { useSoundEffects } from "@/lib/sound-effects";

type HouseholdUser = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

type ShoppingItemWithAssignment = ShoppingItem & {
  assignedTo?: HouseholdUser | null;
};

const units = [
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
  { value: "fruits_vegetables", label: "Owoce i warzywa", emoji: "🥬" },
  { value: "dairy", label: "Nabiał", emoji: "🥛" },
  { value: "meat", label: "Mięso", emoji: "🥩" },
  { value: "bread", label: "Pieczywo", emoji: "🍞" },
  { value: "drinks", label: "Napoje", emoji: "🥤" },
  { value: "frozen", label: "Mrożonki", emoji: "🧊" },
  { value: "snacks", label: "Przekąski", emoji: "🍪" },
  { value: "cleaning", label: "Chemia", emoji: "🧹" },
  { value: "hygiene", label: "Higiena", emoji: "🧴" },
  { value: "other", label: "Inne", emoji: "📦" },
];

interface ShoppingClientProps {
  initialItems: ShoppingItemWithAssignment[];
  inventoryItems: InventoryItem[];
  householdUsers: HouseholdUser[];
  currentUserId: string;
}

interface Product {
  name: string;
  category: string;
  unit: string;
  defaultQty: number;
}

const popularProducts: Product[] = [
  { name: "Mleko", category: "dairy", unit: "l", defaultQty: 1 },
  { name: "Chleb", category: "bread", unit: "szt", defaultQty: 1 },
  { name: "Jajka", category: "dairy", unit: "szt", defaultQty: 10 },
  { name: "Masło", category: "dairy", unit: "g", defaultQty: 200 },
  { name: "Ser żółty", category: "dairy", unit: "g", defaultQty: 250 },
  { name: "Woda", category: "drinks", unit: "l", defaultQty: 2 },
  { name: "Sok", category: "drinks", unit: "l", defaultQty: 1 },
  { name: "Jogurt", category: "dairy", unit: "ml", defaultQty: 400 },
  { name: "Papier toaletowy", category: "hygiene", unit: "szt", defaultQty: 8 },
  { name: "Płyn do naczyń", category: "cleaning", unit: "ml", defaultQty: 500 },
];

export function ShoppingClient({ initialItems, inventoryItems, householdUsers, currentUserId }: ShoppingClientProps) {
  // State
  const [items, setItems] = useState<ShoppingItemWithAssignment[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItemWithAssignment | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "category" | "urgent">("category");
  const [newItem, setNewItem] = useState({
    name: "",
    quantity: "",
    unit: "",
    category: "other",
    isUrgent: false,
    price: "",
    store: "",
    notes: "",
    assignedToId: "" as string | undefined,
  });

  // Gamification hooks
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();
  const { playSound } = useSoundEffects();

  // Filtrowane i sortowane produkty
  const filteredItems = items
    .filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === "all" || item.category === filterCategory;
      const matchesAssignedTo =
        filterAssignedTo === "all" ||
        (filterAssignedTo === "unassigned" && !item.assignedTo) ||
        item.assignedTo?.id === filterAssignedTo;
      return matchesSearch && matchesCategory && matchesAssignedTo;
    })
    .sort((a, b) => {
      if (sortBy === "urgent") {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
      }
      if (sortBy === "category") {
        const catA = a.category || "other";
        const catB = b.category || "other";
        return catA.localeCompare(catB);
      }
      return a.name.localeCompare(b.name);
    });

  // Grupowanie po kategoriach
  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItemWithAssignment[]>);

  // Statystyki
  const totalItems = items.length;
  const purchasedItems = items.filter((i) => i.isPurchased).length;
  const urgentItems = items.filter((i) => i.isUrgent && !i.isPurchased).length;

  // Statystyki cenowe
  const totalPrice = items
    .filter(i => !i.isPurchased && i.price)
    .reduce((sum, i) => sum + (i.price || 0), 0);
  const purchasedPrice = items
    .filter(i => i.isPurchased && i.price)
    .reduce((sum, i) => sum + (i.price || 0), 0);

  // Moja lista - items przypisane do zalogowanego użytkownika
  const myItems = items.filter(i => i.assignedTo?.id === currentUserId && !i.isPurchased).length;

  // Sugestie produktów na podstawie wpisanego tekstu
  const suggestions = showSuggestions
    ? popularProducts.filter((p) =>
        p.name.toLowerCase().includes(newItem.name.toLowerCase())
      ).slice(0, 5)
    : [];


  const handleAddItem = async () => {
    if (!newItem.name.trim()) {
      toast.error("Podaj nazwę produktu");
      return;
    }

    try {
      const response = await fetch("/api/shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          quantity: newItem.quantity ? parseFloat(newItem.quantity) : null,
          unit: newItem.unit || null,
          category: newItem.category,
          isUrgent: newItem.isUrgent,
          price: newItem.price ? parseFloat(newItem.price) : null,
          store: newItem.store || null,
          notes: newItem.notes || null,
          assignedToId: newItem.assignedToId || null,
        }),
      });

      if (response.ok) {
        const item = await response.json();
        setItems([item, ...items]);
        setNewItem({
          name: "",
          quantity: "",
          unit: "",
          category: "other",
          isUrgent: false,
          price: "",
          store: "",
          notes: "",
          assignedToId: undefined
        });
        setIsAddDialogOpen(false);
        toast.success("Dodano do listy zakupów");
      }
    } catch (err) {
      console.error("Error adding item:", err);
      toast.error("Nie udało się dodać produktu");
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !newItem.name.trim()) {
      toast.error("Podaj nazwę produktu");
      return;
    }

    try {
      const response = await fetch(`/api/shopping/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItem.name,
          quantity: newItem.quantity ? parseFloat(newItem.quantity) : null,
          unit: newItem.unit || null,
          category: newItem.category,
          isUrgent: newItem.isUrgent,
          price: newItem.price ? parseFloat(newItem.price) : null,
          store: newItem.store || null,
          notes: newItem.notes || null,
          assignedToId: newItem.assignedToId || null,
        }),
      });

      if (response.ok) {
        const updatedItem = await response.json();
        setItems(items.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
        setIsEditDialogOpen(false);
        setEditingItem(null);
        setNewItem({
          name: "",
          quantity: "",
          unit: "",
          category: "other",
          isUrgent: false,
          price: "",
          store: "",
          notes: "",
          assignedToId: undefined
        });
        toast.success("Zaktualizowano produkt");
      }
    } catch (err) {
      console.error("Error editing item:", err);
      toast.error("Nie udało się zaktualizować produktu");
    }
  };

  const handleTogglePurchased = async (item: ShoppingItem) => {
    try {
      const response = await fetch(`/api/shopping/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: !item.isPurchased }),
      });

      if (response.ok) {
        setItems(
          items.map((i) =>
            i.id === item.id ? { ...i, isPurchased: !i.isPurchased } : i
          )
        );
      }
    } catch (err) {
      console.error("Error toggling purchased:", err);
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/shopping/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setItems(items.filter((i) => i.id !== id));
        toast.success("Usunięto z listy");
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Nie udało się usunąć");
    }
  };

  const handleClearPurchased = async () => {
    const purchasedIds = items.filter((i) => i.isPurchased).map((i) => i.id);
    const purchasedCount = purchasedIds.length;

    try {
      await Promise.all(
        purchasedIds.map((id) =>
          fetch(`/api/shopping/${id}`, { method: "DELETE" })
        )
      );
      setItems(items.filter((i) => !i.isPurchased));
      toast.success("Usunięto kupione produkty");

      // 🎮 Gamification: Reward XP for completing shopping
      if (purchasedCount > 0) {
        const xpEarned = Math.min(20 + (purchasedCount * 2), 50); // 20 base + 2 per item, max 50
        showFlyingXP(xpEarned);
        playSound('quest-complete');
      }
    } catch (err) {
      console.error("Error clearing purchased:", err);
      toast.error("Nie udało się wyczyścić listy");
    }
  };

  const handleSelectSuggestion = (product: Product) => {
    setNewItem({
      name: product.name,
      quantity: product.defaultQty.toString(),
      unit: product.unit,
      category: product.category,
      isUrgent: false,
      price: "",
      store: "",
      notes: "",
      assignedToId: undefined,
    });
    setShowSuggestions(false);
  };

  const handleAddFromTemplate = async (templateName: string) => {
    const templates: Record<string, Product[]> = {
      weekend: [
        { name: "Mleko", category: "dairy", unit: "l", defaultQty: 2 },
        { name: "Jajka", category: "dairy", unit: "szt", defaultQty: 10 },
        { name: "Masło", category: "dairy", unit: "g", defaultQty: 200 },
        { name: "Chleb", category: "bread", unit: "szt", defaultQty: 2 },
        { name: "Ser żółty", category: "dairy", unit: "g", defaultQty: 300 },
        { name: "Woda mineralna", category: "drinks", unit: "l", defaultQty: 6 },
      ],
      breakfast: [
        { name: "Mleko", category: "dairy", unit: "l", defaultQty: 1 },
        { name: "Płatki śniadaniowe", category: "snacks", unit: "opak", defaultQty: 1 },
        { name: "Jogurt", category: "dairy", unit: "ml", defaultQty: 500 },
        { name: "Dżem", category: "other", unit: "słoik", defaultQty: 1 },
        { name: "Masło", category: "dairy", unit: "g", defaultQty: 200 },
        { name: "Chleb", category: "bread", unit: "szt", defaultQty: 1 },
      ],
      party: [
        { name: "Chipsy", category: "snacks", unit: "opak", defaultQty: 3 },
        { name: "Napoje gazowane", category: "drinks", unit: "l", defaultQty: 4 },
        { name: "Piwo", category: "drinks", unit: "szt", defaultQty: 12 },
        { name: "Pizza mrożona", category: "frozen", unit: "szt", defaultQty: 2 },
        { name: "Orzechy", category: "snacks", unit: "g", defaultQty: 300 },
        { name: "Lód", category: "other", unit: "kg", defaultQty: 2 },
      ],
      cleaning: [
        { name: "Płyn do naczyń", category: "cleaning", unit: "ml", defaultQty: 500 },
        { name: "Proszek do prania", category: "cleaning", unit: "kg", defaultQty: 3 },
        { name: "Papier toaletowy", category: "hygiene", unit: "szt", defaultQty: 8 },
        { name: "Ręczniki papierowe", category: "hygiene", unit: "szt", defaultQty: 4 },
        { name: "Worki na śmieci", category: "cleaning", unit: "opak", defaultQty: 1 },
      ],
    };

    const template = templates[templateName];
    if (!template) return;

    try {
      const promises = template.map((product: Product) =>
        fetch("/api/shopping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: product.name,
            quantity: product.defaultQty,
            unit: product.unit,
            category: product.category,
            isUrgent: false,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const newItems = await Promise.all(responses.map((r: Response) => r.json()));
      setItems([...newItems, ...items]);
      setShowTemplates(false);
      toast.success(`Dodano szablon "${templateName}"`);
    } catch (err) {
      console.error("Error adding template:", err);
      toast.error("Nie udało się dodać szablonu");
    }
  };

  const getCategoryInfo = (cat: string) => {
    return categories.find((c) => c.value === cat) || categories[categories.length - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lista zakupów</h1>
          <p className="text-muted-foreground">
            {purchasedItems} z {totalItems} produktów kupionych
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/shopping/history">
            <Button variant="outline" size="sm">
              <History className="mr-2 h-4 w-4" />
              Historia
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <BookOpen className="mr-2 h-4 w-4" />
            Szablony
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(true)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Statystyki
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const unassignedItems = items.filter(i => !i.assignedTo && !i.isPurchased);
                if (unassignedItems.length === 0) {
                  toast.info("Wszystkie produkty są już przypisane");
                  return;
                }

                const updates = unassignedItems.map(item =>
                  fetch(`/api/shopping/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assignedToId: currentUserId }),
                  })
                );

                await Promise.all(updates);

                // Refresh items
                const response = await fetch('/api/shopping');
                if (response.ok) {
                  const updated = await response.json();
                  setItems(updated);
                  toast.success(`Przypisano ${unassignedItems.length} produktów do Ciebie`);
                }
              } catch (error) {
                console.error("Error bulk assigning:", error);
                toast.error("Wystąpił błąd podczas przypisywania");
              }
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            Przypisz do mnie
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="mr-2 h-4 w-4" />
                Więcej
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                const link = document.createElement('a');
                link.href = '/api/shopping/export';
                link.download = `lista-zakupow-${new Date().toISOString().split('T')[0]}.txt`;
                link.click();
              }}>
                Eksportuj listę
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                const unpurchasedItems = items.filter(i => !i.isPurchased);
                const text = unpurchasedItems.map(i =>
                  `${i.name}${i.quantity && i.unit ? ` (${i.quantity} ${i.unit})` : ''}`
                ).join('\n');
                await navigator.clipboard.writeText(text);
                toast.success('Skopiowano do schowka');
              }}>
                Kopiuj do schowka
              </DropdownMenuItem>
              <div className="border-t my-1" />
              <DropdownMenuItem onClick={async () => {
                try {
                  // Podziel nieprzypisane produkty na połowę
                  const unassignedItems = items.filter(i => !i.assignedTo && !i.isPurchased);

                  if (unassignedItems.length === 0) {
                    toast.info("Wszystkie produkty są już przypisane");
                    return;
                  }

                  const halfCount = Math.ceil(unassignedItems.length / 2);
                  const myItems = unassignedItems.slice(0, halfCount);

                  const updates = myItems.map(item =>
                    fetch(`/api/shopping/${item.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ assignedToId: currentUserId }),
                    })
                  );

                  await Promise.all(updates);

                  const response = await fetch('/api/shopping');
                  if (response.ok) {
                    const updated = await response.json();
                    setItems(updated);
                    toast.success(`Przypisano Ci ${halfCount} produktów. Pozostałe ${unassignedItems.length - halfCount} czekają na innych.`);
                  }
                } catch (error) {
                  console.error("Error:", error);
                  toast.error("Wystąpił błąd");
                }
              }}>
                🤝 Podziel listę (weź połowę)
              </DropdownMenuItem>
              <div className="border-t my-1" />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Przypisz kategorię:
              </div>
              {categories.map((cat) => (
                <DropdownMenuItem
                  key={cat.value}
                  onClick={async () => {
                    try {
                      const categoryItems = items.filter(
                        i => i.category === cat.value && !i.assignedTo && !i.isPurchased
                      );

                      if (categoryItems.length === 0) {
                        toast.info(`Brak nieprzypisanych produktów w kategorii ${cat.label}`);
                        return;
                      }

                      const updates = categoryItems.map(item =>
                        fetch(`/api/shopping/${item.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ assignedToId: currentUserId }),
                        })
                      );

                      await Promise.all(updates);

                      const response = await fetch('/api/shopping');
                      if (response.ok) {
                        const updated = await response.json();
                        setItems(updated);
                        toast.success(`${cat.emoji} Przypisano ${categoryItems.length} produktów z kategorii ${cat.label}`);
                      }
                    } catch (error) {
                      console.error("Error:", error);
                      toast.error("Wystąpił błąd");
                    }
                  }}
                >
                  {cat.emoji} {cat.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {purchasedItems > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearPurchased}>
              <Trash2 className="mr-2 h-4 w-4" />
              Wyczyść kupione
            </Button>
          )}
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj produkt
          </Button>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Do kupienia</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems - purchasedItems}</div>
            {totalPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                ~{totalPrice.toFixed(2)} zł
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kupione</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchasedItems}</div>
            {purchasedPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {purchasedPrice.toFixed(2)} zł
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pilne</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moja lista</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myItems}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Przypisanych do mnie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wyszukiwarka i Filtry */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj produktów..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.emoji} {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Kto kupuje" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszyscy</SelectItem>
            <SelectItem value="unassigned">
              <span className="flex items-center gap-2">
                📋 Nieprzypisane
              </span>
            </SelectItem>
            {householdUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: user.color }}
                  />
                  {user.name || 'Użytkownik'}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <TrendingUp className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Sortowanie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Kategoria</SelectItem>
            <SelectItem value="name">Nazwa</SelectItem>
            <SelectItem value="urgent">Pilność</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista produktów */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Lista zakupów jest pusta</h3>
            <p className="text-muted-foreground mb-4">
              Dodaj produkty, które chcesz kupić
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj pierwszy produkt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const catInfo = getCategoryInfo(category);
            return (
              <Card key={category}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{catInfo.emoji}</span>
                    {catInfo.label}
                    <Badge variant="secondary" className="ml-auto">
                      {categoryItems.filter((i) => !i.isPurchased).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <div className="space-y-1">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors",
                          item.isPurchased && "opacity-50"
                        )}
                      >
                        <Checkbox
                          checked={item.isPurchased}
                          onCheckedChange={() => handleTogglePurchased(item)}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "font-medium",
                              item.isPurchased && "line-through"
                            )}
                          >
                            {item.name}
                            {item.isUrgent && !item.isPurchased && (
                              <AlertTriangle className="inline h-4 w-4 text-red-500 ml-2" />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {(item.quantity || item.unit) && (
                              <span>
                                {item.quantity} {item.unit}
                              </span>
                            )}
                            {item.price && (
                              <span>• {item.price} zł</span>
                            )}
                            {item.store && (
                              <span>• 🏪 {item.store}</span>
                            )}
                            {item.assignedTo && (
                              <span className="flex items-center gap-1">
                                •
                                <span
                                  className="w-3 h-3 rounded-full inline-block"
                                  style={{ backgroundColor: item.assignedTo.color }}
                                />
                                {item.assignedTo.name}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <div className="text-xs text-muted-foreground italic mt-1">
                              {item.notes}
                            </div>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setNewItem({
                                  name: item.name,
                                  quantity: item.quantity?.toString() || "",
                                  unit: item.unit || "",
                                  category: item.category || "other",
                                  isUrgent: item.isUrgent,
                                  price: item.price?.toString() || "",
                                  store: item.store || "",
                                  notes: item.notes || "",
                                  assignedToId: item.assignedTo?.id || undefined,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>

                            {/* Submenu przypisywania */}
                            <div className="border-t my-1" />
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Przypisz do:
                            </div>
                            {householdUsers.map((user) => (
                              <DropdownMenuItem
                                key={user.id}
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/shopping/${item.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        assignedToId: user.id
                                      }),
                                    });
                                    if (response.ok) {
                                      const updated = await response.json();
                                      setItems(items.map(i => i.id === item.id ? updated : i));
                                      toast.success(`Przypisano do: ${user.name}`);
                                    }
                                  } catch (error) {
                                    console.error("Error assigning:", error);
                                    toast.error("Wystąpił błąd");
                                  }
                                }}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: user.color }}
                                />
                                {user.name}
                                {item.assignedTo?.id === user.id && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/shopping/${item.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      assignedToId: null
                                    }),
                                  });
                                  if (response.ok) {
                                    const updated = await response.json();
                                    setItems(items.map(i => i.id === item.id ? updated : i));
                                    toast.success("Usunięto przypisanie");
                                  }
                                } catch (error) {
                                  console.error("Error unassigning:", error);
                                  toast.error("Wystąpił błąd");
                                }
                              }}
                              className="text-muted-foreground"
                            >
                              Usuń przypisanie
                              {!item.assignedTo && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </DropdownMenuItem>

                            <div className="border-t my-1" />
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingItem(item);
                                setNewItem({
                                  name: item.name,
                                  quantity: item.quantity?.toString() || "",
                                  unit: item.unit || "",
                                  category: item.category || "other",
                                  isUrgent: item.isUrgent,
                                  price: item.price?.toString() || "",
                                  store: item.store || "",
                                  notes: item.notes || "",
                                  assignedToId: item.assignedTo?.id || undefined,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edytuj
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Usuń
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog dodawania produktu */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj produkt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa produktu</Label>
              <Input
                id="name"
                placeholder="Np. Mleko"
                value={newItem.name}
                onChange={(e) => {
                  setNewItem({ ...newItem, name: e.target.value });
                  setShowSuggestions(e.target.value.length > 1);
                }}
              />
              {suggestions.length > 0 && (
                <div className="border rounded-md mt-1 bg-popover">
                  {suggestions.map((product, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectSuggestion(product)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2"
                    >
                      <span>{getCategoryInfo(product.category).emoji}</span>
                      <span>{product.name}</span>
                      <span className="text-muted-foreground text-xs ml-auto">
                        {product.defaultQty} {product.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Ilość</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Np. 2"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Jednostka</Label>
                <Select
                  value={newItem.unit}
                  onValueChange={(v) => setNewItem({ ...newItem, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz jednostkę" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={newItem.category}
                onValueChange={(v) => setNewItem({ ...newItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        {cat.emoji} {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Cena (opcjonalnie)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00 zł"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store">Sklep (opcjonalnie)</Label>
                <Input
                  id="store"
                  placeholder="Np. Biedronka"
                  value={newItem.store}
                  onChange={(e) => setNewItem({ ...newItem, store: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
              <Input
                id="notes"
                placeholder="Dodatkowe informacje"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Przypisz do (opcjonalnie)</Label>
              <Select
                value={newItem.assignedToId || "unassigned"}
                onValueChange={(v) => setNewItem({ ...newItem, assignedToId: v === "unassigned" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="flex items-center gap-2">
                      📋 Nieprzypisane
                    </span>
                  </SelectItem>
                  {householdUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: user.color }}
                        />
                        {user.name || 'Użytkownik'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="urgent">Pilne</Label>
              <Switch
                id="urgent"
                checked={newItem.isUrgent}
                onCheckedChange={(v) => setNewItem({ ...newItem, isUrgent: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddItem}>Dodaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog edycji produktu */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edytuj produkt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nazwa produktu</Label>
              <Input
                id="edit-name"
                placeholder="Np. Mleko"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-quantity">Ilość</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  placeholder="Np. 2"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Jednostka</Label>
                <Input
                  id="edit-unit"
                  placeholder="Np. l, kg, szt"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={newItem.category}
                onValueChange={(v) => setNewItem({ ...newItem, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        {cat.emoji} {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Cena (opcjonalnie)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00 zł"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-store">Sklep (opcjonalnie)</Label>
                <Input
                  id="edit-store"
                  placeholder="Np. Biedronka"
                  value={newItem.store}
                  onChange={(e) => setNewItem({ ...newItem, store: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notatki (opcjonalnie)</Label>
              <Input
                id="edit-notes"
                placeholder="Dodatkowe informacje"
                value={newItem.notes}
                onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Przypisz do (opcjonalnie)</Label>
              <Select
                value={newItem.assignedToId || "unassigned"}
                onValueChange={(v) => setNewItem({ ...newItem, assignedToId: v === "unassigned" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="flex items-center gap-2">
                      📋 Nieprzypisane
                    </span>
                  </SelectItem>
                  {householdUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: user.color }}
                        />
                        {user.name || 'Użytkownik'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-urgent">Pilne</Label>
              <Switch
                id="edit-urgent"
                checked={newItem.isUrgent}
                onCheckedChange={(v) => setNewItem({ ...newItem, isUrgent: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleEditItem}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog szablonów */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wybierz szablon zakupów</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => handleAddFromTemplate("weekend")}
            >
              <div className="text-left">
                <div className="font-medium">Zakupy weekendowe</div>
                <div className="text-sm text-muted-foreground">
                  Mleko, jajka, masło, chleb, ser, woda
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => handleAddFromTemplate("breakfast")}
            >
              <div className="text-left">
                <div className="font-medium">Śniadanie</div>
                <div className="text-sm text-muted-foreground">
                  Mleko, płatki, jogurt, dżem, masło, chleb
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => handleAddFromTemplate("party")}
            >
              <div className="text-left">
                <div className="font-medium">Impreza</div>
                <div className="text-sm text-muted-foreground">
                  Chipsy, napoje, piwo, pizza, orzechy, lód
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-4"
              onClick={() => handleAddFromTemplate("cleaning")}
            >
              <div className="text-left">
                <div className="font-medium">Środki czystości</div>
                <div className="text-sm text-muted-foreground">
                  Płyn, proszek, papier, ręczniki, worki
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Statystyki zakupów</DialogTitle>
          </DialogHeader>
          <ShoppingAnalytics />
        </DialogContent>
      </Dialog>

      {/* Flying XP Animation */}
      <FlyingXPComponent />
    </div>
  );
}

