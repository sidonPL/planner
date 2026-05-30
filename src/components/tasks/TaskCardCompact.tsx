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
  Paperclip,
  CheckSquare,
  CalendarRange,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { RoutineStreakBadge } from "./RoutineStreakBadge";
import { RoutineActionDialog } from "./RoutineActionDialog";
import { RoutineEditDialog } from "./RoutineEditDialog";
import { TaskReminderIndicator } from "./TaskReminderIndicator";

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

interface TaskCardCompactProps {
  task: TaskWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: (completed: boolean) => void;
  onTogglePin?: (pinned: boolean) => void;
  onViewDetails?: () => void;
  isOverdue?: boolean; // Dodatkowy prop dla rutyn
  showRoutineActions?: boolean;
}

const priorityConfig: Record<Priority, { label: string; color: string; icon?: React.ReactNode }> = {
  LOW: { label: "Niski", color: "bg-gray-100 text-gray-800 border-gray-300" },
  MEDIUM: { label: "Średni", color: "bg-blue-100 text-blue-800 border-blue-300" },
  HIGH: { label: "Wysoki", color: "bg-orange-100 text-orange-800 border-orange-300" },
  URGENT: { label: "Pilny", color: "bg-red-100 text-red-800 border-red-300", icon: <AlertTriangle className="h-3 w-3" /> },
};

