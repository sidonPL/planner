"use client";

import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Calendar,
  Clock,
  MoreVertical,
  Pencil,
  Trash2,
  AlertTriangle,
  Star,
  Eye,
  CalendarRange
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XPBadge } from "@/components/gamification/XPBadge";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { RoutineStreakBadge } from "./RoutineStreakBadge";
import { RoutineActionDialog } from "./RoutineActionDialog";
import { RoutineEditDialog } from "./RoutineEditDialog";
import { playTaskComplete } from "@/lib/sound-effects";
import { checkAndNotifyAchievementProgress } from "@/lib/achievement-notifications";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { Task, Category, Priority } from "@prisma/client";
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
  subtasks?: {
    id: string;
    status: string;
  }[];
  attachments?: {
    id: string;
  }[];
};

interface TaskCardProps {
  task: TaskWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
  onTogglePin?: (pinned: boolean) => void;
  onViewDetails?: () => void;
  showRoutineActions?: boolean;
}

const priorityConfig: Record<Priority, { label: string; color: string; icon?: React.ReactNode }> = {
  LOW: { label: "Niski", color: "bg-gray-100 text-gray-800" },
  MEDIUM: { label: "Średni", color: "bg-blue-100 text-blue-800" },
  HIGH: { label: "Wysoki", color: "bg-orange-100 text-orange-800" },
  URGENT: { label: "Pilny", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="h-3 w-3" /> },
};

