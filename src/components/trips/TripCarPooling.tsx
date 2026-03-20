"use client";

import { useState, useEffect } from "react";
import { Car, Plus, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
}

interface CarPool {
  id: string;
  driverId: string;
  seats: number;
  route: string | null;
  cost: number | null;
  passengers: string[];
  notes: string | null;
  driver: User;
}

interface TripCarPoolingProps {
  tripId: string;
  members: User[];
  currentUserId: string;
}

export function TripCarPooling({ tripId, members, currentUserId }: TripCarPoolingProps) {
  const [carPools, setCarPools] = useState<CarPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // ID car pool being acted upon
  const [newCarPool, setNewCarPool] = useState({
    driverId: currentUserId,
    seats: 4,
    route: "",
    cost: 0,
    notes: "",
  });

  useEffect(() => {
    const loadCarPools = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/trips/${tripId}/car-pools`);
        if (response.ok) {
          const data = await response.json();
          setCarPools(data);
        }
      } catch (error) {
        console.error("Error fetching car pools:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCarPools();
  }, [tripId]);

  const handleAddCarPool = async () => {
    if (newCarPool.seats < 1) {
      toast.error("Liczba miejsc musi być większa niż 0");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/car-pools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCarPool),
      });

      if (response.ok) {
        const carPool = await response.json();
        setCarPools([...carPools, carPool]);
        setShowAddDialog(false);
        setNewCarPool({
          driverId: currentUserId,
          seats: 4,
          route: "",
          cost: 0,
          notes: "",
        });
        toast.success("Dodano ofertę przejazdu");
      }
    } catch (error) {
      console.error("Error adding car pool:", error);
      toast.error("Nie udało się dodać oferty");
    }
  };

  const handleJoinCarPool = async (poolId: string, currentPassengers: string[]) => {
    setActionLoading(poolId);
    try {
      // Optimistic update
      setCarPools(carPools.map((cp) =>
        cp.id === poolId
          ? { ...cp, passengers: [...currentPassengers, currentUserId] }
          : cp
      ));

      const response = await fetch(`/api/trips/${tripId}/car-pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengers: [...currentPassengers, currentUserId],
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCarPools(carPools.map((cp) => (cp.id === poolId ? updated : cp)));
        toast.success("Zarezerwowano miejsce");
      } else {
        // Rollback optimistic update
        setCarPools(carPools.map((cp) =>
          cp.id === poolId ? { ...cp, passengers: currentPassengers } : cp
        ));
        toast.error("Nie udało się zarezerwować miejsca");
      }
    } catch (error) {
      // Rollback optimistic update
      setCarPools(carPools.map((cp) =>
        cp.id === poolId ? { ...cp, passengers: currentPassengers } : cp
      ));
      console.error("Error joining car pool:", error);
      toast.error("Nie udało się zarezerwować miejsca");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveCarPool = async (poolId: string, currentPassengers: string[]) => {
    setActionLoading(poolId);
    try {
      const response = await fetch(`/api/trips/${tripId}/car-pools/${poolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passengers: currentPassengers.filter((id) => id !== currentUserId),
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setCarPools(carPools.map((cp) => (cp.id === poolId ? updated : cp)));
        toast.success("Zwolniono miejsce");
      }
    } catch (error) {
      console.error("Error leaving car pool:", error);
      toast.error("Nie udało się zwolnić miejsca");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCarPool = async (poolId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę ofertę?")) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/car-pools/${poolId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCarPools(carPools.filter((cp) => cp.id !== poolId));
        toast.success("Usunięto ofertę");
      }
    } catch (error) {
      console.error("Error deleting car pool:", error);
      toast.error("Nie udało się usunąć oferty");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Car className="h-5 w-5" />
          Wspólny Transport
        </h3>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Zaoferuj przejazd
        </Button>
      </div>

      {carPools.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Brak ofert przejazdu</p>
            <p className="text-sm mt-2">Dodaj ofertę jeśli jedziesz samochodem</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {carPools.map((pool) => {
            const isDriver = pool.driverId === currentUserId;
            const isPassenger = pool.passengers.includes(currentUserId);
            const availableSeats = pool.seats - pool.passengers.length;
            const costPerPerson = pool.cost && pool.passengers.length > 0
              ? pool.cost / (pool.passengers.length + 1) // +1 dla kierowcy
              : pool.cost;

            return (
              <Card key={pool.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-blue-500" />
                      <span className="text-base">
                        {pool.driver.name || "Nieznany"}
                      </span>
                    </div>
                    {isDriver && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCarPool(pool.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pool.route && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Trasa:</span> {pool.route}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {pool.passengers.length}/{pool.seats} miejsc zajętych
                      </span>
                    </div>
                    {pool.cost && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          Koszt paliwa: {pool.cost} PLN
                        </div>
                        <div className="font-medium text-primary">
                          {costPerPerson?.toFixed(2)} PLN/osoba
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ({pool.passengers.length + 1} os.)
                        </div>
                      </div>
                    )}
                  </div>

                  {pool.passengers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {pool.passengers.map((passengerId) => {
                        const passenger = members.find((m) => m.id === passengerId);
                        return (
                          <div
                            key={passengerId}
                            className="flex items-center gap-1 text-xs bg-accent rounded-full px-2 py-1"
                          >
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={passenger?.avatar || ""} />
                              <AvatarFallback style={{ backgroundColor: passenger?.color }}>
                                {passenger?.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            {passenger?.name}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pool.notes && (
                    <div className="text-sm text-muted-foreground border-t pt-2">
                      {pool.notes}
                    </div>
                  )}

                  {!isDriver && (
                    <div className="pt-2">
                      {isPassenger ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLeaveCarPool(pool.id, pool.passengers)}
                          disabled={actionLoading === pool.id}
                          className="w-full"
                        >
                          {actionLoading === pool.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Zwalnianie...
                            </>
                          ) : (
                            "Zwolnij miejsce"
                          )}
                        </Button>
                      ) : availableSeats > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleJoinCarPool(pool.id, pool.passengers)}
                          disabled={actionLoading === pool.id}
                          className="w-full"
                        >
                          {actionLoading === pool.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Rezerwuję...
                            </>
                          ) : (
                            "Zarezerwuj miejsce"
                          )}
                        </Button>
                      ) : (
                        <Button size="sm" disabled className="w-full">
                          Brak wolnych miejsc
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj ofertę przejazdu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Liczba wolnych miejsc</Label>
              <Input
                type="number"
                min="1"
                value={newCarPool.seats}
                onChange={(e) => setNewCarPool({ ...newCarPool, seats: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Trasa (opcjonalnie)</Label>
              <Input
                value={newCarPool.route}
                onChange={(e) => setNewCarPool({ ...newCarPool, route: e.target.value })}
                placeholder="np. Warszawa → Kraków"
              />
            </div>
            <div className="space-y-2">
              <Label>Koszt paliwa (PLN)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newCarPool.cost}
                onChange={(e) => setNewCarPool({ ...newCarPool, cost: parseFloat(e.target.value) })}
                placeholder="Zostanie podzielony między uczestników"
              />
            </div>
            <div className="space-y-2">
              <Label>Notatki (opcjonalnie)</Label>
              <Textarea
                value={newCarPool.notes}
                onChange={(e) => setNewCarPool({ ...newCarPool, notes: e.target.value })}
                placeholder="np. Wyjazd o 8:00, miejsce spotkania..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddCarPool}>Dodaj ofertę</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