export function TaskCardCompact({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onTogglePin,
  onViewDetails,
  isOverdue: isRoutineOverdue,
  showRoutineActions
}: TaskCardCompactProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRoutineDialog, setShowRoutineDialog] = useState(false);
  const [routineActionType, setRoutineActionType] = useState<"edit" | "delete">("edit");
  const [showRoutineEditDialog, setShowRoutineEditDialog] = useState(false);

  const isCompleted = task.status === "COMPLETED";
  const isOverdueByDate = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted);
  const isOverdue = typeof isRoutineOverdue === "boolean" ? isRoutineOverdue : isOverdueByDate;
  const isPinned = task.isPinned;
  const priority = priorityConfig[task.priority];
  const isRecurring = task.isRecurring && showRoutineActions;
  const isRoutineCard = Boolean(task.isRecurring && showRoutineActions);

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

  const completedSubtasks = task.subtasks?.filter(st => st.status === "COMPLETED").length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const attachmentsCount = task.attachments?.length || 0;

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
          <MoreVertical className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onViewDetails();
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            Szczegóły
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onEdit();
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edytuj
        </DropdownMenuItem>

        {isRecurring && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleRoutineAction("edit");
              }}
            >
              <CalendarRange className="mr-2 h-4 w-4" />
              Edytuj całą rutynę
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleRoutineAction("delete");
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Usuń rutynę
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setShowDeleteDialog(true);
          }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isRecurring ? "Usuń tę instancję" : "Usuń"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isRoutineCard) {
    return (
      <>
        <Card className={cn(
          "transition-all hover:shadow-sm border-l-4",
          isCompleted && "opacity-60",
          isOverdue && "border-l-red-500 bg-red-50/30",
          !isOverdue && "border-l-purple-500"
        )}>
          <div className="px-3 py-2">
            <div className="flex items-start gap-2">
              <Checkbox
                checked={isCompleted}
                onCheckedChange={(checked) => onToggleComplete(!!checked)}
                className="mt-0.5 flex-shrink-0"
              />

              <div className="min-w-0 flex-1 space-y-1">
                <button
                  type="button"
                  className={cn(
                    "w-full text-left text-sm font-medium leading-snug break-words hover:text-primary",
                    isCompleted && "line-through text-muted-foreground"
                  )}
                  onClick={onViewDetails}
                >
                  {task.title}
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {task.dueTime && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.dueTime}
                    </span>
                  )}

                  <TaskReminderIndicator reminderMinutes={task.reminderMinutes} />

                  {(task.priority === "HIGH" || task.priority === "URGENT") && (
                    <Badge variant="outline" className={cn("h-5 px-1.5", priority.color)}>
                      {priority.label}
                    </Badge>
                  )}

                  {isRoutineOverdue && !isCompleted && (
                    <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                      Spóźniona
                    </Badge>
                  )}
                </div>
              </div>

              {actionsMenu}
            </div>
          </div>
        </Card>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Czy na pewno usunąć to zadanie?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna. Zadanie zostanie trwale usunięte.
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
                reminderMinutes: Array.isArray(task.reminderMinutes)
                  ? task.reminderMinutes
                  : [],
              }}
              onSuccess={handleRoutineSuccess}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <Card className={cn(
        "transition-all hover:shadow-sm border-l-4",
        isCompleted && "opacity-50",
        isOverdue && "border-l-red-500 bg-red-50/30",
        task.priority === "URGENT" && !isCompleted && "border-l-red-500",
        task.priority === "HIGH" && !isCompleted && !isOverdue && "border-l-orange-500",
        task.priority === "MEDIUM" && !isCompleted && !isOverdue && "border-l-blue-500",
        task.priority === "LOW" && !isCompleted && !isOverdue && "border-l-gray-400",
        isPinned && !isCompleted && "bg-yellow-50/30"
      )}>
        <div className="px-3 py-2">
          <div className={cn("flex gap-2", isRoutineCard ? "items-start" : "items-center")}>
            {/* Checkbox */}
            <Checkbox
              checked={isCompleted}
              onCheckedChange={(checked) => onToggleComplete(!!checked)}
              className="flex-shrink-0"
            />

            {/* Title */}
            <span
              className={cn(
                "flex-1 text-sm font-medium cursor-pointer hover:text-primary",
                isRoutineCard ? "leading-snug break-words line-clamp-2" : "truncate",
                isCompleted && "line-through text-muted-foreground"
              )}
              onClick={onViewDetails}
              title={task.title}
            >
              {task.title}
            </span>

            {/* Priority badge - only for HIGH and URGENT */}
            {(task.priority === "HIGH" || task.priority === "URGENT") && (
              <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 flex items-center gap-1", priority.color)}>
                {priority.icon}
                <span className="hidden sm:inline">{priority.label}</span>
              </Badge>
            )}

            {/* Category */}
            {task.category && !isRoutineCard && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0 h-5 hidden md:flex"
                style={{ borderColor: task.category.color, color: task.category.color }}
              >
                {task.category.name}
              </Badge>
            )}

            {/* Labels - max 2 visible */}
            {task.labels && task.labels.length > 0 && !isRoutineCard && (
              <div className="hidden lg:flex items-center gap-1">
                {task.labels.slice(0, 2).map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="text-xs px-1.5 py-0 h-5"
                    style={{
                      backgroundColor: label.color + "20",
                      borderColor: label.color,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </Badge>
                ))}
                {task.labels.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                    +{task.labels.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Due Date / Time */}
            {task.isRecurring ? (
              task.dueTime ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>{task.dueTime}</span>
                </div>
              ) : null
            ) : task.dueDate ? (
              <div className={cn(
                "flex items-center gap-1 text-xs flex-shrink-0",
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {format(new Date(task.dueDate), "d MMM", { locale: pl })}
                </span>
                {task.dueTime && (
                  <>
                    <Clock className="h-3 w-3 ml-0.5" />
                    <span className="hidden md:inline">{task.dueTime}</span>
                  </>
                )}
              </div>
            ) : null}

            <TaskReminderIndicator reminderMinutes={task.reminderMinutes} />

            {/* Overdue badge for routines */}
            {isRoutineOverdue && !isCompleted && (
              <Badge variant="destructive" className="h-4 text-[10px] px-1 flex-shrink-0">
                Spóźniona
              </Badge>
            )}

            {/* Subtasks indicator */}
            {totalSubtasks > 0 && !isRoutineCard && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <CheckSquare className="h-3 w-3" />
                <span>{completedSubtasks}/{totalSubtasks}</span>
              </div>
            )}

            {/* Attachments indicator */}
            {attachmentsCount > 0 && !isRoutineCard && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Paperclip className="h-3 w-3" />
                <span className="hidden sm:inline">{attachmentsCount}</span>
              </div>
            )}

            {/* Recurring indicator & Streak */}
            {task.isRecurring && !isRoutineCard && (
              <>
                <span className="text-xs flex-shrink-0 hidden md:inline" title="Zadanie cykliczne">
                  🔄
                </span>
                <RoutineStreakBadge taskId={task.id} compact className="flex-shrink-0" />
              </>
            )}

            {/* Assignee */}
            {task.assignee && !isRoutineCard && (
              <Avatar className="h-6 w-6 flex-shrink-0">
                <AvatarImage src={task.assignee.avatar || undefined} />
                <AvatarFallback
                  className="text-xs"
                  style={{ backgroundColor: task.assignee.color }}
                >
                  {task.assignee.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Pin button */}
            {onTogglePin && !isRoutineCard && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onTogglePin(!isPinned)}
                title={isPinned ? "Odepnij" : "Przypnij"}
              >
                <Star
                  className={cn(
                    "h-3 w-3 transition-colors",
                    isPinned ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  )}
                />
              </Button>
            )}

            {actionsMenu}
          </div>
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno usunąć to zadanie?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta operacja jest nieodwracalna. Zadanie zostanie trwale usunięte.
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
              reminderMinutes: Array.isArray(task.reminderMinutes)
                ? task.reminderMinutes
                : [],
            }}
            onSuccess={handleRoutineSuccess}
          />
        </>
      )}
    </>
  );
}


