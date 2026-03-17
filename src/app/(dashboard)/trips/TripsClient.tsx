"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  format,
  differenceInDays,
  isPast,
  isFuture,
  isWithinInterval,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  MapPin,
  Calendar,
  Users,
  CheckSquare,
  MoreVertical,
  Trash2,
  Plane,
  Car,
  Mountain,
  Palmtree,
  Building,
  ChevronDown,
  ChevronUp,
  Heart,
} from "lucide-react";
import { TripWishlistClient } from "@/components/trips/TripWishlistClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Trip, TripParticipant, TripChecklist, TripChecklistItem } from "@prisma/client";
import { cn } from "@/lib/utils";

type TripWithRelations = Trip & {
  participants: (TripParticipant & {
    user: { id: string; name: string | null; avatar: string | null; color: string };
  })[];
  checklists: (TripChecklist & {
    items: TripChecklistItem[];
  })[];
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

type WishlistItemWithUser = {
  id: string;
  destination: string;
  description: string | null;
  country: string | null;
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

interface TripsClientProps {
  trips: TripWithRelations[];
  wishlist: WishlistItemWithUser[];
  members: Member[];
  currentUserId: string;
}

const tripTypes = [
  { value: "vacation", label: "Wakacje", icon: Palmtree, color: "text-green-500" },
  { value: "business", label: "Służbowy", icon: Building, color: "text-blue-500" },
  { value: "weekend", label: "Weekend", icon: Car, color: "text-orange-500" },
  { value: "mountains", label: "Góry", icon: Mountain, color: "text-purple-500" },
  { value: "flight", label: "Lot", icon: Plane, color: "text-cyan-500" },
];

export function TripsClient({ trips: initialTrips, wishlist, members, currentUserId }: TripsClientProps) {
  const searchParams = useSearchParams();
  const [trips, setTrips] = useState(initialTrips);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("trips");
  const [newChecklistItem, setNewChecklistItem] = useState<Record<string, string>>({});

  const [newTrip, setNewTrip] = useState({
    name: "",
    destination: "",
    description: "",
    startDate: "",
    endDate: "",
    type: "vacation",
    participants: [] as string[],
  });

  // Obsługa tworzenia wyjazdu z listy marzeń
  useEffect(() => {
    const wishlistId = searchParams?.get("wishlistId");
    if (wishlistId) {
      const wishlistItem = wishlist.find(item => item.id === wishlistId);
      if (wishlistItem) {
        // Użyj setTimeout aby uniknąć synchronicznego setState
        setTimeout(() => {
          setNewTrip({
            name: `Wyjazd do ${wishlistItem.destination}`,
            destination: wishlistItem.destination,
            description: wishlistItem.description || wishlistItem.notes || "",
            startDate: "",
            endDate: "",
            type: "vacation",
            participants: wishlistItem.interestedUserIds,
          });
          setIsAddDialogOpen(true);
        }, 0);
        // Usuń parametr z URL
        window.history.replaceState({}, "", "/trips");
      }
    }
  }, [searchParams, wishlist]);

  // Podział wyjazdów na kategorie
  const now = new Date();
  const upcomingTrips = trips.filter((t) => isFuture(new Date(t.startDate)));
  const currentTrips = trips.filter((t) =>
    isWithinInterval(now, { start: new Date(t.startDate), end: new Date(t.endDate) })
  );
  const pastTrips = trips.filter((t) => isPast(new Date(t.endDate)));

  const handleAddTrip = async () => {
    if (!newTrip.name || !newTrip.startDate || !newTrip.endDate) {
      toast.error("Wypełnij wymagane pola");
      return;
    }

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTrip,
          startDate: new Date(newTrip.startDate).toISOString(),
          endDate: new Date(newTrip.endDate).toISOString(),
        }),
      });

      if (response.ok) {
        const trip = await response.json();
        setTrips([...trips, trip]);
        setIsAddDialogOpen(false);
        setNewTrip({
          name: "",
          destination: "",
          description: "",
          startDate: "",
          endDate: "",
          type: "vacation",
          participants: [],
        });
        toast.success("Wyjazd został dodany");
      }
    } catch {
      toast.error("Nie udało się dodać wyjazdu");
    }
  };

  const handleDeleteTrip = async (id: string) => {
    try {
      const response = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (response.ok) {
        setTrips(trips.filter((t) => t.id !== id));
        toast.success("Wyjazd został usunięty");
      }
    } catch {
      toast.error("Nie udało się usunąć wyjazdu");
    }
  };

  const handleToggleChecklistItem = async (tripId: string, checklistId: string, itemId: string, isPacked: boolean) => {
    try {
      await fetch(`/api/trips/${tripId}/checklist/${checklistId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPacked: !isPacked }),
      });

      setTrips(trips.map((trip) => {
        if (trip.id !== tripId) return trip;
        return {
          ...trip,
          checklists: trip.checklists.map((checklist) => {
            if (checklist.id !== checklistId) return checklist;
            return {
              ...checklist,
              items: checklist.items.map((item) =>
                item.id === itemId ? { ...item, isPacked: !isPacked } : item
              ),
            };
          }),
        };
      }));
    } catch {
      toast.error("Nie udało się zaktualizować");
    }
  };

  const handleAddChecklistItem = async (tripId: string, checklistId: string) => {
    const itemName = newChecklistItem[checklistId];
    if (!itemName?.trim()) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName }),
      });

      if (response.ok) {
        const item = await response.json();
        setTrips(trips.map((trip) => {
          if (trip.id !== tripId) return trip;
          return {
            ...trip,
            checklists: trip.checklists.map((checklist) => {
              if (checklist.id !== checklistId) return checklist;
              return { ...checklist, items: [...checklist.items, item] };
            }),
          };
        }));
        setNewChecklistItem({ ...newChecklistItem, [checklistId]: "" });
      }
    } catch {
      toast.error("Nie udało się dodać elementu");
    }
  };

  const getTypeInfo = (type: string) => {
    return tripTypes.find((t) => t.value === type) || tripTypes[0];
  };

  const renderTripCard = (trip: TripWithRelations) => {
    const typeInfo = getTypeInfo("vacation");
    const TypeIcon = typeInfo.icon;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(trip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const daysUntil = differenceInDays(startDate, today);
    const isExpanded = expandedTrip === trip.id;

    const totalItems = trip.checklists.reduce((sum, c) => sum + c.items.length, 0);
    const checkedItems = trip.checklists.reduce(
      (sum, c) => sum + c.items.filter((i) => i.isPacked).length,
      0
    );
    const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

    return (
      <Card key={trip.id} className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <a
              href={`/trips/${trip.id}`}
              className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
            >
              <div className={cn("p-2 rounded-lg bg-muted", typeInfo.color)}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{trip.name}</CardTitle>
                {trip.destination && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {trip.destination}
                  </div>
                )}
              </div>
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.location.href = `/trips/${trip.id}`}>
                  Zobacz szczegóły
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteTrip(trip.id)} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Daty */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(trip.startDate), "d MMM", { locale: pl })} -{" "}
              {format(new Date(trip.endDate), "d MMM yyyy", { locale: pl })}
            </span>
            {daysUntil > 0 && (
              <Badge variant="secondary" className="ml-auto">
                za {daysUntil} dni
              </Badge>
            )}
            {daysUntil === 0 && (
              <Badge className="ml-auto bg-green-500">Dziś!</Badge>
            )}
          </div>

          {/* Uczestnicy */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {trip.participants.slice(0, 5).map((p) => (
                <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={p.user.avatar || undefined} />
                  <AvatarFallback
                    style={{ backgroundColor: p.user.color }}
                    className="text-white text-xs"
                  >
                    {p.user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {trip.participants.length > 5 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{trip.participants.length - 5}
                </div>
              )}
            </div>
          </div>

          {/* Postęp pakowania */}
          {totalItems > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  Pakowanie
                </span>
                <span className="text-muted-foreground">
                  {checkedItems}/{totalItems}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Przycisk szczegółów */}
          <Button
            className="w-full"
            variant="outline"
            onClick={() => window.location.href = `/trips/${trip.id}`}
          >
            Zobacz szczegóły wyjazdu
          </Button>

          {/* Rozwijana checklista */}
          <Collapsible open={isExpanded} onOpenChange={() => setExpandedTrip(isExpanded ? null : trip.id)}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Lista rzeczy do zabrania</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-2">
              {trip.checklists.map((checklist) => (
                <div key={checklist.id} className="space-y-2">
                  <h4 className="font-medium text-sm">{checklist.name}</h4>
                  <div className="space-y-1">
                    {checklist.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={item.isPacked}
                          onCheckedChange={() =>
                            handleToggleChecklistItem(trip.id, checklist.id, item.id, item.isPacked)
                          }
                        />
                        <span className={cn("text-sm", item.isPacked && "line-through text-muted-foreground")}>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Dodaj element..."
                      value={newChecklistItem[checklist.id] || ""}
                      onChange={(e) =>
                        setNewChecklistItem({ ...newChecklistItem, [checklist.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem(trip.id, checklist.id)}
                      className="h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddChecklistItem(trip.id, checklist.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {trip.checklists.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Brak checklisty - możesz ją dodać w szczegółach wyjazdu
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Wyjazdy</h1>
          <p className="text-muted-foreground">
            Planuj podróże i pakowanie z rodziną
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy wyjazd
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="trips">
            <Plane className="h-4 w-4 mr-2" />
            Zaplanowane wyjazdy
          </TabsTrigger>
          <TabsTrigger value="wishlist">
            <Heart className="h-4 w-4 mr-2" />
            Lista marzeń
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trips" className="space-y-6">
      {/* Aktualne wyjazdy */}
      {currentTrips.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Badge className="bg-green-500">W trakcie</Badge>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentTrips.map(renderTripCard)}
          </div>
        </div>
      )}

      {/* Nadchodzące wyjazdy */}
      {upcomingTrips.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Nadchodzące</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingTrips.map(renderTripCard)}
          </div>
        </div>
      )}

      {/* Minione wyjazdy */}
      {pastTrips.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <span className="text-lg font-semibold">Minione ({pastTrips.length})</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-3 opacity-60">
              {pastTrips.map(renderTripCard)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Brak wyjazdów */}
      {trips.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plane className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Brak zaplanowanych wyjazdów</h3>
            <p className="text-muted-foreground mb-4">
              Zaplanuj swoją pierwszą podróż!
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj wyjazd
            </Button>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="wishlist">
          <TripWishlistClient
            wishlist={wishlist}
            members={members}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog dodawania wyjazdu */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nowy wyjazd</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nazwa wyjazdu</Label>
              <Input
                placeholder="Np. Wakacje nad morzem"
                value={newTrip.name}
                onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Miejsce docelowe</Label>
              <Input
                placeholder="Np. Sopot"
                value={newTrip.destination}
                onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Typ wyjazdu</Label>
              <Select
                value={newTrip.type}
                onValueChange={(v) => setNewTrip({ ...newTrip, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tripTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <type.icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data rozpoczęcia</Label>
                <Input
                  type="date"
                  value={newTrip.startDate}
                  onChange={(e) => setNewTrip({ ...newTrip, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data zakończenia</Label>
                <Input
                  type="date"
                  value={newTrip.endDate}
                  onChange={(e) => setNewTrip({ ...newTrip, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Opis (opcjonalnie)</Label>
              <Textarea
                placeholder="Dodatkowe informacje o wyjeździe..."
                value={newTrip.description}
                onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Uczestnicy</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((member) => (
                  <Button
                    key={member.id}
                    type="button"
                    variant={newTrip.participants.includes(member.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setNewTrip({
                        ...newTrip,
                        participants: newTrip.participants.includes(member.id)
                          ? newTrip.participants.filter((id) => id !== member.id)
                          : [...newTrip.participants, member.id],
                      });
                    }}
                  >
                    {member.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddTrip}>Dodaj wyjazd</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

