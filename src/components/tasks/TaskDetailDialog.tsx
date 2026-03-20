"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { RoutineStreakBadge } from "./RoutineStreakBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TaskLabels } from "@/components/tasks/TaskLabels";
import { TaskSubtasks } from "@/components/tasks/TaskSubtasks";
import { TaskAttachments } from "@/components/tasks/TaskAttachments";
import { TaskTimer } from "@/components/tasks/TaskTimer";
import { toast } from "sonner";
import { Task, Category, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

type TaskWithRelations = Task & {
  category: Category | null;
  assignee: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  } | null;
  creator: {
    id: string;
    name: string | null;
  };
  completions: {
    completedAt: Date;
  }[];
  labels?: {
    id: string;
    name: string;
    color: string;
  }[];
  attachments?: {
    id: string;
  }[];
};

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  };
};

interface TaskDetailDialogProps {
  task: TaskWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  members?: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
  }[];
  onTaskUpdate?: (task: TaskWithRelations) => void;
}

export function TaskDetailDialog({ task, open, onOpenChange, currentUserId, members = [], onTaskUpdate }: TaskDetailDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const handleSubtaskChange = async () => {
    // Odśwież dane zadania z API
    if (!task) return;
    try {
      const response = await fetch(`/api/tasks/${task.id}`);
      if (response.ok) {
        const updatedTask = await response.json();
        onTaskUpdate?.(updatedTask);
      }
    } catch (error) {
      console.error("Error refreshing task:", error);
    }
  };

  const loadComments = async () => {
    if (!task) return;

    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (open && task) {
      loadComments();
      setActiveTab("details");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([comment, ...comments]);
        setNewComment("");
        toast.success("Dodano komentarz");
      } else {
        toast.error("Nie udało się dodać komentarza");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
        toast.success("Usunięto komentarz");
      } else {
        toast.error("Nie udało się usunąć komentarza");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Wystąpił błąd");
    }
  };

  if (!task) {
    return null;
  }

  const isCompleted = task.status === TaskStatus.COMPLETED;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Szczegóły</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Komentarze
              {comments.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {comments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Załączniki
              {task.attachments && task.attachments.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {task.attachments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="time">
              <Clock className="h-4 w-4 mr-2" />
              Czas
            </TabsTrigger>
          </TabsList>

          {/* Szczegóły */}
          <TabsContent value="details" className="space-y-4">
            <ScrollArea className="h-[50vh] pr-4">
              {/* Streak Badge dla rutyn */}
              {task.isRecurring && (
                <div className="mb-4">
                  <RoutineStreakBadge taskId={task.id} />
                </div>
              )}

              {task.description && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Opis</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Termin</div>
                      <div className="text-sm">
                        {format(new Date(task.dueDate), "d MMMM yyyy", { locale: pl })}
                      </div>
                    </div>
                  </div>
                )}

                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Przypisano</div>
                      <div className="text-sm flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.assignee.avatar || undefined} />
                          <AvatarFallback
                            style={{ backgroundColor: task.assignee.color }}
                            className="text-white text-xs"
                          >
                            {task.assignee.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {task.assignee.name}
                      </div>
                    </div>
                  </div>
                )}

                {task.category && (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Kategoria</div>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: task.category.color + "20",
                          borderColor: task.category.color,
                          color: task.category.color,
                        }}
                      >
                        {task.category.icon} {task.category.name}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <Badge
                      variant={isCompleted ? "default" : "secondary"}
                      className={cn(
                        isCompleted && "bg-green-500 hover:bg-green-600"
                      )}
                    >
                      {task.status === "TODO" && "Do zrobienia"}
                      {task.status === "IN_PROGRESS" && "W trakcie"}
                      {task.status === "COMPLETED" && "Ukończone"}
                      {task.status === "CANCELLED" && "Anulowane"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Podzadania */}
              <div className="mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Podzadania</div>
                  <TaskSubtasks
                    taskId={task.id}
                    members={members}
                    onSubtaskChange={handleSubtaskChange}
                  />
                </div>
              </div>

              {/* Etykiety */}
              <div className="mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Etykiety</div>
                  <TaskLabels
                    taskId={task.id}
                    currentLabels={task.labels || []}
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Utworzono: {format(new Date(task.createdAt), "d MMMM yyyy, HH:mm", { locale: pl })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Autor: {task.creator.name}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Komentarze */}
          <TabsContent value="comments" className="space-y-4">
            <ScrollArea className="h-[40vh]">
              {isLoadingComments ? (
                <div className="text-center py-8 text-muted-foreground">
                  Ładowanie komentarzy...
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Brak komentarzy. Dodaj pierwszy!
                </div>
              ) : (
                <div className="space-y-4 pr-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user.avatar || undefined} />
                        <AvatarFallback
                          style={{ backgroundColor: comment.user.color }}
                          className="text-white text-xs"
                        >
                          {comment.user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.user.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: pl })}
                            </span>
                          </div>
                          {comment.user.id === currentUserId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Formularz dodawania komentarza */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Napisz komentarz..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    handleAddComment();
                  }
                }}
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ctrl+Enter aby wysłać
            </p>
          </TabsContent>

          {/* Załączniki */}
          <TabsContent value="attachments" className="space-y-4">
            <TaskAttachments taskId={task.id} currentUserId={currentUserId} />
          </TabsContent>

          {/* Czas */}
          <TabsContent value="time" className="space-y-4">
            <TaskTimer taskId={task.id} currentUserId={currentUserId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

