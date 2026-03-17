"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { List, Rows3, LayoutGrid } from "lucide-react";

export type ViewMode = "list" | "compact" | "kanban";

interface TaskViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const viewModes: Array<{
  id: ViewMode;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "list",
    label: "Lista",
    icon: <List className="h-4 w-4" />,
  },
  {
    id: "compact",
    label: "Kompaktowy",
    icon: <Rows3 className="h-4 w-4" />,
  },
  {
    id: "kanban",
    label: "Kanban",
    icon: <LayoutGrid className="h-4 w-4" />,
  },
];

export function TaskViewToggle({ viewMode, onViewModeChange }: TaskViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-1">
      {viewModes.map((mode) => (
        <Button
          key={mode.id}
          variant={viewMode === mode.id ? "secondary" : "ghost"}
          size="sm"
          className={cn(
            "h-8 px-3 transition-all",
            viewMode === mode.id && "shadow-sm"
          )}
          onClick={() => onViewModeChange(mode.id)}
        >
          <span className="mr-2">{mode.icon}</span>
          <span className="hidden sm:inline">{mode.label}</span>
        </Button>
      ))}
    </div>
  );
}

