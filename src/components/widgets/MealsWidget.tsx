"use client";

import Link from "next/link";
import { UtensilsCrossed, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Meal {
  id: string;
  mealType: string;
  customName: string | null;
  recipe: { id: string; name: string } | null;
  simpleDish: { id: string; name: string } | null;
  assigneeId: string | null;
  assignee?: { id: string; name: string | null; color: string } | null;
}

interface MealsWidgetProps {
  meals: Meal[];
  viewMode: "family" | "personal";
  activeUserId?: string;
  userName?: string;
}

const mealTypeConfig: Record<string, { emoji: string; label: string; order: number }> = {
  BREAKFAST: { emoji: "🍳", label: "Śniadanie", order: 1 },
  SECOND_BREAKFAST: { emoji: "🥐", label: "II Śniadanie", order: 2 },
  LUNCH: { emoji: "🍲", label: "Obiad", order: 3 },
  SNACK: { emoji: "🍎", label: "Podwieczorek", order: 4 },
  DINNER: { emoji: "🥗", label: "Kolacja", order: 5 },
};

export function MealsWidget({
  meals,
  viewMode,
  activeUserId,
  userName,
}: MealsWidgetProps) {
  // Filtruj posiłki
  // - W widoku osobistym: pokaż tylko posiłki przypisane do użytkownika lub bez przypisania
  // - W widoku rodzinnym: pokaż wszystkie
  const filteredMeals =
    viewMode === "personal" && activeUserId
      ? meals.filter((m) => m.assigneeId === activeUserId || m.assigneeId === null)
      : meals;

  // Sortuj po typie posiłku
  const sortedMeals = [...filteredMeals].sort((a, b) => {
    const orderA = mealTypeConfig[a.mealType]?.order || 99;
    const orderB = mealTypeConfig[b.mealType]?.order || 99;
    return orderA - orderB;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">
            {viewMode === "personal" && userName
              ? `Posiłki: ${userName}`
              : "Posiłki na dziś"}
          </CardTitle>
          <CardDescription>Zaplanowany jadłospis</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/meals">
            Zobacz jadłospis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {sortedMeals.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak zaplanowanych posiłków</p>
            <Button variant="link" size="sm" asChild>
              <Link href="/meals">Zaplanuj posiłki</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {sortedMeals.map((meal) => {
              const config = mealTypeConfig[meal.mealType];
              return (
                <div
                  key={meal.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg bg-accent/30",
                    meal.assigneeId && "border-l-2"
                  )}
                  style={{
                    borderLeftColor: meal.assignee?.color,
                  }}
                >
                  <span className="text-lg">{config?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {config?.label}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {meal.simpleDish?.name || meal.recipe?.name || meal.customName}
                    </p>
                  </div>
                  {viewMode === "family" && meal.assignee && (
                    <Avatar className="h-5 w-5">
                      <AvatarFallback
                        style={{ backgroundColor: meal.assignee.color }}
                        className="text-white text-[10px]"
                      >
                        {meal.assignee.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {!meal.assigneeId && viewMode === "family" && (
                    <span className="text-xs text-muted-foreground">
                      Wszyscy
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

