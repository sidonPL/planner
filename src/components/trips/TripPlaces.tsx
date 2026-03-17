"use client";

import { useState } from "react";
import {
  Plus,
  MapPin,
  Clock,
  Phone,
  DollarSign,
  Trash2,
  Edit,
  ExternalLink,
  GripVertical,
  UtensilsCrossed,
  Coffee,
  Building,
  Waves,
  TreePine,
  ShoppingBag,
  Mountain,
  Sparkles,
  HelpCircle,
  Landmark,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TripMap, MapPlace } from "./TripMap";

interface TripPlace {
  id: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isVisited: boolean;
  visitOrder: number | null;
  visitDate: Date | null;
  visitNotes: string | null;
  websiteUrl: string | null;
  phoneNumber: string | null;
  openingHours: string | null;
  estimatedDuration: number | null;
  estimatedCost: number | null;
}

interface TripPlacesProps {
  tripId: string;
  places: TripPlace[];
  onPlacesChange: (places: TripPlace[]) => void;
}

const categoryInfo: Record<string, { label: string; icon: typeof MapPin; color: string }> = {
  ATTRACTION: { label: "Atrakcja", icon: Landmark, color: "bg-red-500" },
  RESTAURANT: { label: "Restauracja", icon: UtensilsCrossed, color: "bg-orange-500" },
  CAFE: { label: "Kawiarnia", icon: Coffee, color: "bg-amber-700" },
  HOTEL: { label: "Nocleg", icon: Building, color: "bg-blue-500" },
  BEACH: { label: "Plaża", icon: Waves, color: "bg-cyan-500" },
  MUSEUM: { label: "Muzeum", icon: Landmark, color: "bg-purple-500" },
  PARK: { label: "Park", icon: TreePine, color: "bg-green-500" },
  SHOPPING: { label: "Zakupy", icon: ShoppingBag, color: "bg-pink-500" },
  VIEWPOINT: { label: "Punkt widokowy", icon: Mountain, color: "bg-yellow-500" },
  ENTERTAINMENT: { label: "Rozrywka", icon: Sparkles, color: "bg-fuchsia-500" },
  OTHER: { label: "Inne", icon: HelpCircle, color: "bg-gray-500" },
};

