"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Move, X, CheckSquare, Square } from "lucide-react";

interface BatchActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onMove: (location: string) => void;
  onCancel: () => void;
}

const locationLabels: Record<string, string> = {
  fridge: "Lodówka",
  freezer: "Zamrażarka",
  pantry: "Spiżarnia",
  cabinet: "Szafka",
  other: "Inne",
};

export function BatchActionsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onMove,
  onCancel,
}: BatchActionsToolbarProps) {
  return (
    <div className="sticky top-0 z-10 bg-primary text-primary-foreground p-4 rounded-lg shadow-lg mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CheckSquare className="h-5 w-5" />
          <span className="font-medium">
            Zaznaczono: {selectedCount} / {totalCount}
          </span>
          {selectedCount === totalCount ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDeselectAll}
              className="h-7"
            >
              <Square className="h-3 w-3 mr-1" />
              Odznacz wszystko
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSelectAll}
              className="h-7"
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              Zaznacz wszystko
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Move to location */}
          <Select onValueChange={onMove}>
            <SelectTrigger className="w-[180px] bg-white text-black h-9">
              <Move className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Przenieś do..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(locationLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Usuń ({selectedCount})
          </Button>

          {/* Cancel */}
          <Button variant="secondary" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Anuluj
          </Button>
        </div>
      </div>
    </div>
  );
}

