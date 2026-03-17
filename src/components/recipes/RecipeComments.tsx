"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface Comment {
  id: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface RecipeCommentsProps {
  recipeId: string;
  currentUserId: string;
}

export function RecipeComments({ recipeId, currentUserId }: RecipeCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Nie udało się załadować komentarzy");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newComment.trim()) {
      toast.error("Komentarz nie może być pusty");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/recipes/${recipeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([data.comment, ...comments]);
        setNewComment("");
        toast.success("Komentarz dodany!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się dodać komentarza");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten komentarz?")) return;

    try {
      const response = await fetch(`/api/recipes/${recipeId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
        toast.success("Komentarz usunięty");
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się usunąć komentarza");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Wystąpił błąd");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">
          Komentarze {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Dodaj komentarz..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Wysyłanie..." : "Dodaj komentarz"}
          </Button>
        </div>
      </form>

      <Separator />

      {/* Comments list */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Brak komentarzy</p>
          <p className="text-sm">Bądź pierwszą osobą, która skomentuje ten przepis!</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={comment.user.avatar || undefined} />
                  <AvatarFallback>
                    {comment.user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.user.name || "Użytkownik"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </span>
                    </div>
                    {comment.user.id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(comment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.comment}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

