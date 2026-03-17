"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Sun, Sunset, Moon, Calendar as CalendarIcon, CalendarDays, CalendarRange, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskCardCompact } from "@/components/tasks/TaskCardCompact";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { TaskViewToggle, ViewMode } from "@/components/tasks/TaskViewToggle";
import { RoutineTemplatesDialog } from "@/components/tasks/RoutineTemplatesDialog";
import { Task, Category, RecurrenceType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useFlyingXP } from "@/components/gamification/FlyingXP";
import { useSoundEffects } from "@/lib/sound-effects";
import { toast } from "sonner";
import { showXPToast } from "@/lib/xp-toast-helpers";

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

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface RoutinesClientProps {
  initialRoutines: TaskWithRelations[];
  categories: Category[];
  members: Member[];
  currentUserId: string;
}

type RoutineGroup = {
  id: string;
  title: string;
  icon: React.ReactNode;
  routines: TaskWithRelations[];
  color: string;
};

export function RoutinesClient({
  initialRoutines,
  categories,
  members,
  currentUserId
}: RoutinesClientProps) {
  const [routines, setRoutines] = useState(initialRoutines);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<ViewMode>(() => {
    // Leniwa inicjalizacja - wykonuje się tylko raz po stronie klienta
    if (typeof window === "undefined") return "compact"; // SSR fallback
    try {
      const saved = localStorage.getItem(`routinesViewMode_${currentUserId}`);
      return (saved as ViewMode) || "compact";
    } catch {
      return "compact";
    }
  });
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [selectedRoutineDate, setSelectedRoutineDate] = useState<Date>(startOfDay(new Date()));

  // Gamification hooks
  const { showFlyingXP, FlyingXPComponent } = useFlyingXP();
  const { playSound } = useSoundEffects();

  // Funkcja sprawdzająca czy rutyna (instancja) powinna być wyświetlona dla danego dnia
  const isRoutineForDay = useCallback((task: TaskWithRelations, date: Date) => {
    if (!task.isRecurring) return false;
    if (!task.dueDate) return false; // Tylko instancje z datami

    // Sprawdź czy data dokładnie pasuje
    const taskDate = new Date(task.dueDate);
    return (
      date.getFullYear() === taskDate.getFullYear() &&
      date.getMonth() === taskDate.getMonth() &&
      date.getDate() === taskDate.getDate()
    );
  }, []);

  // Filtruj rutyny (instancje) dla wybranego dnia
  const getRoutinesForDay = useCallback((date: Date) => {
    return routines.filter(r => isRoutineForDay(r, date));
  }, [routines, isRoutineForDay]);

  // Handle view mode change
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === "kanban") {
      window.location.href = "/tasks/kanban";
      return;
    }
    setTaskViewMode(mode);
    try {
      localStorage.setItem(`routinesViewMode_${currentUserId}`, mode);
    } catch (error) {
      console.error("Error saving view preference:", error);
    }
  };

  // Group routines by time and frequency
  const groupedRoutines = useMemo<RoutineGroup[]>(() => {
    const groups: RoutineGroup[] = [];

    // Filtruj rutyny dla wybranego dnia (unikając duplikatów)
    const filteredRoutines = getRoutinesForDay(selectedRoutineDate);

    // Helper function to get hour from time string
    const getHour = (timeStr: string | null): number => {
      if (!timeStr) return -1;
      const [hours] = timeStr.split(':').map(Number);
      return hours;
    };

    // Time-based groups (for daily routines)
    const dailyRoutines = filteredRoutines.filter(r =>
      r.recurrenceType === RecurrenceType.DAILY ||
      !r.recurrenceType
    );

    const morning = dailyRoutines.filter(r => {
      const hour = getHour(r.dueTime);
      return hour >= 5 && hour < 12;
    });

    const afternoon = dailyRoutines.filter(r => {
      const hour = getHour(r.dueTime);
      return hour >= 12 && hour < 17;
    });

    const evening = dailyRoutines.filter(r => {
      const hour = getHour(r.dueTime);
      return hour >= 17 && hour < 23;
    });

    const night = dailyRoutines.filter(r => {
      const hour = getHour(r.dueTime);
      return (hour >= 23 || hour < 5) && hour !== -1;
    });

    const noTime = dailyRoutines.filter(r => !r.dueTime);

    if (morning.length > 0) {
      groups.push({
        id: 'morning',
        title: 'Poranne',
        icon: <Sun className="h-5 w-5" />,
        routines: morning.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
        color: 'text-orange-600',
      });
    }

    if (afternoon.length > 0) {
      groups.push({
        id: 'afternoon',
        title: 'Popołudniowe',
        icon: <Sun className="h-5 w-5" />,
        routines: afternoon.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
        color: 'text-yellow-600',
      });
    }

    if (evening.length > 0) {
      groups.push({
        id: 'evening',
        title: 'Wieczorne',
        icon: <Sunset className="h-5 w-5" />,
        routines: evening.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
        color: 'text-purple-600',
      });
    }

    if (night.length > 0) {
      groups.push({
        id: 'night',
        title: 'Nocne',
        icon: <Moon className="h-5 w-5" />,
        routines: night.sort((a, b) => (a.dueTime || '').localeCompare(b.dueTime || '')),
        color: 'text-blue-600',
      });
    }

    // Frequency-based groups
    const weeklyRoutines = filteredRoutines.filter(r => r.recurrenceType === RecurrenceType.WEEKLY);
    if (weeklyRoutines.length > 0) {
      groups.push({
        id: 'weekly',
        title: 'Tygodniowe',
        icon: <CalendarIcon className="h-5 w-5" />,
        routines: weeklyRoutines,
        color: 'text-green-600',
      });
    }

    const monthlyRoutines = filteredRoutines.filter(r => r.recurrenceType === RecurrenceType.MONTHLY);
    if (monthlyRoutines.length > 0) {
      groups.push({
        id: 'monthly',
        title: 'Miesięczne',
        icon: <CalendarDays className="h-5 w-5" />,
        routines: monthlyRoutines,
        color: 'text-cyan-600',
      });
    }

    const yearlyRoutines = filteredRoutines.filter(r => r.recurrenceType === RecurrenceType.YEARLY);
    if (yearlyRoutines.length > 0) {
      groups.push({
        id: 'yearly',
        title: 'Roczne',
        icon: <CalendarRange className="h-5 w-5" />,
        routines: yearlyRoutines,
        color: 'text-indigo-600',
      });
    }

    if (noTime.length > 0) {
      groups.push({
        id: 'notime',
        title: 'Bez określonej godziny',
        icon: <CalendarIcon className="h-5 w-5" />,
        routines: noTime,
        color: 'text-gray-600',
      });
    }

    return groups;
  }, [selectedRoutineDate, getRoutinesForDay]);

  const handleTaskCreated = (newTask: TaskWithRelations) => {
    setRoutines([newTask, ...routines]);
    setIsDialogOpen(false);
  };

  const handleTaskUpdated = (updatedTask: TaskWithRelations) => {
    setRoutines(routines.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setEditingTask(null);
  };

  const handleTaskDeleted = (taskId: string) => {
    setRoutines(routines.filter((t) => t.id !== taskId));
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const newStatus = completed ? "COMPLETED" : "TODO";

    // Znajdź rutynę aby sprawdzić trudność
    const routine = routines.find(t => t.id === taskId);

    // Optimistic update
    setRoutines(prev => prev.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ));

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setRoutines(prev => prev.map((t) => (t.id === taskId ? updatedTask : t)));

        // Award XP when completing a routine
        if (completed && routine) {
          // XP based on priority: LOW=10, MEDIUM=15, HIGH=20
          const xpReward = routine.priority === 'HIGH' ? 20 : routine.priority === 'MEDIUM' ? 15 : 10;

          // Show flying XP animation
          showFlyingXP(xpReward);

          // Play sound effect
          playSound('task-complete');

          // Check for XP boost and show appropriate toast
          try {
            const boostResponse = await fetch('/api/gamification/xp-boost/status');
            if (boostResponse.ok) {
              const boostStatus = await boostResponse.json();
              if (boostStatus.active && boostStatus.multiplier > 1) {
                const totalXP = Math.floor(xpReward * boostStatus.multiplier);
                const bonusXP = totalXP - xpReward;

                toast.success(`⚡ +${totalXP} XP (+${bonusXP} bonus!)`, {
                  description: `Ukończono rutynę: ${routine.title} • XP Boost aktywny!`,
                  duration: 3000,
                });
              } else {
                toast.success(`+${xpReward} XP`, {
                  description: `Ukończono rutynę: ${routine.title}`,
                  duration: 2500,
                });
              }
            }
          } catch (error) {
            // Fallback toast
            toast.success(`+${xpReward} XP`, {
              description: `Ukończono rutynę: ${routine.title}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      // Rollback on error
      setRoutines(prev => prev.map((t) =>
        t.id === taskId ? { ...t, status: completed ? "TODO" : "COMPLETED" } : t
      ));
    }
  };

  const handleTogglePin = async (taskId: string, pinned: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setRoutines(routines.map((t) => (t.id === taskId ? updatedTask : t)));
      }
    } catch (error) {
      console.error("Error toggling task pin:", error);
    }
  };

  // Licznik tylko dla wybranego dnia
  const routinesForSelectedDay = useMemo(() =>
    getRoutinesForDay(selectedRoutineDate),
    [selectedRoutineDate, getRoutinesForDay]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              🔄 Rutyny
            </h1>
            <p className="text-muted-foreground">
              Zarządzaj cyklicznymi zadaniami • {routinesForSelectedDay.length} {routinesForSelectedDay.length === 1 ? 'rutyna' : 'rutyn'} na {selectedRoutineDate.toDateString() === new Date().toDateString() ? 'dziś' : selectedRoutineDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nawigacja dat */}
          <div className="flex items-center gap-1 border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedRoutineDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedRoutineDate(startOfDay(newDate));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant={
                selectedRoutineDate.toDateString() === new Date().toDateString()
                  ? "default"
                  : "ghost"
              }
              size="sm"
              onClick={() => setSelectedRoutineDate(startOfDay(new Date()))}
              className="min-w-[120px]"
            >
              <CalendarIcon className="h-3 w-3 mr-2" />
              {selectedRoutineDate.toDateString() === new Date().toDateString()
                ? "Dzisiaj"
                : selectedRoutineDate.toLocaleDateString("pl-PL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newDate = new Date(selectedRoutineDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedRoutineDate(startOfDay(newDate));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <TaskViewToggle
            viewMode={taskViewMode}
            onViewModeChange={handleViewModeChange}
          />
          <Button
            variant="outline"
            onClick={() => setIsTemplatesDialogOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Szablony
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nowa rutyna
          </Button>
        </div>
      </div>

      {/* Content */}
      {groupedRoutines.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔄</div>
          <h2 className="text-xl font-semibold mb-2">
            Brak rutyn na{" "}
            {selectedRoutineDate.toDateString() === new Date().toDateString()
              ? "dzisiaj"
              : selectedRoutineDate.toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "long",
                })}
          </h2>
          <p className="text-muted-foreground mb-4">
            {routines.length === 0
              ? "Utwórz swoją pierwszą rutynę, aby zautomatyzować powtarzające się zadania"
              : "Zmień datę lub przejdź do innego dnia, aby zobaczyć rutyny"
            }
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj rutynę
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedRoutines.map((group) => {
            // Funkcja sprawdzania opóźnienia
            const isRoutineOverdue = (routine: TaskWithRelations) => {
              // Tylko dla dzisiejszych rutyn
              if (selectedRoutineDate.toDateString() !== new Date().toDateString()) return false;
              if (!routine.dueTime || routine.status === "COMPLETED") return false;

              const now = new Date();
              const [hours, minutes] = routine.dueTime.split(':').map(Number);
              const scheduledTime = new Date();
              scheduledTime.setHours(hours, minutes, 0, 0);
              const diffInHours = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
              return diffInHours > 3;
            };

            return (
              <div key={group.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={group.color}>
                    {group.icon}
                  </div>
                  <h2 className="text-lg font-semibold">
                    {group.title}
                  </h2>
                  <Badge variant="secondary" className="ml-2">
                    {group.routines.length}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {group.routines.map((routine) => {
                    const isOverdue = isRoutineOverdue(routine);
                    const TaskComponent = taskViewMode === "compact" ? TaskCardCompact : TaskCard;
                    return (
                      <div
                        key={routine.id}
                        className={cn(
                          taskViewMode === "compact" && isOverdue && "ring-1 ring-red-200 dark:ring-red-800 rounded-md"
                        )}
                      >
                        <TaskComponent
                          task={routine}
                          onEdit={() => setEditingTask(routine)}
                          onDelete={() => handleTaskDeleted(routine.id)}
                          onToggleComplete={(completed) => handleToggleComplete(routine.id, completed)}
                          onTogglePin={(pinned) => handleTogglePin(routine.id, pinned)}
                          onViewDetails={() => setDetailTask(routine)}
                          showRoutineActions={true}
                          {...(taskViewMode === "compact" && { isOverdue })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Form Dialog */}
      <TaskFormDialog
        open={isDialogOpen || !!editingTask}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            setEditingTask(null);
          }
        }}
        task={editingTask}
        categories={categories}
        members={members}
        onTaskCreated={handleTaskCreated}
        onTaskUpdated={handleTaskUpdated}
        defaultIsRecurring={true} // Auto-set recurring for new tasks in routines view
      />

      {/* Task Detail Dialog */}
      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          open={!!detailTask}
          onOpenChange={(open) => {
            if (!open) setDetailTask(null);
          }}
          currentUserId={currentUserId}
          members={members}
        />
      )}

      {/* Routine Templates Dialog */}
      <RoutineTemplatesDialog
        open={isTemplatesDialogOpen}
        onOpenChange={setIsTemplatesDialogOpen}
        onTemplateUsed={() => {
          // Reload routines after template is used
          window.location.reload();
        }}
      />

      {/* Flying XP Component */}
      <FlyingXPComponent />
    </div>
  );
}


