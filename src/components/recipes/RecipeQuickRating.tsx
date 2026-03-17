"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecipeQuickRatingProps {
  recipeId: string;
  compact?: boolean;
  className?: string;
}

export function RecipeQuickRating({ recipeId, compact = false, className }: RecipeQuickRatingProps) {
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const loadRating = useCallback(async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`);
      if (response.ok) {
        const data = await response.json();
        if (data.userRating) {
          setUserRating(data.userRating.rating);
        }
        setAverageRating(data.averageRating || 0);
        setTotalRatings(data.totalRatings || 0);
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  }, [recipeId]);

  useEffect(() => {
    loadRating();
  }, [loadRating]);

  const saveRating = async (rating: number) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          cookedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserRating(data.rating.rating);
        setAverageRating(data.averageRating);
        setTotalRatings(data.totalRatings);

        // Pokaż podstawowe powiadomienie
        toast.success(`Ocena: ${rating}/5 ⭐`);

        // Pokaż nowe osiągnięcia jeśli są
        if (data.newAchievements && data.newAchievements.length > 0) {
          data.newAchievements.forEach((achievement: { achievement: { name: string; xpReward: number } }) => {
            toast.success(
              `🏆 Nowe osiągnięcie: ${achievement.achievement.name}! +${achievement.achievement.xpReward} XP`,
              { duration: 5000 }
            );
          });
        }
      } else {
        toast.error("Nie udało się zapisać oceny");
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={isSaving}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => {
                e.stopPropagation();
                saveRating(star);
              }}
              className={cn(
                "transition-all hover:scale-110",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  (hoverRating >= star || userRating >= star)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        {totalRatings > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            {averageRating.toFixed(1)} ({totalRatings})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={isSaving}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => {
                e.stopPropagation();
                saveRating(star);
              }}
              className={cn(
                "transition-all hover:scale-110",
                isSaving && "opacity-50 cursor-not-allowed"
              )}
            >
              <Star
                className={cn(
                  "h-6 w-6 transition-colors",
                  (hoverRating >= star || userRating >= star)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
        {totalRatings > 0 && (
          <div className="text-sm text-muted-foreground">
            {averageRating.toFixed(1)} ⭐ ({totalRatings})
          </div>
        )}
      </div>
      {userRating > 0 && (
        <div className="text-xs text-muted-foreground">
          Twoja ocena: {userRating}/5 ⭐
        </div>
      )}
    </div>
  );
}