export function TaskCard({ task, onEdit, onDelete, onToggleComplete, onTogglePin, onViewDetails, showRoutineActions }: TaskCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();

  const handleToggleComplete = async (completed: boolean) => {
    // Jeśli ukończono zadanie, pokaż flying XP i sprawdź czy jest bonus
    if (completed && !isCompleted) {
      showFlyingXP(xpReward);
      playTaskComplete();

      // Sprawdź czy jest aktywny XP boost
      try {
        const response = await fetch('/api/gamification/xp-boost/status');
        if (response.ok) {
          const boostStatus = await response.json();
          if (boostStatus.active && boostStatus.multiplier > 1) {
            const totalXP = Math.floor(xpReward * boostStatus.multiplier);
            const bonusXP = totalXP - xpReward;

            toast.success(`⚡ +${totalXP} XP (+${bonusXP} bonus!)`, {
              description: "XP Boost aktywny!",
              duration: 3000,
            });
          } else {
            toast.success(`+${xpReward} XP`, {
              description: "Zadanie ukończone!",
              duration: 2500,
            });
          }
        }

        // Sprawdź progress osiągnięć związanych z zadaniami
        // Opóźnienie 500ms aby toast XP pojawił się pierwszy
        setTimeout(() => {
          checkAndNotifyAchievementProgress('userId', ['TASKS_COMPLETED'])
            .catch(err => console.error('Achievement notification error:', err));
        }, 500);
      } catch {
        // Fallback - pokazuj zwykły toast
        toast.success(`+${xpReward} XP`, {
          description: "Zadanie ukończone!",
        });
      }
    }
    onToggleComplete(completed);
  };
  const [showRoutineDialog, setShowRoutineDialog] = useState(false);
  const [routineActionType, setRoutineActionType] = useState<"edit" | "delete">("edit");
  const [showRoutineEditDialog, setShowRoutineEditDialog] = useState(false);

  const isCompleted = task.status === "COMPLETED";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;
  const isPinned = task.isPinned;
  const priority = priorityConfig[task.priority];
  const isRecurring = task.isRecurring && showRoutineActions;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onDelete();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRoutineAction = (actionType: "edit" | "delete") => {
    if (actionType === "edit") {
      setShowRoutineEditDialog(true);
    } else {
      setRoutineActionType(actionType);
      setShowRoutineDialog(true);
    }
  };

  const handleRoutineSuccess = () => {
    // Odśwież stronę lub wywołaj callback
    window.location.reload();
  };

  const isSubtask = !!task.subtaskParentId;

  // Calculate XP reward based on priority
  const xpReward = task.priority === 'URGENT' ? 20 :
                   task.priority === 'HIGH' ? 15 :
                   task.priority === 'MEDIUM' ? 10 : 5;

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-md",
        isCompleted && "opacity-60",
        isOverdue && "border-red-300 bg-red-50/50",
        task.priority === "URGENT" && !isCompleted && "border-red-400",
        isPinned && !isCompleted && "border-yellow-400 bg-yellow-50/30",
        isSubtask && "ml-8 bg-muted/30 border-l-4 border-l-primary/50"
      )}>
        <CardContent className={cn("p-4", isSubtask && "p-3")}>
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => handleToggleComplete(!!checked)}
              className="mt-1"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h3 className={cn(
                    "font-medium flex items-center gap-2",
                    isCompleted && "line-through text-muted-foreground",
                    isSubtask && "text-sm"
                  )}>
                    {isSubtask && (
                      <span className="text-xs text-muted-foreground">↳</span>
                    )}
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Pin button */}
                  {onTogglePin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onTogglePin(!isPinned)}
                      title={isPinned ? "Odepnij" : "Przypnij"}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isPinned ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  )}

                  <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewDetails && (
                      <DropdownMenuItem onClick={onViewDetails}>
                        <Eye className="mr-2 h-4 w-4" />
                        Szczegóły
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edytuj
                    </DropdownMenuItem>

                    {/* Opcje rutyny */}
                    {isRecurring && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleRoutineAction("edit")}>
                          <CalendarRange className="mr-2 h-4 w-4" />
                          Edytuj całą rutynę
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoutineAction("delete")}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Usuń rutynę
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isRecurring ? "Usuń tę instancję" : "Usuń"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* Priority */}
                <Badge variant="secondary" className={cn("text-xs", priority.color)}>
                  {priority.icon}
                  {priority.label}
                </Badge>

                {/* XP Reward */}
                {!isCompleted && (
                  <XPBadge xp={xpReward} size="sm" />
                )}

                {/* Category */}
                {task.category && (
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{ borderColor: task.category.color, color: task.category.color }}
                  >
                    {task.category.name}
                  </Badge>
                )}

                {/* Labels */}
                {task.labels && task.labels.length > 0 && (
                  <>
                    {task.labels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: label.color + "20",
                          borderColor: label.color,
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </Badge>
                    ))}
                  </>
                )}

                {/* Due Date */}
                {task.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs",
                    isOverdue ? "text-red-600" : "text-muted-foreground"
                  )}>
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.dueDate), "d MMM", { locale: pl })}
                    {task.dueTime && (
                      <>
                        <Clock className="h-3 w-3 ml-1" />
                        {task.dueTime}
                      </>
                    )}
                  </div>
                )}

                {/* Subtasks indicator */}
                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    {task.subtasks.filter(st => st.status === "COMPLETED").length}/{task.subtasks.length}
                  </div>
                )}

                {/* Attachments indicator */}
                {task.attachments && task.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {task.attachments.length}
                  </div>
                )}

                {/* Assignee */}
                {task.assignee && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatar || undefined} />
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: task.assignee.color }}
                      >
                        {task.assignee.name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                )}

                {/* Recurring indicator & Streak */}
                {task.isRecurring && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      🔄 Cykliczne
                    </Badge>
                    <RoutineStreakBadge taskId={task.id} compact />
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć zadanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć zadanie &quot;{task.title}&quot;?
              Tej operacji nie można cofnąć.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Routine Action Dialog */}
      {isRecurring && (
        <>
          <RoutineActionDialog
            open={showRoutineDialog}
            onOpenChange={setShowRoutineDialog}
            routineId={task.id}
            routineTitle={task.title}
            actionType={routineActionType}
            onSuccess={handleRoutineSuccess}
          />

          <RoutineEditDialog
            open={showRoutineEditDialog}
            onOpenChange={setShowRoutineEditDialog}
            routineId={task.id}
            initialData={{
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueTime: task.dueTime,
              categoryId: task.categoryId,
            }}
            onSuccess={handleRoutineSuccess}
          />
        </>
      )}

      {/* Flying XP Animation */}
      <FlyingXPComponent />
    </>
  );
}


