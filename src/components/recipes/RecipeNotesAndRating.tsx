"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, Calendar, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecipeNotesAndRatingProps {
  recipeId: string;
}

export function RecipeNotesAndRating({ recipeId }: RecipeNotesAndRatingProps) {
  // Notes state
  const [note, setNote] = useState("");
  const [originalNote, setOriginalNote] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Rating state
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState("");
  const [lastCooked, setLastCooked] = useState<Date | null>(null);
  const [isSavingRating, setIsSavingRating] = useState(false);

  // Load note and rating
  useEffect(() => {
    loadNote();
    loadRating();
  }, [recipeId]);

  const loadNote = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/note`);
      if (response.ok) {
        const data = await response.json();
        if (data.note) {
          setNote(data.note.content);
          setOriginalNote(data.note.content);
        }
      }
    } catch (error) {
      console.error("Error loading note:", error);
    }
  };

  const loadRating = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/rating`);
      if (response.ok) {
        const data = await response.json();
        if (data.userRating) {
          setUserRating(data.userRating.rating);
          setRatingComment(data.userRating.comment || "");
          setLastCooked(data.userRating.cookedAt ? new Date(data.userRating.cookedAt) : null);
        }
        setAverageRating(data.averageRating || 0);
        setTotalRatings(data.totalRatings || 0);
      }
    } catch (error) {
      console.error("Error loading rating:", error);
    }
  };

  const saveNote = async () => {
    if (note.trim() === originalNote.trim()) {
      setIsEditingNote(false);
      return;
    }

    setIsSavingNote(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.trim() }),
      });

      if (response.ok) {
        setOriginalNote(note.trim());
        setIsEditingNote(false);
        toast.success("Notatka zapisana");
      } else {
        toast.error("Nie udało się zapisać notatki");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSavingNote(false);
    }
  };

  const deleteNote = async () => {
    try {
      const response = await fetch(`/api/recipes/${recipeId}/note`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNote("");
        setOriginalNote("");
        setIsEditingNote(false);
        toast.success("Notatka usunięta");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Nie udało się usunąć notatki");
    }
  };

  const saveRating = async (rating: number) => {
    setIsSavingRating(true);
    try {
      const payload: {
        rating: number;
        comment?: string;
        cookedAt?: string;
      } = {
        rating,
      };

      // Dodaj tylko jeśli mają wartość
      if (ratingComment.trim()) {
        payload.comment = ratingComment.trim();
      }
      payload.cookedAt = new Date().toISOString();

      console.log("Sending rating:", payload);

      const response = await fetch(`/api/recipes/${recipeId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Rating saved successfully:", data);
        setUserRating(data.rating.rating);
        setAverageRating(data.averageRating);
        setTotalRatings(data.totalRatings);
        setLastCooked(new Date(data.rating.cookedAt));
        toast.success(`Ocena: ${rating}/5 ⭐`);
      } else {
        const errorText = await response.text();
        console.error("Rating error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        try {
          const errorData = JSON.parse(errorText);
          console.error("Parsed error:", errorData);
          toast.error(errorData.error || "Nie udało się zapisać oceny");
        } catch {
          toast.error(`Błąd ${response.status}: ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error("Error saving rating:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSavingRating(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Rating Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Twoja ocena</h3>
          {lastCooked && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="mr-1 h-3 w-3" />
              Ostatnio: {formatDate(lastCooked)}
            </Badge>
          )}
        </div>

        {/* Star Rating */}
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                disabled={isSavingRating}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => saveRating(star)}
                className={cn(
                  "transition-all hover:scale-110",
                  isSavingRating && "opacity-50 cursor-not-allowed"
                )}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    (hoverRating >= star || userRating >= star)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>

          {/* Average Rating */}
          {totalRatings > 0 && (
            <div className="text-sm text-muted-foreground">
              {averageRating.toFixed(1)} ⭐ ({totalRatings} {totalRatings === 1 ? 'ocena' : 'ocen'})
            </div>
          )}
        </div>

        {/* User's current rating */}
        {userRating > 0 && (
          <div className="text-sm text-muted-foreground">
            Twoja ocena: {userRating}/5 ⭐
          </div>
        )}
      </div>

      <Separator />

      {/* Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Twoje notatki
          </h3>
          {originalNote && !isEditingNote && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNote(true)}
            >
              Edytuj
            </Button>
          )}
        </div>

        {isEditingNote || !originalNote ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Dodaj notatki do tego przepisu... (np. zmniejszyłem ilość soli, dodałem czosnek)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveNote}
                disabled={isSavingNote || note.trim() === originalNote.trim()}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSavingNote ? "Zapisywanie..." : "Zapisz"}
              </Button>
              {originalNote && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNote(originalNote);
                      setIsEditingNote(false);
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Anuluj
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteNote}
                  >
                    Usuń notatkę
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
            {originalNote}
          </div>
        )}

        {!originalNote && !isEditingNote && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingNote(true)}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Dodaj notatkę
          </Button>
        )}
      </div>

      {/* Quick Tips */}
      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        💡 <strong>Wskazówka:</strong> Notatki są prywatne i widoczne tylko dla Ciebie.
        Możesz zapisać modyfikacje przepisu, wskazówki lub przypomnienia.
      </div>
    </div>
  );
}

