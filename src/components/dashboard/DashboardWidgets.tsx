"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  TouchSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Eye, EyeOff, RotateCcw, Settings2, Maximize2, Minimize2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type WidgetSize = "small" | "half" | "medium" | "large";

export interface WidgetConfig {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  size?: WidgetSize;
}

interface DashboardWidgetsProps {
  widgets: WidgetConfig[];
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  renderWidget: (widgetId: string) => React.ReactNode;
  isEditing: boolean;
  onEditingChange: (editing: boolean) => void;
}

interface SortableWidgetProps {
  id: string;
  isEditing: boolean;
  isVisible: boolean;
  size?: WidgetSize;
  onSizeChange?: (size: WidgetSize) => void;
  children: React.ReactNode;
}

// System 6-kolumnowy pozwala na elastyczne układy:
// small (2 kol) + small (2 kol) + small (2 kol) = 6
// half (3 kol) + half (3 kol) = 6
// medium (4 kol) + small (2 kol) = 6
// large (6 kol) = 6
const sizeClasses: Record<WidgetSize, string> = {
  small: "col-span-6 sm:col-span-3 lg:col-span-2",
  half: "col-span-6 sm:col-span-3",
  medium: "col-span-6 lg:col-span-4",
  large: "col-span-6",
};

function SortableWidget({ id, isEditing, isVisible, size = "medium", onSizeChange, children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!isVisible && !isEditing) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isEditing && "ring-2 ring-dashed ring-primary/30 rounded-lg",
        !isVisible && isEditing && "opacity-50"
      )}
    >
      {isEditing && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-background border shadow-sm cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          {/* Przyciski zmiany rozmiaru */}
          {onSizeChange && (
            <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onSizeChange("small")}
                className={cn(
                  "p-1 rounded-md bg-background border shadow-sm transition-colors",
                  size === "small" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Mały (1/3)"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
              <button
                onClick={() => onSizeChange("half")}
                className={cn(
                  "p-1 rounded-md bg-background border shadow-sm transition-colors",
                  size === "half" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Połowa (1/2)"
              >
                <Square className="h-3 w-3" />
              </button>
              <button
                onClick={() => onSizeChange("medium")}
                className={cn(
                  "p-1 rounded-md bg-background border shadow-sm transition-colors",
                  size === "medium" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Średni (2/3)"
              >
                <Square className="h-3 w-3" />
              </button>
              <button
                onClick={() => onSizeChange("large")}
                className={cn(
                  "p-1 rounded-md bg-background border shadow-sm transition-colors",
                  size === "large" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                )}
                title="Duży (pełna)"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </>
      )}
      {children}
      {!isVisible && isEditing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
          <EyeOff className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function DashboardWidgets({
  widgets,
  onLayoutChange,
  renderWidget,
  isEditing,
  onEditingChange,
}: DashboardWidgetsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = widgets.findIndex((w) => w.id === active.id);
        const newIndex = widgets.findIndex((w) => w.id === over.id);

        const newWidgets = [...widgets];
        const [movedWidget] = newWidgets.splice(oldIndex, 1);
        newWidgets.splice(newIndex, 0, movedWidget);

        // Aktualizuj kolejność
        const updatedWidgets = newWidgets.map((w, i) => ({
          ...w,
          order: i,
        }));

        onLayoutChange(updatedWidgets);
      }
    },
    [widgets, onLayoutChange]
  );

  const toggleWidgetVisibility = useCallback(
    (widgetId: string) => {
      const updatedWidgets = widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      );
      onLayoutChange(updatedWidgets);
    },
    [widgets, onLayoutChange]
  );

  const resetLayout = useCallback(() => {
    const defaultWidgets = widgets.map((w, i) => ({
      ...w,
      visible: true,
      order: i,
      size: undefined, // reset do domyślnego rozmiaru
    }));
    onLayoutChange(defaultWidgets);
  }, [widgets, onLayoutChange]);

  const changeWidgetSize = useCallback(
    (widgetId: string, size: WidgetSize) => {
      const updatedWidgets = widgets.map((w) =>
        w.id === widgetId ? { ...w, size } : w
      );
      onLayoutChange(updatedWidgets);
    },
    [widgets, onLayoutChange]
  );

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <div className="relative">
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-2 mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Widżety</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Widoczne widżety</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortedWidgets.map((widget) => (
              <DropdownMenuCheckboxItem
                key={widget.id}
                checked={widget.visible}
                onCheckedChange={() => toggleWidgetVisibility(widget.id)}
              >
                {widget.title}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={resetLayout}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetuj układ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => onEditingChange(!isEditing)}
          className="gap-2"
        >
          {isEditing ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Gotowe</span>
            </>
          ) : (
            <>
              <GripVertical className="h-4 w-4" />
              <span className="hidden sm:inline">Edytuj układ</span>
            </>
          )}
        </Button>
      </div>

      {/* Widgets Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-6 grid-cols-6">
            {sortedWidgets.map((widget) => {
              // Domyślne rozmiary w zależności od typu widżetu
              const defaultSize: WidgetSize = widget.id.startsWith("main-")
                ? widget.id === "main-stats" ? "large" : "medium"
                : "small";
              const widgetSize = widget.size || defaultSize;

              return (
                <div
                  key={widget.id}
                  className={cn(
                    sizeClasses[widgetSize],
                    !widget.visible && !isEditing && "hidden"
                  )}
                >
                  <SortableWidget
                    id={widget.id}
                    isEditing={isEditing}
                    isVisible={widget.visible}
                    size={widgetSize}
                    onSizeChange={(size) => changeWidgetSize(widget.id, size)}
                  >
                    {renderWidget(widget.id)}
                  </SortableWidget>
                </div>
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeId ? (
            <div className="opacity-80 shadow-lg">
              {renderWidget(activeId)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

