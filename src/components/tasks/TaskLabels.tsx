"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

interface TaskLabelsProps {
  taskId: string;
  currentLabels: TaskLabel[];
  onChange?: (labels: TaskLabel[]) => void;
}

export function TaskLabels({ taskId, currentLabels, onChange }: TaskLabelsProps) {
  const [labels, setLabels] = useState<TaskLabel[]>(currentLabels);
  const [availableLabels, setAvailableLabels] = useState<TaskLabel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableLabels();
    }
  }, [isOpen]);

  const loadAvailableLabels = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setAvailableLabels(data);
      }
    } catch (error) {
      console.error("Error loading labels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLabel = async (labelId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelId }),
      });

      if (response.ok) {
        const addedLabel = availableLabels.find((l) => l.id === labelId);
        if (addedLabel) {
          const newLabels = [...labels, addedLabel];
          setLabels(newLabels);
          onChange?.(newLabels);
          toast.success("Dodano etykietę");
        }
      } else {
        toast.error("Nie udało się dodać etykiety");
      }
    } catch (error) {
      console.error("Error adding label:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const handleRemoveLabel = async (labelId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/labels?labelId=${labelId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const newLabels = labels.filter((l) => l.id !== labelId);
        setLabels(newLabels);
        onChange?.(newLabels);
        toast.success("Usunięto etykietę");
      } else {
        toast.error("Nie udało się usunąć etykiety");
      }
    } catch (error) {
      console.error("Error removing label:", error);
      toast.error("Wystąpił błąd");
    }
  };

  const unassignedLabels = availableLabels.filter(
    (al) => !labels.some((l) => l.id === al.id)
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {labels.map((label) => (
        <Badge
          key={label.id}
          variant="outline"
          style={{
            backgroundColor: label.color + "20",
            borderColor: label.color,
            color: label.color,
          }}
          className="gap-1 pr-1"
        >
          {label.name}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveLabel(label.id);
            }}
            className="ml-1 rounded-full hover:bg-black/10 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Etykieta
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2">
          {isLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Ładowanie...
            </div>
          ) : unassignedLabels.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {availableLabels.length === 0
                ? "Brak etykiet. Utwórz pierwszą!"
                : "Wszystkie etykiety już przypisane"}
            </div>
          ) : (
            <div className="space-y-1">
              {unassignedLabels.map((label) => (
                <button
                  key={label.id}
                  onClick={() => handleAddLabel(label.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors"
                  )}
                >
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
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

