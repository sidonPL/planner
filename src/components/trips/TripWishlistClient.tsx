"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  MapPin,
  Star,
  Trash2,
  Users,
  Calendar,
  DollarSign,
  Heart,
  Edit,
  Palmtree,
  Snowflake,
  Sun,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TripMap } from "./TripMap";
import { useFileUpload } from "@/hooks/useFileUpload";

type WishlistItemWithUser = {
  id: string;
  destination: string;
  description: string | null;
  country: string | null;
  address?: string | null;
  estimatedBudget: number | null;
  currency: string;
  priority: number;
  season: string | null;
  notes: string | null;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  interestedUserIds: string[];
  addedBy: { id: string; name: string | null; avatar: string | null; color: string };
  createdAt: Date;
  updatedAt: Date;
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface TripWishlistClientProps {
  wishlist: WishlistItemWithUser[];
  members: Member[];
  currentUserId: string;
}

const seasonIcons = {
  lato: { icon: Sun, color: "text-yellow-500" },
  zima: { icon: Snowflake, color: "text-blue-400" },
  wiosna: { icon: Palmtree, color: "text-green-500" },
  jesień: { icon: Cloud, color: "text-orange-500" },
  "cały rok": { icon: Calendar, color: "text-gray-500" },
};

export function TripWishlistClient({
  wishlist: initialWishlist,
  members,
  currentUserId,
}: TripWishlistClientProps) {
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItemWithUser | null>(null);
  const [showMap, setShowMap] = useState(true);

  const { upload, isUploading } = useFileUpload({
    folder: "wishlist",
    onSuccess: (result) => {
      if (result.url) {
        setFormData({ ...formData, imageUrl: result.url });
        toast.success("Zdjęcie zostało przesłane");
      }
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const [formData, setFormData] = useState({
    destination: "",
    description: "",
    country: "",
    address: "",
    estimatedBudget: "",
    currency: "PLN",
    priority: 3,
    season: "",
    notes: "",
    imageUrl: "",
    latitude: "",
    longitude: "",
    interestedUserIds: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      destination: "",
      description: "",
      country: "",
      address: "",
      estimatedBudget: "",
      currency: "PLN",
      priority: 3,
      season: "",
      notes: "",
      imageUrl: "",
      latitude: "",
      longitude: "",
      interestedUserIds: [],
    });
  };

  const handleAddOrUpdate = async () => {
    if (!formData.destination) {
      toast.error("Podaj nazwę miejsca");
      return;
    }

    try {
      const payload = {
        ...formData,
        estimatedBudget: formData.estimatedBudget ? parseFloat(formData.estimatedBudget) : undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      };

      if (editingItem) {
        // Aktualizacja
        const response = await fetch(`/api/trips/wishlist/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const updated = await response.json();
          setWishlist(wishlist.map((item) => (item.id === editingItem.id ? updated : item)));
          toast.success("Miejsce zostało zaktualizowane");
        }
      } else {
        // Dodawanie
        const response = await fetch("/api/trips/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const newItem = await response.json();
          setWishlist([newItem, ...wishlist]);
          toast.success("Miejsce zostało dodane do listy marzeń");
        }
      }

      setIsAddDialogOpen(false);
      setEditingItem(null);
      resetForm();
    } catch {
      toast.error("Nie udało się zapisać miejsca");
    }
  };

  const handleEdit = (item: WishlistItemWithUser) => {
    setEditingItem(item);
    setFormData({
      destination: item.destination,
      description: item.description || "",
      country: item.country || "",
      address: item.address || "",
      estimatedBudget: item.estimatedBudget?.toString() || "",
      currency: item.currency,
      priority: item.priority,
      season: item.season || "",
      notes: item.notes || "",
      imageUrl: item.imageUrl || "",
      latitude: item.latitude?.toString() || "",
      longitude: item.longitude?.toString() || "",
      interestedUserIds: item.interestedUserIds,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/trips/wishlist/${id}`, { method: "DELETE" });
      if (response.ok) {
        setWishlist(wishlist.filter((item) => item.id !== id));
        toast.success("Miejsce zostało usunięte z listy");
      }
    } catch {
      toast.error("Nie udało się usunąć miejsca");
    }
  };

  const handleToggleInterest = async (item: WishlistItemWithUser) => {
    const isInterested = item.interestedUserIds.includes(currentUserId);
    const newInterestedIds = isInterested
      ? item.interestedUserIds.filter((id: string) => id !== currentUserId)
      : [...item.interestedUserIds, currentUserId];

    try {
      const response = await fetch(`/api/trips/wishlist/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interestedUserIds: newInterestedIds }),
      });

      if (response.ok) {
        const updated = await response.json();
        setWishlist(wishlist.map((w) => (w.id === item.id ? updated : w)));
      }
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5:
        return { label: "Bardzo wysoki", color: "bg-red-500" };
      case 4:
        return { label: "Wysoki", color: "bg-orange-500" };
      case 3:
        return { label: "Średni", color: "bg-yellow-500" };
      case 2:
        return { label: "Niski", color: "bg-blue-500" };
      case 1:
        return { label: "Bardzo niski", color: "bg-gray-500" };
      default:
        return { label: "Średni", color: "bg-yellow-500" };
    }
  };

  const getSeasonInfo = (season: string | null) => {
    if (!season) return null;
    const seasonKey = season.toLowerCase() as keyof typeof seasonIcons;
    return seasonIcons[seasonKey] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lista marzeń</h2>
          <p className="text-muted-foreground">Miejsca, do których chcemy pojechać</p>
        </div>
        <div className="flex gap-2">
          {wishlist.filter(w => w.latitude && w.longitude).length > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowMap(!showMap)}
            >
              <MapPin className="mr-2 h-4 w-4" />
              {showMap ? "Ukryj mapę" : "Pokaż mapę"}
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj miejsce
          </Button>
        </div>
      </div>

      {/* Mapa */}
      {showMap && wishlist.filter(w => w.latitude && w.longitude).length > 0 && (
        <Card className="overflow-hidden">
          <TripMap
            places={wishlist
              .filter(w => w.latitude && w.longitude)
              .map(w => ({
                id: w.id,
                name: w.destination,
                description: w.description,
                latitude: w.latitude!,
                longitude: w.longitude!,
                category: "OTHER",
                isVisited: false,
              }))}
            className="h-[400px] w-full"
            zoom={2}
          />
        </Card>
      )}

      {/* Lista marzeń */}
      {wishlist.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palmtree className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nie masz jeszcze żadnych miejsc na liście marzeń.
              <br />
              Dodaj miejsca, do których chciałbyś pojechać!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.map((item) => {
            const priorityInfo = getPriorityLabel(item.priority);
            const seasonInfo = getSeasonInfo(item.season);
            const isInterested = item.interestedUserIds.includes(currentUserId);
            const interestedMembers = members.filter((m) =>
              item.interestedUserIds.includes(m.id)
            );

            return (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {item.imageUrl && (
                  <div className="h-40 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.destination}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{item.destination}</CardTitle>
                      {item.country && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {item.country}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("text-white", priorityInfo.color)}>
                      <Star className="h-3 w-3 mr-1" />
                      {priorityInfo.label}
                    </Badge>
                    {seasonInfo && (
                      <Badge variant="secondary">
                        <seasonInfo.icon className={cn("h-3 w-3 mr-1", seasonInfo.color)} />
                        {item.season}
                      </Badge>
                    )}
                  </div>

                  {item.estimatedBudget && (
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Szacowany budżet: {item.estimatedBudget} {item.currency}
                      </span>
                    </div>
                  )}

                  {interestedMembers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div className="flex -space-x-2">
                        {interestedMembers.map((member) => (
                          <Avatar
                            key={member.id}
                            className="h-6 w-6 border-2 border-background"
                          >
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback
                              style={{ backgroundColor: member.color }}
                              className="text-white text-xs"
                            >
                              {member.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant={isInterested ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => handleToggleInterest(item)}
                    >
                      <Heart
                        className={cn("h-4 w-4 mr-2", isInterested && "fill-current")}
                      />
                      {isInterested ? "Interesuje mnie" : "Zainteresowanie"}
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => window.location.href = `/trips?wishlistId=${item.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Zaplanuj wyjazd
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Dodane przez {item.addedBy.name} •{" "}
                    {format(new Date(item.createdAt), "d MMM yyyy", { locale: pl })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog dodawania/edycji */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingItem(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edytuj miejsce" : "Dodaj nowe miejsce do listy marzeń"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="destination">Miejsce docelowe *</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="np. Paryż, Maledives, Tokio"
                />
              </div>

              <div>
                <Label htmlFor="country">Kraj</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="np. Francja"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="address">Adres (opcjonalnie)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="np. 5 Avenue Anatole France, 75007 Paris"
                />
              </div>

              <div>
                <Label htmlFor="season">Pora roku</Label>
                <Select value={formData.season} onValueChange={(v) => setFormData({ ...formData, season: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz porę roku" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lato">Lato</SelectItem>
                    <SelectItem value="zima">Zima</SelectItem>
                    <SelectItem value="wiosna">Wiosna</SelectItem>
                    <SelectItem value="jesień">Jesień</SelectItem>
                    <SelectItem value="cały rok">Cały rok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priorytet</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(v) => setFormData({ ...formData, priority: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ Bardzo wysoki</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ Wysoki</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Średni</SelectItem>
                    <SelectItem value="2">⭐⭐ Niski</SelectItem>
                    <SelectItem value="1">⭐ Bardzo niski</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="estimatedBudget">Szacowany budżet</Label>
                <Input
                  id="estimatedBudget"
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Opis</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dlaczego chcesz tam pojechać?"
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notatki</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Dodatkowe informacje..."
                  rows={2}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="imageUrl">Zdjęcie miejsca</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="imageUrl"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="Lub wklej link do zdjęcia..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      {isUploading ? "Uploading..." : "Prześlij"}
                    </Button>
                  </div>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await upload(file);
                      }
                    }}
                  />
                  {formData.imageUrl && (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                      <img
                        src={formData.imageUrl}
                        alt="Podgląd zdjęcia miejsca"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => setFormData({ ...formData, imageUrl: "" })}
                      >
                        Usuń
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <Label>Lokalizacja GPS (opcjonalnie)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Szerokość (lat)"
                    type="number"
                    step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                  <Input
                    placeholder="Długość (lng)"
                    type="number"
                    step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={async () => {
                      const query = formData.address ||
                        `${formData.destination}${formData.country ? ', ' + formData.country : ''}`;
                      try {
                        const response = await fetch(
                          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
                        );
                        if (response.ok) {
                          const data = await response.json();
                          if (data && data.length > 0) {
                            setFormData({
                              ...formData,
                              latitude: data[0].lat,
                              longitude: data[0].lon,
                              address: data[0].display_name,
                            });
                            toast.success("Znaleziono lokalizację!");
                          } else {
                            toast.error("Nie znaleziono lokalizacji");
                          }
                        }
                      } catch {
                        toast.error("Błąd wyszukiwania");
                      }
                    }}
                    title="Znajdź na mapie"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Kliknij ikonę mapy aby automatycznie znaleźć współrzędne
                </p>
              </div>

              <div className="col-span-2">
                <Label>Zainteresowani członkowie</Label>
                <div className="space-y-2 mt-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.interestedUserIds.includes(member.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              interestedUserIds: [...formData.interestedUserIds, member.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              interestedUserIds: formData.interestedUserIds.filter(
                                (id) => id !== member.id
                              ),
                            });
                          }
                        }}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar || undefined} />
                        <AvatarFallback
                          style={{ backgroundColor: member.color }}
                          className="text-white text-xs"
                        >
                          {member.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddOrUpdate}>
              {editingItem ? "Zapisz zmiany" : "Dodaj miejsce"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

