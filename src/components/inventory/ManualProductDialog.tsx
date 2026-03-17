"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Package } from "lucide-react";
import { toast } from "sonner";

interface ManualProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode?: string; // Opcjonalnie - jeśli pochodzi ze skanowania
  onSuccess?: () => void;
}

const UNITS = ["szt", "g", "kg", "ml", "l", "op"];

const LOCATIONS = [
  { value: "fridge", label: "🧊 Lodówka" },
  { value: "freezer", label: "❄️ Zamrażarka" },
  { value: "pantry", label: "🏠 Spiżarnia" },
  { value: "cabinet", label: "🗄️ Szafka kuchenna" },
  { value: "counter", label: "🍽️ Blat kuchenny" },
  { value: "cellar", label: "🪨 Piwnica" },
  { value: "other", label: "📦 Inne" },
];

const CATEGORIES = [
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

export function ManualProductDialog({ open, onOpenChange, barcode, onSuccess }: ManualProductDialogProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("szt");
  const [location, setLocation] = useState("pantry");
  const [category, setCategory] = useState("other");
  const [expiryDate, setExpiryDate] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [autoRestock, setAutoRestock] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nazwa produktu jest wymagana");
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Ilość musi być większa od 0");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: parseFloat(quantity),
          unit,
          category,
          location,
          expiryDate: expiryDate || null,
          minQuantity: minQuantity ? parseFloat(minQuantity) : null,
          autoRestock,
          barcode: barcode || null, // Dodaj kod kreskowy jeśli pochodzi ze skanowania
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Błąd podczas dodawania produktu");
      }

      toast.success(`Dodano ${name} do inwentarza`);

      // Reset formularza
      setName("");
      setQuantity("1");
      setUnit("szt");
      setCategory("other");
      setLocation("pantry");
      setExpiryDate("");
      setMinQuantity("");
      setAutoRestock(false);

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast.error(error.message || "Nie udało się dodać produktu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Dodaj produkt ręcznie
            </div>
          </DialogTitle>
          <DialogDescription>
            Produkt nie został znaleziony w bazie? Dodaj go ręcznie.
            {barcode && (
              <span className="block mt-2 text-xs">
                Kod kreskowy: <code className="bg-muted px-1 py-0.5 rounded">{barcode}</code>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nazwa produktu */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nazwa produktu <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Domestos, Persil, Fairy"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Ilość */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Ilość <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Jednostka */}
            <div className="space-y-2">
              <Label htmlFor="unit">Jednostka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Kategoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Wybierz kategorię" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lokalizacja */}
          <div className="space-y-2">
            <Label htmlFor="location">Lokalizacja</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Wybierz lokalizację" />
              </SelectTrigger>
              <SelectContent>
                {LOCATIONS.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Data ważności */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Data ważności</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            {/* Minimalna ilość */}
            <div className="space-y-2">
              <Label htmlFor="minQuantity">Min. ilość</Label>
              <Input
                id="minQuantity"
                type="number"
                step="0.1"
                min="0"
                placeholder="Alert gdy spadnie poniżej"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </div>
          </div>

          {/* Auto-restocking */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="autoRestock"
              checked={autoRestock}
              onChange={(e) => setAutoRestock(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="autoRestock" className="cursor-pointer">
              Automatyczne uzupełnianie
            </Label>
          </div>

          {/* Przyciski */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj do inwentarza
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

