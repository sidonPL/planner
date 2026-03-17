"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type ScopeType = "single" | "future" | "all";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface RoutineEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  initialData: {
    title: string;
    description: string | null;
    priority: Priority;
    dueTime: string | null;
    categoryId: string | null;
  };
  onSuccess: () => void;
}

export function RoutineEditDialog({
  open,
  onOpenChange,
  routineId,
  initialData,
  onSuccess,
}: RoutineEditDialogProps) {
  const [scope, setScope] = useState<ScopeType>("future");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description || "");
  const [priority, setPriority] = useState<Priority>(initialData.priority);
  const [dueTime, setDueTime] = useState(initialData.dueTime || "");

  useEffect(() => {
    if (open) {
      setTitle(initialData.title);
      setDescription(initialData.description || "");
      setPriority(initialData.priority);
      setDueTime(initialData.dueTime || "");
    }
  }, [open, initialData]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Błąd",
        description: "Tytuł jest wymagany",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          priority,
          dueTime: dueTime || null,
          updateScope: scope,
        }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zaktualizować rutyny");
      }

      const data = await response.json();

      toast({
        title: "Rutyna zaktualizowana",
        description: data.message || `Zaktualizowano ${data.updatedCount} instancji`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating routine:", error);
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Wystąpił błąd",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edytuj rutynę</DialogTitle>
          <DialogDescription>
            Wprowadź zmiany i wybierz zakres aktualizacji
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nazwa rutyny"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opcjonalny opis"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priorytet</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Niski</SelectItem>
                  <SelectItem value="MEDIUM">Średni</SelectItem>
                  <SelectItem value="HIGH">Wysoki</SelectItem>
                  <SelectItem value="URGENT">Pilny</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueTime">Godzina</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zakres aktualizacji</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as ScopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tylko ta instancja</span>
                    <span className="text-xs text-muted-foreground">
                      Zmieni tylko to jedno wystąpienie
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="future">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Przyszłe instancje</span>
                    <span className="text-xs text-muted-foreground">
                      Zmieni wszystkie przyszłe wystąpienia (od dzisiaj)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Wszystkie instancje</span>
                    <span className="text-xs text-muted-foreground">
                      Zmieni wszystkie wystąpienia (włącznie z przeszłymi)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

