"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  CalendarClock, 
  CalendarDays, 
  Repeat, 
  AlertCircle,
  CalendarX,
  User
} from "lucide-react";

export type QuickFilterType = 
  | "all" 
  | "today" 
  | "tomorrow" 
  | "thisWeek" 
  | "routines" 
  | "overdue" 
  | "noDate"
  | "mine";

interface TaskQuickFiltersProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
  counts: {
    all: number;
    today: number;
    tomorrow: number;
    thisWeek: number;
    routines: number;
    overdue: number;
    noDate: number;
    mine: number;
  };
}

const filters: Array<{
  id: QuickFilterType;
  label: string;
  icon: React.ReactNode;
  color?: string;
}> = [
  {
    id: "all",
    label: "Wszystkie",
    icon: <CalendarDays className="h-4 w-4" />,
  },
  {
    id: "today",
    label: "Dziś",
    icon: <Calendar className="h-4 w-4" />,
    color: "text-blue-600",
  },
  {
    id: "tomorrow",
    label: "Jutro",
    icon: <CalendarClock className="h-4 w-4" />,
    color: "text-cyan-600",
  },
  {
    id: "thisWeek",
    label: "Ten tydzień",
    icon: <CalendarDays className="h-4 w-4" />,
    color: "text-green-600",
  },
  {
    id: "routines",
    label: "Rutyny",
    icon: <Repeat className="h-4 w-4" />,
    color: "text-purple-600",
  },
  {
    id: "overdue",
    label: "Przeterminowane",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-600",
  },
  {
    id: "noDate",
    label: "Bez terminu",
    icon: <CalendarX className="h-4 w-4" />,
    color: "text-gray-600",
  },
  {
    id: "mine",
    label: "Moje",
    icon: <User className="h-4 w-4" />,
    color: "text-orange-600",
  },
];

export function TaskQuickFilters({ 
  activeFilter, 
  onFilterChange, 
  counts 
}: TaskQuickFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {filters.map((filter) => {
        const count = counts[filter.id];
        const isActive = activeFilter === filter.id;

        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 transition-all",
              !isActive && filter.color,
              isActive && "shadow-md"
            )}
            onClick={() => onFilterChange(filter.id)}
          >
            <span className="mr-2">{filter.icon}</span>
            <span>{filter.label}</span>
            {count > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "outline"} 
                className={cn(
                  "ml-2 px-1.5 min-w-[20px] justify-center",
                  isActive && "bg-primary-foreground/20",
                  !isActive && "border-current"
                )}
              >
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

