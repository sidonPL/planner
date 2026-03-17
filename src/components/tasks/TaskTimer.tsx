"use client";

import { useState, useEffect } from "react";
import { Play, Square, Trash2, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type TimeEntry = {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number | null;
  description: string | null;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  };
};

interface TaskTimerProps {
  taskId: string;
  currentUserId: string;
}

export function TaskTimer({ taskId, currentUserId }: TaskTimerProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualDuration, setManualDuration] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  useEffect(() => {
    loadTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const start = new Date(activeTimer.startTime);
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        setElapsedSeconds(diff);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [activeTimer]);

  const loadTimeEntries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/time`);
      if (response.ok) {
        const data = await response.json();
        setTimeEntries(data);

        // Sprawdź czy jest aktywny timer
        const active = data.find((entry: TimeEntry) => !entry.endTime && entry.user.id === currentUserId);
        if (active) {
          setActiveTimer(active);
        }
      }
    } catch (error) {
      console.error("Error loading time entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const newEntry = await response.json();
        setActiveTimer(newEntry);
        setTimeEntries([newEntry, ...timeEntries]);
        toast.success("Timer uruchomiony");
      } else {
        toast.error("Nie udało się uruchomić timera");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleStopTimer = async () => {
    if (!activeTimer) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/time/${activeTimer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime: new Date().toISOString() }),
      });

      if (response.ok) {
        const updated = await response.json();
        setTimeEntries(timeEntries.map((entry) => (entry.id === updated.id ? updated : entry)));
        setActiveTimer(null);
        setElapsedSeconds(0);
        toast.success(`Zatrzymano timer (${formatDuration(updated.duration)})`);
      } else {
        toast.error("Nie udało się zatrzymać timera");
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleAddManualEntry = async () => {
    const minutes = parseInt(manualDuration);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error("Podaj prawidłowy czas w minutach");
      return;
    }

    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60 * 1000);

    try {
      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: now.toISOString(),
          duration: minutes,
          description: manualDescription.trim() || null,
        }),
      });

      if (response.ok) {
        const newEntry = await response.json();
        setTimeEntries([newEntry, ...timeEntries]);
        setIsAddingManual(false);
        setManualDuration("");
        setManualDescription("");
        toast.success("Dodano wpis czasu");
      } else {
        toast.error("Nie udało się dodać wpisu");
      }
    } catch (error) {
      console.error("Error adding manual entry:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten wpis czasu?")) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}/time/${entryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTimeEntries(timeEntries.filter((entry) => entry.id !== entryId));
        toast.success("Usunięto wpis czasu");
      } else {
        toast.error("Nie udało się usunąć wpisu");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "0min";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalMinutes = timeEntries
    .filter((entry) => entry.duration)
    .reduce((sum, entry) => sum + (entry.duration || 0), 0);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Ładowanie...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Timer */}
      {activeTimer ? (
        <div className="p-4 border rounded-lg bg-primary/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Timer aktywny</span>
            </div>
            <Button variant="destructive" size="sm" onClick={handleStopTimer}>
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>
          <div className="text-3xl font-mono font-bold text-center">
            {formatElapsedTime(elapsedSeconds)}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={handleStartTimer} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
          <Button variant="outline" onClick={() => setIsAddingManual(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj ręcznie
          </Button>
        </div>
      )}

      {/* Total time */}
      {totalMinutes > 0 && (
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Łączny czas</span>
            <span className="text-lg font-semibold">{formatDuration(totalMinutes)}</span>
          </div>
        </div>
      )}

      {/* Time entries list */}
      {timeEntries.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Brak wpisów czasu</p>
          <p className="text-xs mt-1">Rozpocznij timer aby śledzić czas pracy</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Historia ({timeEntries.length})</h4>
          {timeEntries.map((entry) => {
            const canDelete = entry.user.id === currentUserId;
            const isActive = !entry.endTime;

            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.user.avatar || undefined} />
                  <AvatarFallback
                    style={{ backgroundColor: entry.user.color }}
                    className="text-white text-xs"
                  >
                    {entry.user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDuration(entry.duration)}
                    </span>
                    {isActive && (
                      <span className="text-xs text-red-500">aktywny</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.description || entry.user.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(entry.startTime).toLocaleString("pl-PL", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                {canDelete && !isActive && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual entry dialog */}
      <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj czas ręcznie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Czas (minuty)</label>
              <Input
                type="number"
                placeholder="np. 30"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Opis (opcjonalnie)</label>
              <Textarea
                placeholder="Co robiłeś?"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingManual(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddManualEntry}>Dodaj</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

