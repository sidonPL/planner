"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Plus,
  Trash2,
  Clock,
  MapPin,
  X,
  Car,
  UtensilsCrossed,
  Camera,
  Palmtree,
  MoreHorizontal
} from "lucide-react";
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

interface Activity {
  id?: string;
  time: string;
  title: string;
  description?: string;
  location?: string;
  duration?: number;
  category?: string;
  notes?: string;
}

interface ItineraryDay {
  id: string;
  date: string;
  title?: string;
  notes?: string;
  activities: Activity[];
}

interface TripItineraryProps {
  tripId: string;
  startDate: Date;
  endDate: Date;
}

const categoryConfig = {
  transport: { label: "Transport", color: "bg-blue-500", icon: Car },
  jedzenie: { label: "Jedzenie", color: "bg-green-500", icon: UtensilsCrossed },
  zwiedzanie: { label: "Zwiedzanie", color: "bg-purple-500", icon: Camera },
  wypoczynek: { label: "Wypoczynek", color: "bg-yellow-500", icon: Palmtree },
  inne: { label: "Inne", color: "bg-gray-500", icon: MoreHorizontal },
};

export function TripItinerary({ tripId, startDate, endDate }: TripItineraryProps) {
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDay, setNewDay] = useState({
    date: "",
    title: "",
    notes: "",
    activities: [] as Activity[],
  });
  const [newActivity, setNewActivity] = useState<Activity>({
    time: "09:00",
    title: "",
    description: "",
    location: "",
    duration: 60,
    category: "zwiedzanie",
    notes: "",
  });

  const fetchItinerary = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary`);
      if (response.ok) {
        const data = await response.json();
        setItinerary(data);
      }
    } catch (error) {
      console.error("Error fetching itinerary:", error);
      toast.error("Nie udało się pobrać planu");
    }
  }, [tripId]);

  useEffect(() => {
    const loadItinerary = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/itinerary`);
        if (response.ok) {
          const data = await response.json();
          setItinerary(data);
        }
      } catch (error) {
        console.error("Error fetching itinerary:", error);
        toast.error("Nie udało się pobrać planu");
      } finally {
        setLoading(false);
      }
    };

    loadItinerary();
  }, [tripId]);

  const handleAddDay = async () => {
    if (!newDay.date || newDay.activities.length === 0) {
      toast.error("Wybierz datę i dodaj przynajmniej jedną aktywność");
      return;
    }

    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDay),
      });

      if (response.ok) {
        toast.success("Dodano dzień do planu");
        setShowAddDay(false);
        setNewDay({ date: "", title: "", notes: "", activities: [] });
        fetchItinerary();
      } else {
        throw new Error("Failed to add day");
      }
    } catch (error) {
      console.error("Error adding day:", error);
      toast.error("Nie udało się dodać dnia");
    }
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten dzień?")) return;

    try {
      const response = await fetch(`/api/trips/${tripId}/itinerary/${dayId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Usunięto dzień");
        fetchItinerary();
      } else {
        throw new Error("Failed to delete day");
      }
    } catch (error) {
      console.error("Error deleting day:", error);
      toast.error("Nie udało się usunąć dnia");
    }
  };

  const addActivityToNewDay = () => {
    if (!newActivity.title) {
      toast.error("Wprowadź nazwę aktywności");
      return;
    }

    setNewDay({
      ...newDay,
      activities: [...newDay.activities, { ...newActivity }],
    });

    setNewActivity({
      time: "09:00",
      title: "",
      description: "",
      location: "",
      duration: 60,
      category: "zwiedzanie",
      notes: "",
    });
  };

  const removeActivityFromNewDay = (index: number) => {
    setNewDay({
      ...newDay,
      activities: newDay.activities.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return <div className="flex justify-center p-8">Ładowanie planu...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Plan wyjazdu</h3>
          <p className="text-sm text-muted-foreground">
            Harmonogram godzinowy aktywności
          </p>
        </div>
        <Button onClick={() => setShowAddDay(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj dzień
        </Button>
      </div>

      {itinerary.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Brak planu wyjazdu. Kliknij &quot;Dodaj dzień&quot;, aby stworzyć harmonogram.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {itinerary.map((day) => (
            <Card key={day.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {day.title || format(parseISO(day.date), "EEEE, d MMMM yyyy", { locale: pl })}
                    </CardTitle>
                    {day.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{day.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDay(day.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {day.activities.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="font-mono">
                          {activity.time}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{activity.title}</h4>
                          {activity.category && (
                            <Badge
                              className={categoryConfig[activity.category as keyof typeof categoryConfig]?.color}
                            >
                              {(() => {
                                const config = categoryConfig[activity.category as keyof typeof categoryConfig];
                                const Icon = config?.icon;
                                return (
                                  <>
                                    {Icon && <Icon className="h-3 w-3 mr-1" />}
                                    {config?.label}
                                  </>
                                );
                              })()}
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                        {activity.location && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {activity.location}
                          </div>
                        )}
                        {activity.duration && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {activity.duration} min
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog dodawania dnia */}
      <Dialog open={showAddDay} onOpenChange={setShowAddDay}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dodaj dzień do planu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={newDay.date}
                onChange={(e) => setNewDay({ ...newDay, date: e.target.value })}
                min={format(startDate, "yyyy-MM-dd")}
                max={format(endDate, "yyyy-MM-dd")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tytuł dnia (opcjonalnie)</Label>
              <Input
                id="title"
                value={newDay.title}
                onChange={(e) => setNewDay({ ...newDay, title: e.target.value })}
                placeholder="np. Dzień 1 - Zwiedzanie centrum"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
              <Textarea
                id="notes"
                value={newDay.notes}
                onChange={(e) => setNewDay({ ...newDay, notes: e.target.value })}
                placeholder="Dodatkowe informacje o tym dniu"
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Aktywności</h4>

              {newDay.activities.length > 0 && (
                <div className="space-y-2 mb-4">
                  {newDay.activities.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">{activity.time}</Badge>
                        <span className="text-sm">{activity.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActivityFromNewDay(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Godzina</Label>
                    <Input
                      type="time"
                      value={newActivity.time}
                      onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategoria</Label>
                    <Select
                      value={newActivity.category}
                      onValueChange={(value) => setNewActivity({ ...newActivity, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryConfig).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {config.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nazwa aktywności</Label>
                  <Input
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    placeholder="np. Zwiedzanie Starego Miasta"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Opis (opcjonalnie)</Label>
                  <Input
                    value={newActivity.description || ""}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="Szczegóły aktywności"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Lokalizacja</Label>
                    <Input
                      value={newActivity.location || ""}
                      onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                      placeholder="Miejsce"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Czas trwania (min)</Label>
                    <Input
                      type="number"
                      value={newActivity.duration || ""}
                      onChange={(e) => setNewActivity({ ...newActivity, duration: parseInt(e.target.value) || undefined })}
                      placeholder="60"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={addActivityToNewDay}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj aktywność
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDay(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddDay}>
              Zapisz dzień
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

