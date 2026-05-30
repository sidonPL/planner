"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, User, Users, BarChart3, Tags, FileText, Filter, X, Repeat, ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskCardCompact } from "@/components/tasks/TaskCardCompact";
import { TaskQuickFilters, QuickFilterType } from "@/components/tasks/TaskQuickFilters";
import { TaskViewToggle, ViewMode } from "@/components/tasks/TaskViewToggle";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { LabelsManagerDialog } from "@/components/tasks/LabelsManagerDialog";
import { TemplatesManagerDialog } from "@/components/tasks/TemplatesManagerDialog";
import type { Task, Category, RecurrenceType } from "@prisma/client";
import { startOfDay, startOfTomorrow, endOfWeek, isSameDay, isWithinInterval, subDays } from "date-fns";
import { getLocalDayDate, isSameLocalDay } from "@/lib/local-date";
import { getRoutinesForDayWithOverdue } from "@/lib/routine-occurrence";
import { cn } from "@/lib/utils";

const COMPLETED_HIDE_AFTER_DAYS = 14;

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
  recurrenceDays?: number[];
  recurrenceType?: RecurrenceType | null;
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface TasksClientProps {
  initialTasks: TaskWithRelations[];
  categories: Category[];
  members: Member[];
  currentUserId: string;
}

