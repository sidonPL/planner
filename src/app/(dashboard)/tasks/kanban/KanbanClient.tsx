"use client";

import { useState, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Task, Category, RecurrenceType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ArrowLeft, Search, Filter, X, Repeat, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskCardCompact } from "@/components/tasks/TaskCardCompact";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { startOfDay, endOfWeek, isSameDay, isWithinInterval } from "date-fns";
import Link from "next/link";
import { toast } from "sonner";
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
  position: number;
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
  recurrenceDays?: number[];
  recurrenceType?: RecurrenceType | null;
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface KanbanClientProps {
  initialTasks: TaskWithRelations[];
  categories: Category[];
  members: Member[];
}

const columns = [
  { id: "TODO", title: "Do zrobienia", color: "bg-yellow-500" },
  { id: "IN_PROGRESS", title: "W trakcie", color: "bg-blue-500" },
  { id: "COMPLETED", title: "Ukończone", color: "bg-green-500" },
] as const;

export function KanbanClient({ initialTasks, categories, members }: KanbanClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

  // Filtry
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showRoutines, setShowRoutines] = useState(true);
  const [selectedRoutineDate, setSelectedRoutineDate] = useState<Date>(startOfDay(new Date()));

  // Funkcja sprawdzająca czy rutyna powinna być wyświetlona dla danego dnia
  const isRoutineForDay = (task: TaskWithRelations, date: Date) => {
    if (!task.isRecurring) return false;

    // Jeśli rutyna ma dueDate, sprawdź czy to wybrany dzień
    if (task.dueDate) {
      const taskDate = new Date(task.dueDate);
      const isSameDate =
        date.getFullYear() === taskDate.getFullYear() &&
        date.getMonth() === taskDate.getMonth() &&
        date.getDate() === taskDate.getDate();

      if (!isSameDate) return false; // Rutyna z inną datą - ukryj
    }

    const dayOfWeek = date.getDay(); // 0=Niedziela, 1=Poniedziałek, ..., 6=Sobota

    // Dla DAILY - zawsze pokazuj
    if (task.recurrenceType === "DAILY") return true;

    // Dla WEEKLY - sprawdź recurrenceDays
    if (task.recurrenceType === "WEEKLY") {
      if (!task.recurrenceDays || task.recurrenceDays.length === 0) return true;
      return task.recurrenceDays.includes(dayOfWeek);
    }

    // Dla MONTHLY - sprawdź dzień miesiąca
    if (task.recurrenceType === "MONTHLY") {
      if (!task.recurrenceDays || task.recurrenceDays.length === 0) return true;
      const dayOfMonth = date.getDate();
      return task.recurrenceDays.includes(dayOfMonth);
    }

    // Dla YEARLY i innych - zawsze pokazuj
    return true;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filtrowanie zadań
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Filtr wyszukiwania
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtr priorytetu
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;

      // Filtr kategorii
      const matchesCategory = categoryFilter === "all" || task.categoryId === categoryFilter;

      // Filtr osoby przypisanej
      const matchesAssignee = assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" ? !task.assigneeId : task.assigneeId === assigneeFilter);

      // Filtr dat
      let matchesDate = true;
      if (dateFilter !== "all" && task.dueDate) {
        const today = startOfDay(new Date());
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
        const taskDate = new Date(task.dueDate);
        const monthEnd = new Date(today);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        switch (dateFilter) {
          case "today":
            matchesDate = isSameDay(taskDate, today);
            break;
          case "week":
            matchesDate = isWithinInterval(taskDate, { start: today, end: weekEnd });
            break;
          case "month":
            matchesDate = taskDate >= today && taskDate < monthEnd;
            break;
          case "overdue":
            matchesDate = taskDate < today && task.status !== "COMPLETED";
            break;
          case "no-date":
            matchesDate = false;
            break;
        }
      } else if (dateFilter === "no-date") {
        matchesDate = !task.dueDate;
      }

      return matchesSearch && matchesPriority && matchesCategory && matchesAssignee && matchesDate;
    });
  }, [tasks, searchQuery, priorityFilter, categoryFilter, assigneeFilter, dateFilter]);

  // Filtruj rutyny dla wybranego dnia
  const routineTasks = filteredTasks.filter(t => t.isRecurring && !t.subtaskParentId && isRoutineForDay(t, selectedRoutineDate));

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Sprawdź czy to jest kolumna
    if (!["TODO", "IN_PROGRESS", "COMPLETED"].includes(newStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Optimistic update
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus as Task["status"] } : t)));

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        // Rollback
        setTasks(tasks);
        toast.error("Nie udało się zaktualizować zadania");
      } else {
        toast.success("Zaktualizowano status zadania");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      setTasks(tasks);
      toast.error("Wystąpił błąd");
    }
  };

  const handleTaskCreated = (newTask: TaskWithRelations) => {
    setTasks([newTask, ...tasks]);
    setIsDialogOpen(false);
  };

  const handleTaskUpdated = (updatedTask: TaskWithRelations) => {
    setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setEditingTask(null);
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const newStatus = completed ? "COMPLETED" : "TODO";

    // Znajdź zadanie które zmieniamy
    const targetTask = tasks.find(t => t.id === taskId);

    // Optimistic update
    setTasks(tasks.map((t) => {
      if (t.id === taskId) {
        // Aktualizuj zadanie
        return { ...t, status: newStatus };
      }
      // Jeśli to podzadanie, zaktualizuj licznik w rodzicu
      if (targetTask?.subtaskParentId && t.id === targetTask.subtaskParentId) {
        const updatedSubtasks = tasks
          .filter(st => st.subtaskParentId === t.id)
          .map(st => st.id === taskId ? { ...st, status: newStatus } : st)
          .map(st => ({ id: st.id, status: st.status }));
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    }));

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        // Pobierz zaktualizowane dane rodzica jeśli to podzadanie
        if (targetTask?.subtaskParentId) {
          const parentResponse = await fetch(`/api/tasks/${targetTask.subtaskParentId}`);
          if (parentResponse.ok) {
            const parentTask = await parentResponse.json();
            setTasks(tasks.map((t) =>
              t.id === taskId ? updatedTask :
              t.id === targetTask.subtaskParentId ? parentTask : t
            ));
            return;
          }
        }
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      }
    } catch (error) {
      console.error("Error toggling task:", error);
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
        setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
      }
    } catch (error) {
      console.error("Error toggling task pin:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót do listy
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tablica Kanban</h1>
            <p className="text-muted-foreground">Wizualizuj przepływ zadań</p>
          </div>
        </div>
      </div>

      {/* Filtry */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Szukaj zadań..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priorytet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="URGENT">🔴 Pilne</SelectItem>
              <SelectItem value="HIGH">🟠 Wysokie</SelectItem>
              <SelectItem value="MEDIUM">🔵 Średnie</SelectItem>
              <SelectItem value="LOW">🟢 Niskie</SelectItem>
            </SelectContent>
          </Select>

          {/* Zaawansowane filtry */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Więcej</span>
                {(categoryFilter !== "all" || assigneeFilter !== "all" || dateFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {[categoryFilter !== "all", assigneeFilter !== "all", dateFilter !== "all"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Zaawansowane filtry</h4>
                  {(categoryFilter !== "all" || assigneeFilter !== "all" || dateFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={() => {
                        setCategoryFilter("all");
                        setAssigneeFilter("all");
                        setDateFilter("all");
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Wyczyść
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Kategoria</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Przypisana osoba</label>
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszyscy</SelectItem>
                        <SelectItem value="unassigned">Nieprzypisane</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name || "Bez nazwy"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Termin</label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Wszystkie</SelectItem>
                        <SelectItem value="today">📅 Dzisiaj</SelectItem>
                        <SelectItem value="week">📆 Ten tydzień</SelectItem>
                        <SelectItem value="month">🗓️ Ten miesiąc</SelectItem>
                        <SelectItem value="overdue">⚠️ Przeterminowane</SelectItem>
                        <SelectItem value="no-date">➖ Bez terminu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant={showRoutines ? "default" : "outline"}
            onClick={() => setShowRoutines(!showRoutines)}
          >
            <Repeat className="mr-2 h-4 w-4" />
            Rutyny
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => {
            // Filtruj zadania: wyklucz rutyny (pokazują się w osobnej sekcji)
            const columnTasks = filteredTasks
              .filter((t) => t.status === column.id && !t.isRecurring && !t.subtaskParentId)
              .sort((a, b) => {
                // Przypięte na górze
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                // Potem po pozycji
                return (a.position || 0) - (b.position || 0);
              });

            return (
              <Card key={column.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-3 w-3 rounded-full", column.color)} />
                      {column.title}
                      <span className="text-sm text-muted-foreground">({columnTasks.length})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setIsDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-0">
                  <SortableContext items={columnTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2 min-h-[100px]" data-column={column.id}>
                      {columnTasks.map((task) => (
                        <div key={task.id} className="space-y-2">
                          <div id={task.id}>
                            <TaskCard
                              task={task}
                              onEdit={() => setEditingTask(task)}
                              onDelete={() => handleTaskDeleted(task.id)}
                              onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                              onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                            />
                          </div>
                          {/* Renderuj podzadania */}
                          {tasks.filter(t => t.subtaskParentId === task.id).map((subtask) => (
                            <TaskCard
                              key={subtask.id}
                              task={subtask}
                              onEdit={() => setEditingTask(subtask)}
                              onDelete={() => handleTaskDeleted(subtask.id)}
                              onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="opacity-50">
              <TaskCard
                task={activeTask}
                onEdit={() => {}}
                onDelete={() => {}}
                onToggleComplete={() => {}}
                onTogglePin={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Rutyny - osobna sekcja na dole */}
      {showRoutines && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                <CardTitle className="text-base">Rutyny</CardTitle>
                {routineTasks.length > 0 && (
                  <Badge variant="secondary">{routineTasks.length}</Badge>
                )}
              </div>

              {/* Nawigacja dat */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(selectedRoutineDate);
                    newDate.setDate(newDate.getDate() - 1);
                    setSelectedRoutineDate(newDate);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  variant={
                    selectedRoutineDate.toDateString() === new Date().toDateString()
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setSelectedRoutineDate(new Date())}
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
                    setSelectedRoutineDate(newDate);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {routineTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Repeat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Brak rutyn na{" "}
                  {selectedRoutineDate.toDateString() === new Date().toDateString()
                    ? "dzisiaj"
                    : selectedRoutineDate.toLocaleDateString("pl-PL", {
                        day: "numeric",
                        month: "long",
                      })}
                </p>
              </div>
            ) : (
              (() => {
                // Funkcja sprawdzania opóźnienia
                const isRoutineOverdue = (routine: typeof routineTasks[0]) => {
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

              // Grupowanie według pory dnia
              const getTimeOfDay = (time: string | null): string => {
                if (!time) return "notime";
                const [hours] = time.split(':').map(Number);
                if (hours >= 5 && hours < 12) return "morning";
                if (hours >= 12 && hours < 17) return "afternoon";
                if (hours >= 17 && hours < 23) return "evening";
                return "night";
              };

              const routinesByTime = {
                morning: routineTasks.filter(r => getTimeOfDay(r.dueTime) === "morning"),
                afternoon: routineTasks.filter(r => getTimeOfDay(r.dueTime) === "afternoon"),
                evening: routineTasks.filter(r => getTimeOfDay(r.dueTime) === "evening"),
                night: routineTasks.filter(r => getTimeOfDay(r.dueTime) === "night"),
                notime: routineTasks.filter(r => getTimeOfDay(r.dueTime) === "notime"),
              };

              const timeGroups = [
                { key: "morning", label: "🌅 Poranne", routines: routinesByTime.morning },
                { key: "afternoon", label: "☀️ Popołudniowe", routines: routinesByTime.afternoon },
                { key: "evening", label: "🌆 Wieczorne", routines: routinesByTime.evening },
                { key: "night", label: "🌙 Nocne", routines: routinesByTime.night },
                { key: "notime", label: "⏰ Bez godziny", routines: routinesByTime.notime },
              ].filter(group => group.routines.length > 0);

              return (
                <div className="space-y-4">
                  {timeGroups.map((group) => (
                    <div key={group.key} className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {group.label}
                      </p>
                      <div className="space-y-1.5">
                        {group.routines
                          .sort((a, b) => {
                            if (a.dueTime && b.dueTime) {
                              return a.dueTime.localeCompare(b.dueTime);
                            }
                            return 0;
                          })
                          .map((routine) => {
                            const isOverdue = isRoutineOverdue(routine);
                            return (
                              <div
                                key={routine.id}
                                className={cn(
                                  isOverdue && "ring-1 ring-red-200 dark:ring-red-800 rounded-md"
                                )}
                              >
                                <TaskCardCompact
                                  task={routine}
                                  onEdit={() => setEditingTask(routine)}
                                  onDelete={() => handleTaskDeleted(routine.id)}
                                  onToggleComplete={(completed) => handleToggleComplete(routine.id, completed)}
                                  onTogglePin={(pinned) => handleTogglePin(routine.id, pinned)}
                                  isOverdue={isOverdue}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
            )}
          </CardContent>
        </Card>
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
      />
    </div>
  );
}