export function TripPlaces({ tripId, places, onPlacesChange }: TripPlacesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showMap, setShowMap] = useState(true); // Domyślnie pokazuj mapę
  const [editingPlace, setEditingPlace] = useState<TripPlace | null>(null);
  const [newPlace, setNewPlace] = useState({
    name: "",
    description: "",
    category: "ATTRACTION",
    address: "",
    latitude: "",
    longitude: "",
    visitDate: "",
    websiteUrl: "",
    phoneNumber: "",
    openingHours: "",
    estimatedDuration: "",
    estimatedCost: "",
  });

  const handleAddPlace = async () => {
    if (!newPlace.name.trim()) {
      toast.error("Podaj nazwę miejsca");
      return;
    }

    try {
      const url = editingPlace
        ? `/api/trips/${tripId}/places/${editingPlace.id}`
        : `/api/trips/${tripId}/places`;

      const method = editingPlace ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPlace.name.trim(),
          description: newPlace.description.trim() || undefined,
          category: newPlace.category,
          address: newPlace.address.trim() || undefined,
          latitude: newPlace.latitude ? parseFloat(newPlace.latitude) : undefined,
          longitude: newPlace.longitude ? parseFloat(newPlace.longitude) : undefined,
          visitDate: newPlace.visitDate || undefined,
          websiteUrl: newPlace.websiteUrl.trim() || undefined,
          phoneNumber: newPlace.phoneNumber.trim() || undefined,
          openingHours: newPlace.openingHours.trim() || undefined,
          estimatedDuration: newPlace.estimatedDuration ? parseInt(newPlace.estimatedDuration) : undefined,
          estimatedCost: newPlace.estimatedCost ? parseFloat(newPlace.estimatedCost) : undefined,
        }),
      });

      if (response.ok) {
        const place = await response.json();
        if (editingPlace) {
          onPlacesChange(places.map(p => p.id === editingPlace.id ? place : p));
          toast.success("Miejsce zostało zaktualizowane");
        } else {
          onPlacesChange([...places, place]);
          toast.success("Miejsce zostało dodane");
        }
        setIsAddDialogOpen(false);
        setEditingPlace(null);
        setNewPlace({
          name: "",
          description: "",
          category: "ATTRACTION",
          address: "",
          latitude: "",
          longitude: "",
          visitDate: "",
          websiteUrl: "",
          phoneNumber: "",
          openingHours: "",
          estimatedDuration: "",
          estimatedCost: "",
        });
      } else {
        toast.error(editingPlace ? "Nie udało się zaktualizować miejsca" : "Nie udało się dodać miejsca");
      }
    } catch {
      toast.error("Wystąpił błąd");
    }
  };

  const handleToggleVisited = async (place: TripPlace) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/places/${place.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisited: !place.isVisited }),
      });

      if (response.ok) {
        const updatedPlace = await response.json();
        onPlacesChange(places.map((p) => (p.id === place.id ? updatedPlace : p)));
        toast.success(updatedPlace.isVisited ? "Oznaczono jako odwiedzone" : "Oznaczono jako nieodwiedzone");
      }
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      const response = await fetch(`/api/trips/${tripId}/places/${placeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onPlacesChange(places.filter((p) => p.id !== placeId));
        toast.success("Miejsce zostało usunięte");
      }
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  const handleGeocodeAddress = async () => {
    const address = newPlace.address || newPlace.name;
    if (!address.trim()) {
      toast.error("Wprowadź adres lub nazwę miejsca");
      return;
    }

    try {
      // Używamy bezpłatnego API Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          setNewPlace({
            ...newPlace,
            latitude: result.lat,
            longitude: result.lon,
            address: result.display_name,
          });
          toast.success("Znaleziono lokalizację!");
        } else {
          toast.error("Nie znaleziono lokalizacji");
        }
      }
    } catch {
      toast.error("Nie udało się znaleźć lokalizacji");
    }
  };

  // Przygotuj miejsca dla mapy (tylko te z współrzędnymi)
  const mapPlaces: MapPlace[] = places
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      latitude: p.latitude!,
      longitude: p.longitude!,
      category: p.category,
      isVisited: p.isVisited,
    }));

  const visitedCount = places.filter((p) => p.isVisited).length;
  const totalEstimatedCost = places.reduce((sum, p) => sum + (p.estimatedCost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Miejsca do odwiedzenia
          </h3>
          <p className="text-sm text-muted-foreground">
            {visitedCount} z {places.length} odwiedzonych
            {totalEstimatedCost > 0 && ` • Szacowany koszt: ${totalEstimatedCost.toFixed(0)} zł`}
          </p>
        </div>
        <div className="flex gap-2">
          {mapPlaces.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
              <Map className="h-4 w-4 mr-2" />
              {showMap ? "Ukryj mapę" : "Pokaż mapę"}
            </Button>
          )}
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj miejsce
          </Button>
        </div>
      </div>

      {/* Mapa */}
      {showMap && mapPlaces.length > 0 && (
        <Card className="overflow-hidden">
          <TripMap places={mapPlaces} className="h-[500px] w-full" />
        </Card>
      )}

      {/* Lista miejsc */}
      {places.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-medium mb-2">Brak miejsc do odwiedzenia</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Dodaj miejsca, które chcesz zobaczyć podczas wyjazdu
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwsze miejsce
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {places.map((place, index) => {
            const cat = categoryInfo[place.category] || categoryInfo.OTHER;
            const CategoryIcon = cat.icon;

            return (
              <Card
                key={place.id}
                className={cn(
                  "transition-all",
                  place.isVisited && "opacity-60"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      <Checkbox
                        checked={place.isVisited}
                        onCheckedChange={() => handleToggleVisited(place)}
                      />
                    </div>

                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0",
                        cat.color
                      )}
                    >
                      <CategoryIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4
                            className={cn(
                              "font-medium",
                              place.isVisited && "line-through"
                            )}
                          >
                            {index + 1}. {place.name}
                          </h4>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {cat.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {place.websiteUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              asChild
                            >
                              <a href={place.websiteUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingPlace(place);
                              setNewPlace({
                                name: place.name,
                                description: place.description || "",
                                category: place.category,
                                address: place.address || "",
                                latitude: place.latitude?.toString() || "",
                                longitude: place.longitude?.toString() || "",
                                visitDate: place.visitDate ? new Date(place.visitDate).toISOString().split('T')[0] : "",
                                websiteUrl: place.websiteUrl || "",
                                phoneNumber: place.phoneNumber || "",
                                openingHours: place.openingHours || "",
                                estimatedDuration: place.estimatedDuration?.toString() || "",
                                estimatedCost: place.estimatedCost?.toString() || "",
                              });
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeletePlace(place.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {place.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {place.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {place.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {place.address}
                          </span>
                        )}
                        {place.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            ~{place.estimatedDuration} min
                          </span>
                        )}
                        {place.estimatedCost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ~{place.estimatedCost} zł
                          </span>
                        )}
                        {place.openingHours && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {place.openingHours}
                          </span>
                        )}
                        {place.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {place.phoneNumber}
                          </span>
                        )}
                      </div>

                      {place.visitNotes && place.isVisited && (
                        <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                          <span className="font-medium text-green-700 dark:text-green-400">
                            Notatki:
                          </span>{" "}
                          {place.visitNotes}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog dodawania/edycji miejsca */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        setIsAddDialogOpen(open);
        if (!open) {
          setEditingPlace(null);
          setNewPlace({
            name: "",
            description: "",
            category: "ATTRACTION",
            address: "",
            latitude: "",
            longitude: "",
            visitDate: "",
            websiteUrl: "",
            phoneNumber: "",
            openingHours: "",
            estimatedDuration: "",
            estimatedCost: "",
          });
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlace ? "Edytuj miejsce" : "Dodaj miejsce do odwiedzenia"}</DialogTitle>
            <DialogDescription>
              {editingPlace
                ? "Zaktualizuj szczegóły miejsca które planujesz odwiedzić"
                : "Dodaj nowe miejsce do swojego planu podróży"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa miejsca *</Label>
              <Input
                placeholder="np. Wieża Eiffla"
                value={newPlace.name}
                onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select
                value={newPlace.category}
                onValueChange={(v) => setNewPlace({ ...newPlace, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryInfo).map(([key, info]) => {
                    const Icon = info.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {info.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Opis</Label>
              <Textarea
                placeholder="Krótki opis miejsca..."
                value={newPlace.description}
                onChange={(e) => setNewPlace({ ...newPlace, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Adres</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="np. Champ de Mars, 75007 Paris"
                  value={newPlace.address}
                  onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleGeocodeAddress}
                  title="Znajdź na mapie"
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Kliknij ikonę mapy aby automatycznie znaleźć współrzędne GPS
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Szerokość (lat)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="np. 48.8584"
                  value={newPlace.latitude}
                  onChange={(e) => setNewPlace({ ...newPlace, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Długość (lng)</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="np. 2.2945"
                  value={newPlace.longitude}
                  onChange={(e) => setNewPlace({ ...newPlace, longitude: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Szacowany czas (min)</Label>
                <Input
                  type="number"
                  placeholder="np. 120"
                  value={newPlace.estimatedDuration}
                  onChange={(e) => setNewPlace({ ...newPlace, estimatedDuration: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Szacowany koszt (zł)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="np. 50"
                  value={newPlace.estimatedCost}
                  onChange={(e) => setNewPlace({ ...newPlace, estimatedCost: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Strona WWW</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={newPlace.websiteUrl}
                onChange={(e) => setNewPlace({ ...newPlace, websiteUrl: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  placeholder="+48 123 456 789"
                  value={newPlace.phoneNumber}
                  onChange={(e) => setNewPlace({ ...newPlace, phoneNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Godziny otwarcia</Label>
                <Input
                  placeholder="np. 9:00-18:00"
                  value={newPlace.openingHours}
                  onChange={(e) => setNewPlace({ ...newPlace, openingHours: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddPlace}>
              {editingPlace ? (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Zapisz zmiany
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj miejsce
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

