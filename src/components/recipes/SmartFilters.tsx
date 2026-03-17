"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal, X } from "lucide-react";
import {
  seasonalTags,
  dietaryFilters,
  timeFilters,
  mealTypeFilters,
  getCurrentSeason,
  type SmartFilterCriteria,
} from "@/lib/seasonal-tags";

interface SmartFiltersProps {
  onApplyFilters: (criteria: SmartFilterCriteria) => void;
  activeFiltersCount?: number;
}

export function SmartFilters({ onApplyFilters, activeFiltersCount = 0 }: SmartFiltersProps) {
  const [open, setOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<keyof typeof seasonalTags | "current" | null>(null);
  const [selectedDietary, setSelectedDietary] = useState<Set<keyof typeof dietaryFilters>>(new Set());
  const [selectedTimeRange, setSelectedTimeRange] = useState<keyof typeof timeFilters | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<keyof typeof mealTypeFilters | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | null>(null);
  const [servingsRange, setServingsRange] = useState<[number, number]>([1, 12]);
  const [caloriesRange, setCaloriesRange] = useState<[number, number]>([0, 2000]);

  const currentSeason = getCurrentSeason();

  const toggleDietary = (key: keyof typeof dietaryFilters) => {
    const newSet = new Set(selectedDietary);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSelectedDietary(newSet);
  };

  const handleApply = () => {
    const criteria: SmartFilterCriteria = {};

    if (selectedSeason) criteria.season = selectedSeason;
    if (selectedDietary.size > 0) criteria.dietary = Array.from(selectedDietary);
    if (selectedTimeRange) criteria.timeRange = selectedTimeRange;
    if (selectedMealType) criteria.mealType = selectedMealType;
    if (selectedDifficulty) criteria.difficulty = selectedDifficulty;
    if (servingsRange[0] > 1 || servingsRange[1] < 12) {
      criteria.servings = { min: servingsRange[0], max: servingsRange[1] };
    }
    if (caloriesRange[0] > 0 || caloriesRange[1] < 2000) {
      criteria.calories = { min: caloriesRange[0], max: caloriesRange[1] };
    }

    onApplyFilters(criteria);
    setOpen(false);
  };

  const handleReset = () => {
    setSelectedSeason(null);
    setSelectedDietary(new Set());
    setSelectedTimeRange(null);
    setSelectedMealType(null);
    setSelectedDifficulty(null);
    setServingsRange([1, 12]);
    setCaloriesRange([0, 2000]);
    onApplyFilters({});
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Zaawansowane filtry
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 px-1.5 py-0.5 text-xs" variant="secondary">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Zaawansowane filtry</SheetTitle>
          <SheetDescription>
            Znajdź idealny przepis według szczegółowych kryteriów
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Seasonal Tags */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Sezonowość</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedSeason === "current" ? "default" : "outline"}
                className="justify-start"
                onClick={() => setSelectedSeason(selectedSeason === "current" ? null : "current")}
              >
                <span className="mr-2">{seasonalTags[currentSeason].icon}</span>
                Aktualna pora ({seasonalTags[currentSeason].name})
              </Button>
              {Object.entries(seasonalTags).map(([key, season]) => (
                <Button
                  key={key}
                  variant={selectedSeason === key ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedSeason(selectedSeason === key ? null : key as keyof typeof seasonalTags)}
                >
                  <span className="mr-2">{season.icon}</span>
                  {season.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Dietary Filters */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Dieta</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(dietaryFilters).map(([key, filter]) => (
                <Button
                  key={key}
                  variant={selectedDietary.has(key as keyof typeof dietaryFilters) ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => toggleDietary(key as keyof typeof dietaryFilters)}
                >
                  <span className="mr-2">{filter.icon}</span>
                  {filter.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Czas przygotowania</Label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(timeFilters).map(([key, filter]) => (
                <Button
                  key={key}
                  variant={selectedTimeRange === key ? "default" : "outline"}
                  className="justify-start text-xs"
                  onClick={() => setSelectedTimeRange(selectedTimeRange === key ? null : key as keyof typeof timeFilters)}
                >
                  <span className="mr-1">{filter.icon}</span>
                  {filter.name.split(' ')[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Meal Type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Typ posiłku</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(mealTypeFilters).map(([key, filter]) => (
                <Button
                  key={key}
                  variant={selectedMealType === key ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedMealType(selectedMealType === key ? null : key as keyof typeof mealTypeFilters)}
                >
                  <span className="mr-2">{filter.icon}</span>
                  {filter.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Poziom trudności</Label>
            <div className="grid grid-cols-3 gap-2">
              {["EASY", "MEDIUM", "HARD"].map((diff) => (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty(selectedDifficulty === diff ? null : diff as "EASY" | "MEDIUM" | "HARD")}
                >
                  {diff === "EASY" ? "Łatwy" : diff === "MEDIUM" ? "Średni" : "Trudny"}
                </Button>
              ))}
            </div>
          </div>

          {/* Servings Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Liczba porcji</Label>
              <span className="text-sm text-muted-foreground">
                {servingsRange[0]} - {servingsRange[1]} porcji
              </span>
            </div>
            <Slider
              min={1}
              max={12}
              step={1}
              value={servingsRange}
              onValueChange={(value) => setServingsRange(value as [number, number])}
              className="w-full"
            />
          </div>

          {/* Calories Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Kalorie (na porcję)</Label>
              <span className="text-sm text-muted-foreground">
                {caloriesRange[0]} - {caloriesRange[1]} kcal
              </span>
            </div>
            <Slider
              min={0}
              max={2000}
              step={50}
              value={caloriesRange}
              onValueChange={(value) => setCaloriesRange(value as [number, number])}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Wyczyść
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Zastosuj filtry
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

