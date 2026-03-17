"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Tag, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskLabel = {
  id: string;
  name: string;
  color: string;
  taskCount?: number;
};

interface LabelsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLabelsChanged?: () => void;
}

const PRESET_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#F59E0B", // amber
  "#EAB308", // yellow
  "#84CC16", // lime
  "#22C55E", // green
  "#10B981", // emerald
  "#14B8A6", // teal
  "#06B6D4", // cyan
  "#0EA5E9", // sky
  "#3B82F6", // blue
  "#6366F1", // indigo
  "#8B5CF6", // violet
  "#A855F7", // purple
  "#D946EF", // fuchsia
  "#EC4899", // pink
];

export function LabelsManagerDialog({ open, onOpenChange, onLabelsChanged }: LabelsManagerDialogProps) {
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState<TaskLabel | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (open) {
      loadLabels();
    }
  }, [open]);

  const loadLabels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(data);
      }
    } catch (error) {
      console.error("Error loading labels:", error);
      toast.error("Nie udało się załadować etykiet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      toast.error("Podaj nazwę etykiety");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
        }),
      });

      if (response.ok) {
        const newLabel = await response.json();
        setLabels([...labels, newLabel]);
        setNewLabelName("");
        setNewLabelColor(PRESET_COLORS[0]);
        toast.success("Utworzono etykietę");
        onLabelsChanged?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się utworzyć etykiety");
      }
    } catch (error) {
      console.error("Error creating label:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateLabel = async () => {
    if (!editingLabel) return;

    try {
      const response = await fetch(`/api/labels/${editingLabel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingLabel.name,
          color: editingLabel.color,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setLabels(labels.map((l) => (l.id === updated.id ? updated : l)));
        setEditingLabel(null);
        toast.success("Zaktualizowano etykietę");
        onLabelsChanged?.();
      } else {
        toast.error("Nie udało się zaktualizować etykiety");
      }
    } catch (error) {
      console.error("Error updating label:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć tę etykietę? Zostanie ona usunięta ze wszystkich zadań.")) {
      return;
    }

    try {
      const response = await fetch(`/api/labels/${labelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setLabels(labels.filter((l) => l.id !== labelId));
        toast.success("Usunięto etykietę");
        onLabelsChanged?.();
      } else {
        toast.error("Nie udało się usunąć etykiety");
      }
    } catch (error) {
      console.error("Error deleting label:", error);
      toast.error("Wystąpił błąd");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Zarządzaj etykietami
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tworzenie nowej etykiety */}
          <div className="space-y-3 p-4 border rounded-lg">
            <h3 className="font-medium">Nowa etykieta</h3>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <Input
                placeholder="Nazwa etykiety..."
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateLabel();
                  }
                }}
              />
              <div className="relative">
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={(e) => setNewLabelColor(e.target.value)}
                  className="h-10 w-20 rounded border cursor-pointer"
                />
              </div>
              <Button onClick={handleCreateLabel} disabled={isCreating || !newLabelName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj
              </Button>
            </div>

            {/* Preset colors */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-all hover:scale-110",
                    newLabelColor === color ? "border-black ring-2 ring-offset-2" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewLabelColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Lista etykiet */}
          <div className="space-y-2">
            <h3 className="font-medium">Istniejące etykiety ({labels.length})</h3>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ładowanie...
              </div>
            ) : labels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Brak etykiet. Utwórz pierwszą!
              </div>
            ) : (
              <div className="space-y-2">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    {editingLabel?.id === label.id ? (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingLabel.name}
                            onChange={(e) =>
                              setEditingLabel({ ...editingLabel, name: e.target.value })
                            }
                            className="flex-1"
                          />
                          <input
                            type="color"
                            value={editingLabel.color}
                            onChange={(e) =>
                              setEditingLabel({ ...editingLabel, color: e.target.value })
                            }
                            className="h-10 w-20 rounded border cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleUpdateLabel}
                          >
                            Zapisz
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLabel(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            style={{
                              backgroundColor: label.color + "20",
                              borderColor: label.color,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </Badge>
                          {label.taskCount !== undefined && label.taskCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {label.taskCount} {label.taskCount === 1 ? "zadanie" : "zadań"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingLabel(label)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteLabel(label.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

