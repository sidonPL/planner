"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { ProductInfoCard } from "./ProductInfoCard";
import { toast } from "sonner";

interface ProductData {
  barcode: string;
  name: string;
  brand?: string;
  manufacturer?: string;
  category?: string;
  quantity?: string;
  imageUrl?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    fiber?: number;
    salt?: number;
    sugar?: number;
  };
  allergens?: string[];
  labels?: string[];
  nutriScore?: string;
  novaGroup?: number;
  ecoScore?: string;
  source: string;
}

interface AddToInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductData | null;
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

export function AddToInventoryDialog({ open, onOpenChange, product, onSuccess }: AddToInventoryDialogProps) {
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(product?.quantity?.match(/(kg|g|l|ml|szt)/i)?.[0]?.toLowerCase() || "szt");
  const [location, setLocation] = useState("pantry"); // Domyślnie spiżarnia (pantry)
  const [expiryDate, setExpiryDate] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [autoRestock, setAutoRestock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productName, setProductName] = useState(product?.name || ""); // Edytowalna nazwa

  // Reset nazwy gdy zmienia się produkt
  useEffect(() => {
    if (product?.name) {
      setProductName(product.name);
    }
  }, [product?.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product) return;

    if (!productName.trim()) {
      toast.error("Nazwa produktu jest wymagana");
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Ilość musi być większa od 0");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/inventory/from-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: product.barcode,
          name: productName.trim(), // Użyj edytowanej nazwy
          quantity: parseFloat(quantity),
          unit,
          location: location || null,
          expiryDate: expiryDate || null,
          minQuantity: minQuantity ? parseFloat(minQuantity) : null,
          autoRestock,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        toast.error(errorData.error || "Błąd podczas dodawania produktu");
        return;
      }

      const data = await response.json();

      if (data.updated) {
        toast.success(`Zwiększono ilość: ${productName} (+${quantity} ${unit})`);
      } else {
        toast.success(`Dodano ${productName} do inwentarza`);
      }

      // Reset formularza
      setQuantity("1");
      setExpiryDate("");
      setMinQuantity("");
      setAutoRestock(false);
      setProductName("");

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      console.error("Error adding to inventory:", error);
      const errorMessage = error instanceof Error ? error.message : "Nie udało się dodać produktu";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj do inwentarza</DialogTitle>
          <DialogDescription>
            Uzupełnij szczegóły produktu i dodaj do inwentarza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Karta produktu */}
          <ProductInfoCard product={product} />

          {/* Formularz */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Edytowalna nazwa produktu */}
            <div className="space-y-2">
              <Label htmlFor="productName">
                Nazwa produktu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="np. Nutella 750g"
                required
              />
              <p className="text-xs text-muted-foreground">
                Możesz zmienić nazwę produktu przed dodaniem do inwentarza
              </p>
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
                  placeholder="Opcjonalnie"
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

