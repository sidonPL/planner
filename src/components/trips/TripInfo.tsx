"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Hotel, Plane, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

interface Accommodation {
  id: string;
  name: string;
  type: string;
  address?: string | null;
  phone?: string | null;
  checkIn?: Date | null;
  checkOut?: Date | null;
  roomInfo?: string | null;
  bookingRef?: string | null;
  website?: string | null;
  notes?: string | null;
}

interface Transport {
  id: string;
  type: string;
  name?: string | null;
  departureFrom?: string | null;
  arrivalTo?: string | null;
  departureTime?: Date | null;
  arrivalTime?: Date | null;
  bookingRef?: string | null;
  seatNumber?: string | null;
  notes?: string | null;
}

interface Trip {
  id: string;
  additionalNotes?: string | null;
}

interface TripInfoProps {
  trip: Trip;
}

export function TripInfo({ trip }: TripInfoProps) {
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccommodation, setShowAddAccommodation] = useState(false);
  const [showAddTransport, setShowAddTransport] = useState(false);

  const [newAccommodation, setNewAccommodation] = useState({
    name: "",
    type: "hotel",
    address: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    roomInfo: "",
    bookingRef: "",
    website: "",
    notes: "",
  });

  const [newTransport, setNewTransport] = useState({
    type: "samolot",
    name: "",
    departureFrom: "",
    arrivalTo: "",
    departureTime: "",
    arrivalTime: "",
    bookingRef: "",
    seatNumber: "",
    notes: "",
  });

  useEffect(() => {
    fetchAccommodations();
    fetchTransports();
  }, [trip.id]);

  const fetchAccommodations = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/accommodations`);
      if (response.ok) {
        const data = await response.json();
        setAccommodations(data);
      }
    } catch (error) {
      console.error("Error fetching accommodations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransports = async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/transports`);
      if (response.ok) {
        const data = await response.json();
        setTransports(data);
      }
    } catch (error) {
      console.error("Error fetching transports:", error);
    }
  };

  const handleAddAccommodation = async () => {
    if (!newAccommodation.name) {
      toast.error("Wprowadź nazwę zakwaterowania");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${trip.id}/accommodations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccommodation),
      });

      if (response.ok) {
        toast.success("Dodano zakwaterowanie");
        setShowAddAccommodation(false);
        setNewAccommodation({
          name: "",
          type: "hotel",
          address: "",
          phone: "",
          checkIn: "",
          checkOut: "",
          roomInfo: "",
          bookingRef: "",
          website: "",
          notes: "",
        });
        fetchAccommodations();
      }
    } catch (error) {
      console.error("Error adding accommodation:", error);
      toast.error("Nie udało się dodać zakwaterowania");
    }
  };

  const handleDeleteAccommodation = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć to zakwaterowanie?")) return;

    try {
      const response = await fetch(`/api/trips/${trip.id}/accommodations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Usunięto zakwaterowanie");
        fetchAccommodations();
      }
    } catch (error) {
      console.error("Error deleting accommodation:", error);
      toast.error("Nie udało się usunąć zakwaterowania");
    }
  };

  const handleAddTransport = async () => {
    if (!newTransport.type) {
      toast.error("Wybierz typ transportu");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${trip.id}/transports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransport),
      });

      if (response.ok) {
        toast.success("Dodano transport");
        setShowAddTransport(false);
        setNewTransport({
          type: "samolot",
          name: "",
          departureFrom: "",
          arrivalTo: "",
          departureTime: "",
          arrivalTime: "",
          bookingRef: "",
          seatNumber: "",
          notes: "",
        });
        fetchTransports();
      }
    } catch (error) {
      console.error("Error adding transport:", error);
      toast.error("Nie udało się dodać transportu");
    }
  };

  const handleDeleteTransport = async (id: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten transport?")) return;

    try {
      const response = await fetch(`/api/trips/${trip.id}/transports/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Usunięto transport");
        fetchTransports();
      }
    } catch (error) {
      console.error("Error deleting transport:", error);
      toast.error("Nie udało się usunąć transportu");
    }
  };

  const accommodationTypeLabels: Record<string, string> = {
    hotel: "🏨 Hotel",
    apartament: "🏠 Apartament",
    hostel: "🛏️ Hostel",
    kemping: "⛺ Kemping",
    inne: "📍 Inne",
  };

  const transportTypeLabels: Record<string, string> = {
    samolot: "✈️ Samolot",
    pociag: "🚆 Pociąg",
    samochod: "🚗 Samochód",
    autobus: "🚌 Autobus",
    prom: "⛴️ Prom",
    inne: "🚀 Inne",
  };

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Dodatkowe informacje</h3>
          <p className="text-sm text-muted-foreground">
            Zakwaterowanie, transport i inne szczegóły
          </p>
        </div>
      </div>

      {/* Zakwaterowanie */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hotel className="h-5 w-5" />
              Zakwaterowanie
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddAccommodation(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accommodations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak dodanych miejsc zakwaterowania
            </p>
          ) : (
            <div className="space-y-3">
              {accommodations.map((acc) => (
                <div key={acc.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{acc.name}</h4>
                        <Badge variant="outline">{accommodationTypeLabels[acc.type] || acc.type}</Badge>
                      </div>
                      {acc.address && <p className="text-sm text-muted-foreground">📍 {acc.address}</p>}
                      {acc.phone && <p className="text-sm text-muted-foreground">📞 {acc.phone}</p>}
                      {acc.roomInfo && <p className="text-sm text-muted-foreground">🚪 {acc.roomInfo}</p>}
                      {(acc.checkIn || acc.checkOut) && (
                        <div className="flex gap-4 mt-2 text-sm">
                          {acc.checkIn && (
                            <span>
                              <strong>Check-in:</strong> {format(new Date(acc.checkIn), "d MMM, HH:mm", { locale: pl })}
                            </span>
                          )}
                          {acc.checkOut && (
                            <span>
                              <strong>Check-out:</strong> {format(new Date(acc.checkOut), "d MMM, HH:mm", { locale: pl })}
                            </span>
                          )}
                        </div>
                      )}
                      {acc.bookingRef && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nr rezerwacji:</strong> {acc.bookingRef}
                        </p>
                      )}
                      {acc.notes && <p className="text-sm text-muted-foreground mt-2">{acc.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAccommodation(acc.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transport */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Transport
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddTransport(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Brak dodanych środków transportu
            </p>
          ) : (
            <div className="space-y-3">
              {transports.map((trans) => (
                <div key={trans.id} className="p-4 rounded-lg border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{transportTypeLabels[trans.type] || trans.type}</Badge>
                        {trans.name && <span className="font-medium">{trans.name}</span>}
                      </div>
                      {(trans.departureFrom || trans.arrivalTo) && (
                        <p className="text-sm">
                          {trans.departureFrom && <span>{trans.departureFrom}</span>}
                          {trans.departureFrom && trans.arrivalTo && <span className="mx-2">→</span>}
                          {trans.arrivalTo && <span>{trans.arrivalTo}</span>}
                        </p>
                      )}
                      {(trans.departureTime || trans.arrivalTime) && (
                        <div className="flex gap-4 mt-2 text-sm">
                          {trans.departureTime && (
                            <span>
                              <strong>Wyjazd:</strong> {format(new Date(trans.departureTime), "d MMM, HH:mm", { locale: pl })}
                            </span>
                          )}
                          {trans.arrivalTime && (
                            <span>
                              <strong>Przyjazd:</strong> {format(new Date(trans.arrivalTime), "d MMM, HH:mm", { locale: pl })}
                            </span>
                          )}
                        </div>
                      )}
                      {trans.bookingRef && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Nr rezerwacji:</strong> {trans.bookingRef}
                        </p>
                      )}
                      {trans.seatNumber && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Miejsce:</strong> {trans.seatNumber}
                        </p>
                      )}
                      {trans.notes && <p className="text-sm text-muted-foreground mt-2">{trans.notes}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTransport(trans.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog dodawania zakwaterowania */}
      <Dialog open={showAddAccommodation} onOpenChange={setShowAddAccommodation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj zakwaterowanie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nazwa *</Label>
                <Input
                  value={newAccommodation.name}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, name: e.target.value })}
                  placeholder="np. Hotel Paradise"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={newAccommodation.type}
                  onValueChange={(value) => setNewAccommodation({ ...newAccommodation, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">🏨 Hotel</SelectItem>
                    <SelectItem value="apartament">🏠 Apartament</SelectItem>
                    <SelectItem value="hostel">🛏️ Hostel</SelectItem>
                    <SelectItem value="kemping">⛺ Kemping</SelectItem>
                    <SelectItem value="inne">📍 Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={newAccommodation.address}
                onChange={(e) => setNewAccommodation({ ...newAccommodation, address: e.target.value })}
                placeholder="ul. Przykładowa 123"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={newAccommodation.phone}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, phone: e.target.value })}
                  placeholder="+48 123 456 789"
                />
              </div>
              <div className="space-y-2">
                <Label>Info o pokoju</Label>
                <Input
                  value={newAccommodation.roomInfo}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, roomInfo: e.target.value })}
                  placeholder="np. Pokój 305"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="datetime-local"
                  value={newAccommodation.checkIn}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, checkIn: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="datetime-local"
                  value={newAccommodation.checkOut}
                  onChange={(e) => setNewAccommodation({ ...newAccommodation, checkOut: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nr rezerwacji</Label>
              <Input
                value={newAccommodation.bookingRef}
                onChange={(e) => setNewAccommodation({ ...newAccommodation, bookingRef: e.target.value })}
                placeholder="np. BOOK123456"
              />
            </div>

            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea
                value={newAccommodation.notes}
                onChange={(e) => setNewAccommodation({ ...newAccommodation, notes: e.target.value })}
                placeholder="Dodatkowe informacje"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccommodation(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddAccommodation}>
              Dodaj zakwaterowanie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog dodawania transportu */}
      <Dialog open={showAddTransport} onOpenChange={setShowAddTransport}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj transport</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Typ transportu *</Label>
                <Select
                  value={newTransport.type}
                  onValueChange={(value) => setNewTransport({ ...newTransport, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="samolot">✈️ Samolot</SelectItem>
                    <SelectItem value="pociag">🚆 Pociąg</SelectItem>
                    <SelectItem value="samochod">🚗 Samochód</SelectItem>
                    <SelectItem value="autobus">🚌 Autobus</SelectItem>
                    <SelectItem value="prom">⛴️ Prom</SelectItem>
                    <SelectItem value="inne">🚀 Inne</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nazwa/Linia</Label>
                <Input
                  value={newTransport.name}
                  onChange={(e) => setNewTransport({ ...newTransport, name: e.target.value })}
                  placeholder="np. Ryanair, PKP IC"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skąd</Label>
                <Input
                  value={newTransport.departureFrom}
                  onChange={(e) => setNewTransport({ ...newTransport, departureFrom: e.target.value })}
                  placeholder="np. Warszawa"
                />
              </div>
              <div className="space-y-2">
                <Label>Dokąd</Label>
                <Input
                  value={newTransport.arrivalTo}
                  onChange={(e) => setNewTransport({ ...newTransport, arrivalTo: e.target.value })}
                  placeholder="np. Paryż"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wyjazd</Label>
                <Input
                  type="datetime-local"
                  value={newTransport.departureTime}
                  onChange={(e) => setNewTransport({ ...newTransport, departureTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Przyjazd</Label>
                <Input
                  type="datetime-local"
                  value={newTransport.arrivalTime}
                  onChange={(e) => setNewTransport({ ...newTransport, arrivalTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nr rezerwacji/biletu</Label>
                <Input
                  value={newTransport.bookingRef}
                  onChange={(e) => setNewTransport({ ...newTransport, bookingRef: e.target.value })}
                  placeholder="np. LO1234"
                />
              </div>
              <div className="space-y-2">
                <Label>Nr miejsca</Label>
                <Input
                  value={newTransport.seatNumber}
                  onChange={(e) => setNewTransport({ ...newTransport, seatNumber: e.target.value })}
                  placeholder="np. 12A"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notatki</Label>
              <Textarea
                value={newTransport.notes}
                onChange={(e) => setNewTransport({ ...newTransport, notes: e.target.value })}
                placeholder="Dodatkowe informacje"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTransport(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddTransport}>
              Dodaj transport
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