export function TasksClient({ initialTasks, categories, members, currentUserId }: TasksClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [detailTask, setDetailTask] = useState<TaskWithRelations | null>(null);
  const [isLabelsDialogOpen, setIsLabelsDialogOpen] = useState(false);
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // New states for quick filters and compact view
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>("all");
  const [taskViewMode, setTaskViewMode] = useState<ViewMode>("list");
  const [showRoutinesSidebar, setShowRoutinesSidebar] = useState(true);
  const [selectedRoutineDate, setSelectedRoutineDate] = useState<Date>(() =>
    getLocalDayDate(new Date())
  );
  const [showArchivedCompleted, setShowArchivedCompleted] = useState(false);

  const getSidebarRoutinesForDay = useCallback(
    (date: Date) =>
      getRoutinesForDayWithOverdue(
        tasks.filter((task) => task.isRecurring && !task.subtaskParentId),
        date
      ),
    [tasks]
  );

  // Ładuj etykiety
  const loadLabels = useCallback(async () => {
    try {
      const response = await fetch("/api/labels");
      if (response.ok) {
        const data = await response.json();
        setLabels(data);
      }
    } catch (error) {
      console.error("Error loading labels:", error);
    }
  }, []);

  useEffect(() => {
    loadLabels();
  }, [loadLabels]);

  // Ładuj preferencje filtrowania z localStorage przy starcie
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem(`taskFilters_${currentUserId}`);
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.status) setStatusFilter(prefs.status);
        if (prefs.priority) setPriorityFilter(prefs.priority);
        if (prefs.category) setCategoryFilter(prefs.category);
        if (prefs.assignee) setAssigneeFilter(prefs.assignee);
        if (prefs.date) setDateFilter(prefs.date);
        if (prefs.label) setLabelFilter(prefs.label);
        if (prefs.viewMode) setViewMode(prefs.viewMode);
        if (prefs.quickFilter) setQuickFilter(prefs.quickFilter);
        if (prefs.taskViewMode) setTaskViewMode(prefs.taskViewMode);
        if (prefs.showRoutinesSidebar !== undefined) setShowRoutinesSidebar(prefs.showRoutinesSidebar);
        if (prefs.showArchivedCompleted !== undefined) {
          setShowArchivedCompleted(Boolean(prefs.showArchivedCompleted));
        } else if (prefs.showOlderCompleted !== undefined) {
          // Backward compatibility dla starszego klucza preferencji
          setShowArchivedCompleted(Boolean(prefs.showOlderCompleted));
        }
      }
    } catch (error) {
      console.error("Nie udało się załadować preferencji:", error);
    } finally {
      setPreferencesLoaded(true);
    }
  }, [currentUserId]);

  // Zapisuj preferencje przy zmianie filtrów
  const savePreferences = useCallback(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem(`taskFilters_${currentUserId}`, JSON.stringify({
        status: statusFilter,
        priority: priorityFilter,
        category: categoryFilter,
        assignee: assigneeFilter,
        date: dateFilter,
        label: labelFilter,
        viewMode,
        quickFilter,
        taskViewMode,
        showRoutinesSidebar,
        showArchivedCompleted,
      }));
    } catch (error) {
      console.error("Nie udało się zapisać preferencji:", error);
    }
  }, [statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFilter, labelFilter, viewMode, quickFilter, taskViewMode, showRoutinesSidebar, showArchivedCompleted, preferencesLoaded, currentUserId]);

  useEffect(() => {
    savePreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFilter, labelFilter, viewMode, quickFilter, taskViewMode, showRoutinesSidebar, preferencesLoaded, currentUserId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const isStandardTask = !task.isRecurring;

      // Quick filter logic
      const today = startOfDay(new Date());
      const tomorrow = startOfTomorrow();
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

      let matchesQuickFilter;
      switch (quickFilter) {
        case "today":
          matchesQuickFilter = isStandardTask && (task.dueDate ? isSameDay(new Date(task.dueDate), today) : false);
          break;
        case "tomorrow":
          matchesQuickFilter = isStandardTask && (task.dueDate ? isSameDay(new Date(task.dueDate), tomorrow) : false);
          break;
        case "thisWeek":
          matchesQuickFilter = isStandardTask && (task.dueDate ? isWithinInterval(new Date(task.dueDate), { start: today, end: weekEnd }) : false);
          break;
        case "routines":
          matchesQuickFilter = task.isRecurring;
          break;
        case "overdue":
          matchesQuickFilter = isStandardTask && (task.dueDate ? new Date(task.dueDate) < today && task.status !== "COMPLETED" : false);
          break;
        case "noDate":
          matchesQuickFilter = isStandardTask && !task.dueDate;
          break;
        case "mine":
          matchesQuickFilter = isStandardTask && task.assigneeId === currentUserId;
          break;
        case "all":
        default:
          matchesQuickFilter = true;
      }

      if (!matchesQuickFilter) return false;

      // Filtr widoku (moje/wszystkie)
      if (viewMode === "mine" && task.assigneeId !== currentUserId) {
        return false;
      }

      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      const matchesCategory = categoryFilter === "all" || task.categoryId === categoryFilter;
      const matchesAssignee = assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" ? !task.assigneeId : task.assigneeId === assigneeFilter);
      const matchesLabel = labelFilter === "all" ||
        (task.labels?.some((l) => l.id === labelFilter) ?? false);

      // Filtr zakresu dat (z zaawansowanych filtrów)
      let matchesDate = true;
      if (dateFilter !== "all" && task.dueDate) {
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

      return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee && matchesDate && matchesLabel;
    });
  }, [tasks, quickFilter, viewMode, currentUserId, searchQuery, statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFilter, labelFilter]);

  // Calculate counts for quick filters
  const quickFilterCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = startOfTomorrow();
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const standardTasks = tasks.filter((t) => !t.isRecurring);
    const routineTasks = tasks.filter((t) => t.isRecurring);

    return {
      all: standardTasks.length,
      today: standardTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), today)).length,
      tomorrow: standardTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), tomorrow)).length,
      thisWeek: standardTasks.filter(t => t.dueDate && isWithinInterval(new Date(t.dueDate), { start: today, end: weekEnd })).length,
      routines: routineTasks.length,
      overdue: standardTasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== "COMPLETED").length,
      noDate: standardTasks.filter(t => !t.dueDate).length,
      mine: standardTasks.filter(t => t.assigneeId === currentUserId).length,
    };
  }, [tasks, currentUserId]);

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

  // Smart refresh - odświeża konkretne zadanie bez przeładowania strony
  const refreshTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      }
    } catch (error) {
      console.error("Error refreshing task:", error);
    }
  }, []);

  // Fallback sync dla produkcji: pobierz pełną listę zadań z backendu
  const refreshTasksList = useCallback(async () => {
    try {
      const response = await fetch("/api/tasks", { cache: "no-store" });
      if (response.ok) {
        const latestTasks = await response.json();
        setTasks(latestTasks);
      }
    } catch (error) {
      console.error("Error refreshing tasks list:", error);
    }
  }, []);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    const newStatus = completed ? "COMPLETED" : "TODO";

    // Znajdź zadanie które zmieniamy
    const targetTask = tasks.find(t => t.id === taskId);

    // Zapisz poprzedni stan dla rollback
    const previousTasks = tasks;

    // Optimistic update
    setTasks(prev => prev.map((t) => {
      if (t.id === taskId) {
        return { ...t, status: newStatus };
      }
      // Jeśli to podzadanie, zaktualizuj licznik w rodzicu
      if (targetTask?.subtaskParentId && t.id === targetTask.subtaskParentId) {
        const updatedSubtasks = prev
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
        // Odśwież zadanie i rodzica jeśli to podzadanie
        setTasks(prev => prev.map((t) => (t.id === taskId ? updatedTask : t)));
        if (targetTask?.subtaskParentId) {
          await refreshTask(targetTask.subtaskParentId);
        }
      } else {
        // Rollback przy błędzie
        setTasks(previousTasks);
      }
    } catch (error) {
      console.error("Error toggling task:", error);
      // Rollback optimistic update
      setTasks(previousTasks);
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

  // Sortuj zadania - przypięte na górze
  // Filtruj tylko główne zadania (bez podzadań i bez rutyn) - podzadania będą renderowane pod rodzicem, rutyny w sidebarze
  const mainTasks = filteredTasks.filter((t) => !t.subtaskParentId && !t.isRecurring);

  const sortedFilteredTasks = [...mainTasks].sort((a, b) => {
    // Najpierw przypięte
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // Sortowanie po dacie
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    return 0;
  });

  const todoTasks = sortedFilteredTasks.filter((t) => t.status === "TODO");
  const inProgressTasks = sortedFilteredTasks.filter((t) => t.status === "IN_PROGRESS");
  const completedTasks = sortedFilteredTasks.filter((t) => t.status === "COMPLETED");
  const completedCutoffDate = subDays(startOfDay(new Date()), COMPLETED_HIDE_AFTER_DAYS);
  const getCompletionReferenceDate = (task: TaskWithRelations) => {
    const completedAt = task.completions?.[0]?.completedAt;
    if (completedAt) return new Date(completedAt);
    return new Date(task.updatedAt);
  };
  const recentCompletedTasks = completedTasks.filter((task) => {
    return getCompletionReferenceDate(task) >= completedCutoffDate;
  });
  const olderCompletedTasks = completedTasks.filter((task) => {
    return getCompletionReferenceDate(task) < completedCutoffDate;
  });
  const isArchiveForcedOpen = statusFilter === "COMPLETED";
  const shouldShowArchivedCompleted = isArchiveForcedOpen || showArchivedCompleted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
          <h1 className="text-2xl font-bold tracking-tight">Zadania</h1>
          <p className="text-muted-foreground">
            Zarządzaj zadaniami swojego domu
          </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nowe zadanie</span>
            <span className="sm:hidden">Dodaj</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <TaskViewToggle
            viewMode={taskViewMode}
            onViewModeChange={(mode) => {
              if (mode === "kanban") {
                window.location.href = "/tasks/kanban";
              } else {
                setTaskViewMode(mode);
              }
            }}
          />

          {/* Przełącznik widoku */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "all" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => setViewMode("all")}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Wszystkie</span>
            </Button>
            <Button
              variant={viewMode === "mine" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => setViewMode("mine")}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Moje</span>
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Narzędzia
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/tasks/routines" className="flex items-center gap-2 w-full">
                  <Repeat className="h-4 w-4" />
                  Rutyny
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsLabelsDialogOpen(true)} className="gap-2">
                <Tags className="h-4 w-4" />
                Etykiety
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsTemplatesDialogOpen(true)} className="gap-2">
                <FileText className="h-4 w-4" />
                Szablony
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/tasks/stats" className="flex items-center gap-2 w-full">
                  <BarChart3 className="h-4 w-4" />
                  Statystyki
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Filters */}
      <TaskQuickFilters
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
        counts={quickFilterCounts}
      />

      {/* Filters - Nowy kompaktowy układ */}
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
          {/* Podstawowe filtry - zawsze widoczne */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Wszystkie</SelectItem>
              <SelectItem value="TODO">Do zrobienia</SelectItem>
              <SelectItem value="IN_PROGRESS">W trakcie</SelectItem>
              <SelectItem value="COMPLETED">Ukończone</SelectItem>
            </SelectContent>
          </Select>

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

          {/* Zaawansowane filtry w Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Więcej</span>
                {(categoryFilter !== "all" || assigneeFilter !== "all" || dateFilter !== "all" || labelFilter !== "all") && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {[categoryFilter !== "all", assigneeFilter !== "all", dateFilter !== "all", labelFilter !== "all"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-4" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Zaawansowane filtry</h4>
                  {(categoryFilter !== "all" || assigneeFilter !== "all" || dateFilter !== "all" || labelFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={() => {
                        setCategoryFilter("all");
                        setAssigneeFilter("all");
                        setDateFilter("all");
                        setLabelFilter("all");
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

                  {labels.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Etykieta</label>
                      <Select value={labelFilter} onValueChange={setLabelFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Wszystkie</SelectItem>
                          {labels.map((label) => (
                            <SelectItem key={label.id} value={label.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: label.color }}
                                />
                                {label.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Task Lists */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Brak zadań do wyświetlenia</p>
          <Button variant="link" onClick={() => setIsDialogOpen(true)}>
            Dodaj pierwsze zadanie
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Główna lista zadań */}
          <div className={cn(
            "space-y-8",
            showRoutinesSidebar ? "lg:col-span-8" : "lg:col-span-12"
          )}>
            {/* Todo Tasks */}
            {todoTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                  <h2 className="text-base font-semibold text-foreground/90">
                    Do zrobienia
                  </h2>
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {todoTasks.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {todoTasks.map((task) => (
                    <div key={task.id} className="space-y-1.5">
                      {taskViewMode === "compact" ? (
                        <TaskCardCompact
                          task={task}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => handleTaskDeleted(task.id)}
                          onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                          onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                          onViewDetails={() => setDetailTask(task)}
                        />
                      ) : (
                        <TaskCard
                          task={task}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => handleTaskDeleted(task.id)}
                          onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                          onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                          onViewDetails={() => setDetailTask(task)}
                        />
                      )}
                      {/* Renderuj WSZYSTKIE podzadania tego zadania, niezależnie od statusu */}
                      {tasks.filter(t => t.subtaskParentId === task.id).map((subtask) => (
                        taskViewMode === "compact" ? (
                          <TaskCardCompact
                            key={subtask.id}
                            task={subtask}
                            onEdit={() => setEditingTask(subtask)}
                            onDelete={() => handleTaskDeleted(subtask.id)}
                            onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                            onViewDetails={() => setDetailTask(subtask)}
                          />
                        ) : (
                          <TaskCard
                            key={subtask.id}
                            task={subtask}
                            onEdit={() => setEditingTask(subtask)}
                            onDelete={() => handleTaskDeleted(subtask.id)}
                            onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                            onViewDetails={() => setDetailTask(subtask)}
                          />
                        )
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h2 className="text-base font-semibold text-foreground/90">
                  W trakcie
                </h2>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {inProgressTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {inProgressTasks.map((task) => (
                  <div key={task.id} className="space-y-1.5">
                    {taskViewMode === "compact" ? (
                      <TaskCardCompact
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleTaskDeleted(task.id)}
                        onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                        onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                        onViewDetails={() => setDetailTask(task)}
                      />
                    ) : (
                      <TaskCard
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleTaskDeleted(task.id)}
                        onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                        onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                        onViewDetails={() => setDetailTask(task)}
                      />
                    )}
                    {/* Renderuj WSZYSTKIE podzadania tego zadania */}
                    {tasks.filter(t => t.subtaskParentId === task.id).map((subtask) => (
                      taskViewMode === "compact" ? (
                        <TaskCardCompact
                          key={subtask.id}
                          task={subtask}
                          onEdit={() => setEditingTask(subtask)}
                          onDelete={() => handleTaskDeleted(subtask.id)}
                          onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                          onViewDetails={() => setDetailTask(subtask)}
                        />
                      ) : (
                        <TaskCard
                          key={subtask.id}
                          task={subtask}
                          onEdit={() => setEditingTask(subtask)}
                          onDelete={() => handleTaskDeleted(subtask.id)}
                          onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                          onViewDetails={() => setDetailTask(subtask)}
                        />
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <h2 className="text-base font-semibold text-foreground/90">
                  Ukończone
                </h2>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {recentCompletedTasks.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {recentCompletedTasks.map((task) => (
                  <div key={task.id} className="space-y-1.5">
                    {taskViewMode === "compact" ? (
                      <TaskCardCompact
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleTaskDeleted(task.id)}
                        onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                        onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                        onViewDetails={() => setDetailTask(task)}
                      />
                    ) : (
                      <TaskCard
                        task={task}
                        onEdit={() => setEditingTask(task)}
                        onDelete={() => handleTaskDeleted(task.id)}
                        onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                        onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                        onViewDetails={() => setDetailTask(task)}
                      />
                    )}
                    {/* Renderuj WSZYSTKIE podzadania tego zadania */}
                    {tasks.filter(t => t.subtaskParentId === task.id).map((subtask) => (
                      taskViewMode === "compact" ? (
                        <TaskCardCompact
                          key={subtask.id}
                          task={subtask}
                          onEdit={() => setEditingTask(subtask)}
                          onDelete={() => handleTaskDeleted(subtask.id)}
                          onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                          onViewDetails={() => setDetailTask(subtask)}
                        />
                      ) : (
                        <TaskCard
                          key={subtask.id}
                          task={subtask}
                          onEdit={() => setEditingTask(subtask)}
                          onDelete={() => handleTaskDeleted(subtask.id)}
                          onToggleComplete={(completed) => handleToggleComplete(subtask.id, completed)}
                          onViewDetails={() => setDetailTask(subtask)}
                        />
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Archived Completed Tasks */}
          {(completedTasks.length > 0 || statusFilter === "COMPLETED") && (
            <Collapsible
              open={shouldShowArchivedCompleted}
              onOpenChange={(open) => {
                if (!isArchiveForcedOpen) {
                  setShowArchivedCompleted(open);
                }
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-1">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground/90">
                  Archiwum
                </h2>
                <Badge variant="outline" className="ml-1 text-xs">
                  {olderCompletedTasks.length}
                </Badge>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={isArchiveForcedOpen}
                  >
                    {shouldShowArchivedCompleted ? "Ukryj archiwum" : "Pokaż archiwum"}
                    <ChevronDown
                      className={cn(
                        "ml-1 h-3.5 w-3.5 transition-transform",
                        shouldShowArchivedCompleted && "rotate-180"
                      )}
                    />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="space-y-2 data-[state=closed]:hidden">
              {olderCompletedTasks.length > 0 && (
                <div className="space-y-2">
                  {olderCompletedTasks.map((task) => (
                    <div key={task.id} className="space-y-1.5">
                      {taskViewMode === "compact" ? (
                        <TaskCardCompact
                          task={task}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => handleTaskDeleted(task.id)}
                          onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                          onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                          onViewDetails={() => setDetailTask(task)}
                        />
                      ) : (
                        <TaskCard
                          task={task}
                          onEdit={() => setEditingTask(task)}
                          onDelete={() => handleTaskDeleted(task.id)}
                          onToggleComplete={(completed) => handleToggleComplete(task.id, completed)}
                          onTogglePin={(pinned) => handleTogglePin(task.id, pinned)}
                          onViewDetails={() => setDetailTask(task)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {olderCompletedTasks.length === 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  Brak zadań starszych niż {COMPLETED_HIDE_AFTER_DAYS} dni.
                </p>
              )}
              </CollapsibleContent>
            </Collapsible>
          )}
          </div>

          {/* Sidebar z rutynami */}
          {showRoutinesSidebar && (
            <div className="lg:col-span-4 space-y-4">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      <CardTitle className="text-base">Rutyny</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href="/tasks/routines">
                        <Button variant="ghost" size="sm" className="h-8 text-xs">
                          Zobacz wszystkie
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setShowRoutinesSidebar(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Nawigacja dat */}
                  <div className="flex items-center justify-center gap-2 mt-3">
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
                          : "outline"
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
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    // Filtruj rutyny dla wybranego dnia
                    const routines = getSidebarRoutinesForDay(selectedRoutineDate);

                    if (routines.length === 0) {
                      return (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          <Repeat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>
                            Brak rutyn na{" "}
                            {selectedRoutineDate.toDateString() === new Date().toDateString()
                              ? "dzisiaj"
                              : selectedRoutineDate.toLocaleDateString("pl-PL", {
                                  day: "numeric",
                                  month: "long",
                                })}
                          </p>
                          <Link href="/tasks/routines">
                            <Button variant="link" size="sm" className="mt-2">
                              Utwórz rutynę
                            </Button>
                          </Link>
                        </div>
                      );
                    }

                    // Funkcja sprawdzania opóźnienia
                    const isRoutineOverdue = (routine: typeof routines[0]) => {
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
                      morning: routines.filter(r => getTimeOfDay(r.dueTime) === "morning"),
                      afternoon: routines.filter(r => getTimeOfDay(r.dueTime) === "afternoon"),
                      evening: routines.filter(r => getTimeOfDay(r.dueTime) === "evening"),
                      night: routines.filter(r => getTimeOfDay(r.dueTime) === "night"),
                      notime: routines.filter(r => getTimeOfDay(r.dueTime) === "notime"),
                    };

                    const timeGroups = [
                      { key: "morning", label: "🌅 Poranne", routines: routinesByTime.morning },
                      { key: "afternoon", label: "☀️ Popołudniowe", routines: routinesByTime.afternoon },
                      { key: "evening", label: "🌆 Wieczorne", routines: routinesByTime.evening },
                      { key: "night", label: "🌙 Nocne", routines: routinesByTime.night },
                      { key: "notime", label: "⏰ Bez godziny", routines: routinesByTime.notime },
                    ].filter(group => group.routines.length > 0);

                    return (
                      <div className="space-y-3">
                        {timeGroups.map((group) => (
                          <div key={group.key} className="space-y-1.5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                              {group.label}
                            </p>
                            <div className="space-y-1">
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
                                        onViewDetails={() => setDetailTask(routine)}
                                        isOverdue={isOverdue}
                                        showRoutineActions
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {!showRoutinesSidebar && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowRoutinesSidebar(true)}
                >
                  <Repeat className="mr-2 h-4 w-4" />
                  Pokaż rutyny
                </Button>
              )}
            </div>
          )}
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
      />

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTask(null);
          }
        }}
        currentUserId={currentUserId}
        members={members}
        onTaskUpdate={(updatedTask) => {
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
          setDetailTask(updatedTask);
        }}
      />

      {/* Labels Manager Dialog */}
      <LabelsManagerDialog
        open={isLabelsDialogOpen}
        onOpenChange={setIsLabelsDialogOpen}
        onLabelsChanged={() => {
          loadLabels();
        }}
      />

      {/* Templates Manager Dialog */}
      <TemplatesManagerDialog
        open={isTemplatesDialogOpen}
        onOpenChange={setIsTemplatesDialogOpen}
        categories={categories}
        members={members}
        onTemplateUsed={async (result) => {
          const createdTasks = Array.isArray(result?.tasks)
            ? (result.tasks as TaskWithRelations[])
            : [];

          if (createdTasks.length > 0) {
            setTasks((prev) => {
              const existingIds = new Set(prev.map((task) => task.id));
              const freshTasks = createdTasks.filter((task) => !existingIds.has(task.id));
              return [...freshTasks, ...prev];
            });
            // Dodatkowe dociągnięcie stanu z backendu (np. przy różnicach środowisk prod/dev)
            void refreshTasksList();
            return;
          }

          if (!result?.parentTaskId) return;

          // Fallback: doładuj parent task gdy API nie zwróci listy zadań
          try {
            const response = await fetch(`/api/tasks/${result.parentTaskId}`);
            if (response.ok) {
              const newTask = await response.json();
              setTasks((prev) => [newTask, ...prev]);
              void refreshTasksList();
            } else {
              void refreshTasksList();
            }
          } catch (error) {
            console.error("Error loading new task:", error);
            void refreshTasksList();
          }
        }}
      />
    </div>
  );
}


