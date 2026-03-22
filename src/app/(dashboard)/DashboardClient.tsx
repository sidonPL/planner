"use client";

import { useState, useCallback, useMemo } from "react";
import { format, differenceInDays } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import {
  CheckSquare,
  Calendar,
  ShoppingCart,
  Wallet,
  Users,
  ArrowRight,
  Plus,
  Clock,
  Bell,
  Plane,
  TrendingUp,
  TrendingDown,
  Home,
  MapPin,
  AlertCircle,
  User,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Widgets
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { MiniCalendarWidget } from "@/components/widgets/MiniCalendarWidget";
import { ScheduleWidget } from "@/components/widgets/ScheduleWidget";
import { BudgetWidget } from "@/components/widgets/BudgetWidget";
import { MealsWidget } from "@/components/widgets/MealsWidget";
import { ShoppingWidget } from "@/components/widgets/ShoppingWidget";
import { UpcomingBirthdaysWidget } from "@/components/widgets/UpcomingBirthdaysWidget";
import { UpcomingNameDaysWidget } from "@/components/widgets/UpcomingNameDaysWidget";
import { UpcomingAnniversariesWidget } from "@/components/widgets/UpcomingAnniversariesWidget";
import { FinancialAccountsWidget } from "@/components/widgets/FinancialAccountsWidget";
import { GamificationWidget } from "@/components/widgets/GamificationWidget";

// Dashboard components
import { UserSwitcher } from "@/components/dashboard/UserSwitcher";
import { DashboardWidgets, WidgetConfig, WidgetSize } from "@/components/dashboard/DashboardWidgets";

import { Task, Event, ShoppingItem, Meal, Trip, Notification, UserSettings, Anniversary, FinancialAccount, Transaction, BoardNote } from "@prisma/client";
import { getUpcomingBirthdays } from "@/lib/birthdays";
import { getUpcomingNameDays } from "@/lib/namedays";
import { getUpcomingAnniversaries } from "@/lib/anniversaries";

type TaskWithAssignee = Task & {
  assignee: { id: string; name: string | null; color: string } | null;
};

type MealWithRelations = Meal & {
  recipe: { id: string; name: string } | null;
  simpleDish: { id: string; name: string } | null;
  assignee?: { id: string; name: string | null; color: string } | null;
};

type MemberWithPresence = {
  id: string;
  name: string | null;
  email?: string | null;
  avatar: string | null;
  color: string;
  role?: string;
  birthDate?: Date | null;
  nameDay?: string | null;
  presenceRecords: { status: string }[];
};

type ScheduleWithUser = {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  dayOfWeek: number[];
  startTime: string;
  endTime: string;
  location: string | null;
  color: string | null;
  isOneTime: boolean;
  oneTimeDate: Date | null;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  recurrenceUnit: "WEEKLY" | "MONTHLY";
  repeatEvery: number;
  specificDates: Date[];
  exceptions: {
    id: string;
    date: Date;
    reason: string | null;
  }[];
  user: { id: string; name: string | null; color: string };
};

type TransactionData = {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
  category: string | null;
  userId: string;
};

interface DashboardClientProps {
  user: { id: string; name?: string | null };
  stats: {
    todayTasksCount: number;
    todayTasksCompleted: number;
    weekEventsCount: number;
    shoppingCount: number;
    shoppingUrgent: number;
    monthExpenses: number;
    monthIncome: number;
    unreadNotifications: number;
  };
  todayTasks: TaskWithAssignee[];
  todayRoutines: TaskWithAssignee[];
  todayEvents: Event[];
  shoppingItems: ShoppingItem[];
  members: MemberWithPresence[];
  todayMeals: MealWithRelations[];
  upcomingTrips: Trip[];
  notifications: Notification[];
  schedules: ScheduleWithUser[];
  transactions: TransactionData[];
  userSettings: UserSettings | null;
  anniversaries: Anniversary[];
  externalBirthdays: {
    id: string;
    name: string;
    birthDate: Date;
    color: string;
    relationship: string | null;
  }[];
  financialAccounts: (FinancialAccount & {
    transactions: (Transaction & {
      user: { id: string; name: string | null; color: string };
    })[];
  })[];
  boardNotes: (BoardNote & {
    author: { id: string; name: string | null; color: string };
  })[];
}

// Domyślna konfiguracja widżetów - uporządkowana według ważności i logicznego układu
// Grid 6-kolumnowy: small=2kol, medium=4kol, large=6kol
// Przykłady pełnych rzędów: 3x small, medium+small, large
const defaultWidgets: WidgetConfig[] = [
  // Rząd 1 - statystyki na całą szerokość (6 kol)
  { id: "main-stats", title: "Statystyki", visible: true, order: 0, size: "large" as WidgetSize },

  // Rząd 2 - zadania (3 kol) + rutyny (3 kol) = 6 kol
  { id: "main-tasks", title: "Zadania na dziś", visible: true, order: 1, size: "half" as WidgetSize },
  { id: "main-routines", title: "Rutyny na dziś", visible: true, order: 2, size: "half" as WidgetSize },

  // Rząd 3 - mini kalendarz (2 kol) + posiłki (4 kol) = 6 kol
  { id: "side-calendar", title: "Mini kalendarz", visible: true, order: 3, size: "small" as WidgetSize },
  { id: "main-meals", title: "Posiłki na dziś", visible: true, order: 4, size: "medium" as WidgetSize },

  // Rząd 4 - pogoda (2 kol) + zakupy (4 kol) = 6 kol
  { id: "side-weather", title: "Pogoda", visible: true, order: 5, size: "small" as WidgetSize },
  { id: "main-shopping", title: "Lista zakupów", visible: true, order: 6, size: "medium" as WidgetSize },

  // Rząd 5 - budżet (2 kol) + harmonogram (2 kol) + wydarzenia (2 kol) = 6 kol
  { id: "side-budget", title: "Budżet", visible: true, order: 7, size: "small" as WidgetSize },
  { id: "side-schedule", title: "Harmonogram", visible: true, order: 8, size: "small" as WidgetSize },
  { id: "side-events", title: "Wydarzenia", visible: true, order: 9, size: "small" as WidgetSize },

  // Rząd 6 - obecność (2 kol) + wyjazdy (2 kol) + powiadomienia (2 kol) = 6 kol
  { id: "side-presence", title: "Obecność", visible: true, order: 10, size: "small" as WidgetSize },
  { id: "side-trips", title: "Wyjazdy", visible: true, order: 11, size: "small" as WidgetSize },
  { id: "side-notifications", title: "Powiadomienia", visible: true, order: 12, size: "small" as WidgetSize },

  // Rząd 7 - urodziny + imieniny + rocznice (3x 2 kol = 6 kol)
  { id: "side-birthdays", title: "Nadchodzące urodziny", visible: true, order: 13, size: "small" as WidgetSize },
  { id: "side-namedays", title: "Nadchodzące imieniny", visible: true, order: 14, size: "small" as WidgetSize },
  { id: "side-anniversaries", title: "Nadchodzące rocznice", visible: true, order: 15, size: "small" as WidgetSize },

  // Rząd 8 - gamifikacja (2 kol) + konta finansowe (4 kol) = 6 kol
  { id: "side-gamification", title: "Gamifikacja", visible: true, order: 16, size: "small" as WidgetSize },
  { id: "side-financial-accounts", title: "Konta finansowe", visible: true, order: 17, size: "medium" as WidgetSize },

  // Rząd 9 - notatki z tablicy rodzinnej (4 kol)
  { id: "main-board-notes", title: "Tablica rodzinna", visible: true, order: 18, size: "medium" as WidgetSize },
];

export function DashboardClient({
  user,
  stats,
  todayTasks,
  todayRoutines,
  todayEvents,
  shoppingItems,
  members,
  todayMeals,
  upcomingTrips,
  notifications,
  schedules,
  transactions,
  userSettings,
  anniversaries,
  externalBirthdays,
  financialAccounts,
  boardNotes,
}: DashboardClientProps) {
  const [dashboardTasks, setDashboardTasks] = useState(todayTasks);
  const [dashboardRoutines, setDashboardRoutines] = useState(todayRoutines);

  // Stan widoku - domyślnie z ustawień użytkownika
  const [viewMode, setViewMode] = useState<"family" | "personal">(
    (userSettings?.defaultViewMode as "family" | "personal") || "family"
  );

  // Aktywny użytkownik - domyślnie z ustawień lub zalogowany
  const [activeUserId, setActiveUserId] = useState<string>(
    userSettings?.defaultActiveUserId || user.id
  );

  // Edycja układu widżetów
  const [isEditingLayout, setIsEditingLayout] = useState(false);

  // Konfiguracja widżetów - z ustawień lub domyślna
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (userSettings?.dashboardLayout) {
      try {
        const saved = userSettings.dashboardLayout as unknown as WidgetConfig[];
        if (Array.isArray(saved) && saved.length > 0) {
          // Połącz zapisane z domyślnymi (na wypadek nowych widżetów)
          const savedIds = new Set(saved.map(w => w.id));
          const newWidgets = defaultWidgets.filter(w => !savedIds.has(w.id));
          return [...saved, ...newWidgets];
        }
      } catch {
        // Ignore parsing errors
      }
    }
    return defaultWidgets;
  });

  // Znajdź aktywnego użytkownika
  const activeUser = useMemo(
    () =>
      members.find((m) => m.id === activeUserId) || {
        id: user.id,
        name: user.name || "Użytkownik",
        avatar: null,
        color: "#6366f1",
        presenceRecords: [],
      },
    [members, activeUserId, user.id, user.name]
  );

  // Greeting
  const currentHour = new Date().getHours();
  let greeting: string;
  if (currentHour < 6) greeting = "Dobrej nocy";
  else if (currentHour < 12) greeting = "Dzień dobry";
  else if (currentHour < 18) greeting = "Dobre popołudnie";
  else greeting = "Dobry wieczór";

  // Filtrowanie danych
  const filteredTasks = useMemo(
    () =>
      viewMode === "personal"
        ? dashboardTasks.filter((task) => task.assigneeId === activeUserId)
        : dashboardTasks,
    [viewMode, dashboardTasks, activeUserId]
  );

  const filteredRoutines = useMemo(
    () =>
      viewMode === "personal"
        ? dashboardRoutines.filter((routine) => routine.assigneeId === activeUserId)
        : dashboardRoutines,
    [viewMode, dashboardRoutines, activeUserId]
  );

  const toggleDashboardTask = useCallback(async (taskId: string, completed: boolean) => {
    const newStatus = completed ? TaskStatus.COMPLETED : TaskStatus.TODO;

    setDashboardTasks((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, status: newStatus } : task
    )));
    setDashboardRoutines((prev) => prev.map((task) => (
      task.id === taskId ? { ...task, status: newStatus } : task
    )));

    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error("Nie udało się zaktualizować zadania");
      }

      const updatedTask = await response.json();

      setDashboardTasks((prev) => prev.map((task) => (
        task.id === taskId ? { ...task, status: updatedTask.status } : task
      )));
      setDashboardRoutines((prev) => prev.map((task) => (
        task.id === taskId ? { ...task, status: updatedTask.status } : task
      )));
    } catch (error) {
      console.error("Error toggling dashboard task:", error);
      const rollbackStatus = completed ? TaskStatus.TODO : TaskStatus.COMPLETED;
      setDashboardTasks((prev) => prev.map((task) => (
        task.id === taskId ? { ...task, status: rollbackStatus } : task
      )));
      setDashboardRoutines((prev) => prev.map((task) => (
        task.id === taskId ? { ...task, status: rollbackStatus } : task
      )));
      toast.error("Nie udało się zaktualizować zadania");
    }
  }, []);

  const filteredEvents = useMemo(
    () =>
      viewMode === "personal"
        ? todayEvents.filter((event) => event.userId === activeUserId)
        : todayEvents,
    [viewMode, todayEvents, activeUserId]
  );

  const filteredMeals = useMemo(
    () =>
      viewMode === "personal"
        ? todayMeals.filter((m) => m.assigneeId === activeUserId || m.assigneeId === null)
        : todayMeals,
    [viewMode, todayMeals, activeUserId]
  );

  // Oblicz statystyki dla aktualnego widoku
  const displayStats = useMemo(
    () =>
      viewMode === "personal"
        ? {
            ...stats,
            todayTasksCount: filteredTasks.length,
            todayTasksCompleted: filteredTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
            weekEventsCount: filteredEvents.length,
          }
        : stats,
    [viewMode, stats, filteredTasks, filteredEvents]
  );

  const balance = displayStats.monthIncome - displayStats.monthExpenses;
  const homeMembers = members.filter((m) => m.presenceRecords[0]?.status === "HOME");

  // Oblicz nadchodzące urodziny (następne 30 dni) - członkowie + zewnętrzne
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 30);

    // Urodziny członków gospodarstwa
    const membersWithBirthdays = members
      .filter(m => m.birthDate)
      .map(m => ({
        id: m.id,
        name: m.name,
        email: m.email || '',
        color: m.color,
        avatar: m.avatar,
        birthDate: m.birthDate!
      }));

    const memberBirthdays = getUpcomingBirthdays(membersWithBirthdays, 30);

    // Zewnętrzne urodziny
    const externalBirthdaysList = externalBirthdays.map(eb => {
      const birthDate = new Date(eb.birthDate);
      const currentYear = today.getFullYear();
      let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());

      if (nextBirthday < today) {
        nextBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
      }

      const daysUntil = Math.floor((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const age = currentYear - birthDate.getFullYear() + (nextBirthday.getFullYear() > currentYear ? 1 : 0);

      if (daysUntil <= 30) {
        return {
          id: `external-${eb.id}`,
          userId: eb.id,
          name: eb.name,
          date: nextBirthday,
          age,
          color: eb.color,
          avatar: null,
          daysUntil,
          isExternal: true,
          relationship: eb.relationship,
        };
      }
      return null;
    }).filter((b): b is NonNullable<typeof b> => b !== null);

    // Połącz i posortuj według dni
    const allBirthdays = [
      ...memberBirthdays.map(b => ({
        ...b,
        daysUntil: Math.floor((b.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      })),
      ...externalBirthdaysList
    ];

    return allBirthdays
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5); // Maksymalnie 5
  }, [members, externalBirthdays]);

  // Oblicz nadchodzące imieniny (następne 30 dni)
  const upcomingNameDays = useMemo(() => {
    const nameDays: Array<{
      userId: string;
      name: string;
      date: Date;
      color: string;
      avatar: string | null;
      daysUntil: number;
    }> = [];
    const today = new Date();

    members.forEach(member => {
      if (!member.nameDay) return;

      const memberNameDays = getUpcomingNameDays(member.nameDay, 30);
      memberNameDays.forEach(date => {
        const daysUntil = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        nameDays.push({
          userId: member.id,
          name: member.name || member.nameDay || 'Użytkownik',
          date,
          color: member.color,
          avatar: member.avatar,
          daysUntil
        });
      });
    });

    return nameDays.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  }, [members]);

  // Oblicz nadchodzące rocznice (następne 30 dni)
  const upcomingAnniversariesData = useMemo(() => {
    const upcoming = getUpcomingAnniversaries(anniversaries, 30);
    const today = new Date();

    return upcoming.map(a => ({
      ...a,
      daysUntil: Math.floor((a.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    })).slice(0, 5);
  }, [anniversaries]);

  // Zapisz preferencje widoku
  const saveViewPreferences = useCallback(
    async (newViewMode: "family" | "personal", newActiveUserId?: string) => {
      try {
        await fetch("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultViewMode: newViewMode,
            ...(newActiveUserId && { defaultActiveUserId: newActiveUserId }),
          }),
        });
      } catch (error) {
        console.error("Failed to save view preferences:", error);
      }
    },
    []
  );

  // Zapisz układ widżetów
  const saveWidgetLayout = useCallback(
    async (newWidgets: WidgetConfig[]) => {
      try {
        await fetch("/api/user/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dashboardLayout: newWidgets,
          }),
        });
        toast.success("Układ widżetów zapisany");
      } catch (error) {
        console.error("Failed to save widget layout:", error);
        toast.error("Nie udało się zapisać układu");
      }
    },
    []
  );

  // Handler zmiany widoku
  const handleViewModeChange = useCallback(
    (mode: "family" | "personal") => {
      setViewMode(mode);
      saveViewPreferences(mode);
    },
    [saveViewPreferences]
  );

  // Handler zmiany użytkownika
  const handleUserChange = useCallback(
    (userId: string) => {
      setActiveUserId(userId);
      // Nie zapisuj domyślnie - tylko przez ustawienia trybu kiosk
    },
    []
  );

  // Handler ustawienia domyślnego użytkownika kiosk
  const handleSetDefaultUser = useCallback(
    (userId: string) => {
      saveViewPreferences(viewMode, userId);
    },
    [saveViewPreferences, viewMode]
  );

  // Handler zmiany układu widżetów
  const handleLayoutChange = useCallback(
    (newWidgets: WidgetConfig[]) => {
      setWidgets(newWidgets);
      saveWidgetLayout(newWidgets);
    },
    [saveWidgetLayout]
  );

  // Render pojedynczego widżetu
  const renderWidget = useCallback(
    (widgetId: string) => {
      switch (widgetId) {
        case "main-stats":
          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Zadania na dziś</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.todayTasksCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {displayStats.todayTasksCompleted} ukończonych
                  </p>
                  {displayStats.todayTasksCount > 0 && (
                    <Progress
                      value={(displayStats.todayTasksCompleted / displayStats.todayTasksCount) * 100}
                      className="mt-2 h-1"
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wydarzenia</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.weekEventsCount}</div>
                  <p className="text-xs text-muted-foreground">dzisiaj</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lista zakupów</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{displayStats.shoppingCount}</div>
                  <p className="text-xs text-muted-foreground">
                    {displayStats.shoppingUrgent > 0 && (
                      <span className="text-red-500">{displayStats.shoppingUrgent} pilnych</span>
                    )}
                    {displayStats.shoppingUrgent === 0 && "produktów do kupienia"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bilans miesiąca</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", balance >= 0 ? "text-green-600" : "text-red-600")}>
                    {balance >= 0 ? "+" : ""}{balance.toFixed(0)} zł
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stats.monthIncome.toFixed(0)}
                    </span>
                    <span className="flex items-center text-red-600">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {stats.monthExpenses.toFixed(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          );

        case "main-tasks":
          const nonRoutineTasks = filteredTasks.filter(t => !t.isRecurring);
          const nonRoutineCompleted = nonRoutineTasks.filter(t => t.status === TaskStatus.COMPLETED).length;

          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">
                    {viewMode === "personal" ? "Moje zadania na dziś" : "Zadania na dziś"}
                  </CardTitle>
                  <CardDescription>
                    {nonRoutineCompleted}/{nonRoutineTasks.length} ukończonych
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tasks">
                    Zobacz wszystkie
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {nonRoutineTasks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{viewMode === "personal" ? "Brak Twoich zadań na dziś" : "Brak zadań na dziś"}</p>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/tasks">Dodaj zadanie</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nonRoutineTasks.slice(0, 6).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50"
                      >
                        <Checkbox
                          checked={task.status === TaskStatus.COMPLETED}
                          onCheckedChange={(checked) => {
                            void toggleDashboardTask(task.id, !!checked);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            task.status === TaskStatus.COMPLETED && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              {task.dueTime || "Cały dzień"}
                            </p>
                          )}
                        </div>
                        {task.assignee && viewMode === "family" && (
                          <Avatar className="h-6 w-6">
                            <AvatarFallback
                              style={{ backgroundColor: task.assignee.color }}
                              className="text-white text-xs"
                            >
                              {task.assignee.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );

        case "main-routines":
          // Funkcja sprawdzająca czy rutyna powinna być dzisiaj
          const isRoutineForToday = (task: TaskWithAssignee) => {
            if (!task.isRecurring) return false;

            // Jeśli rutyna ma dueDate, sprawdź czy to dzisiaj
            if (task.dueDate) {
              const today = new Date();
              const taskDate = new Date(task.dueDate);
              const isSameDate =
                today.getFullYear() === taskDate.getFullYear() &&
                today.getMonth() === taskDate.getMonth() &&
                today.getDate() === taskDate.getDate();

              if (!isSameDate) return false; // Rutyna z inną datą - ukryj
            }

            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Niedziela, 1=Poniedziałek, ..., 6=Sobota

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
              const dayOfMonth = today.getDate();
              return task.recurrenceDays.includes(dayOfMonth);
            }

            // Dla YEARLY i innych - zawsze pokazuj
            return true;
          };

          const routinesForTodayRaw = filteredRoutines.filter((routine) => isRoutineForToday(routine));
          const routinesByParent = new Map<string, TaskWithAssignee>();

          for (const routine of routinesForTodayRaw) {
            const key = routine.parentTaskId || routine.id;
            const existing = routinesByParent.get(key);

            if (!existing) {
              routinesByParent.set(key, routine);
              continue;
            }

            const existingIsInstance = Boolean(existing.parentTaskId);
            const currentIsInstance = Boolean(routine.parentTaskId);
            if (!existingIsInstance && currentIsInstance) {
              routinesByParent.set(key, routine);
            }
          }

          const routinesForToday = Array.from(routinesByParent.values());
          const routinesCompleted = routinesForToday.filter((r) => r.status === TaskStatus.COMPLETED).length;

          // Funkcja do sprawdzania czy rutyna jest spóźniona (>3h od zaplanowanej godziny)
          const isRoutineOverdue = (routine: TaskWithAssignee) => {
            if (!routine.dueTime || routine.status === TaskStatus.COMPLETED) return false;

            const now = new Date();
            const [hours, minutes] = routine.dueTime.split(':').map(Number);
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);

            const diffInHours = (now.getTime() - scheduledTime.getTime()) / (1000 * 60 * 60);
            return diffInHours > 3;
          };

          // Funkcja do obsługi kliknięcia checkbox
          const handleToggleRoutine = async (routineId: string, completed: boolean) => {
            await toggleDashboardTask(routineId, completed);
          };

          // Grupowanie rutyn według pory dnia
          const getTimeOfDay = (time: string | null): string => {
            if (!time) return "notime";
            const [hours] = time.split(':').map(Number);
            if (hours >= 5 && hours < 12) return "morning";
            if (hours >= 12 && hours < 17) return "afternoon";
            if (hours >= 17 && hours < 23) return "evening";
            return "night";
          };

          const routinesByTime = {
            morning: routinesForToday.filter(r => getTimeOfDay(r.dueTime) === "morning"),
            afternoon: routinesForToday.filter(r => getTimeOfDay(r.dueTime) === "afternoon"),
            evening: routinesForToday.filter(r => getTimeOfDay(r.dueTime) === "evening"),
            night: routinesForToday.filter(r => getTimeOfDay(r.dueTime) === "night"),
            notime: routinesForToday.filter(r => getTimeOfDay(r.dueTime) === "notime"),
          };

          const timeGroups = [
            { key: "morning", label: "🌅 Poranne", routines: routinesByTime.morning },
            { key: "afternoon", label: "☀️ Popołudniowe", routines: routinesByTime.afternoon },
            { key: "evening", label: "🌆 Wieczorne", routines: routinesByTime.evening },
            { key: "night", label: "🌙 Nocne", routines: routinesByTime.night },
            { key: "notime", label: "⏰ Bez godziny", routines: routinesByTime.notime },
          ].filter(group => group.routines.length > 0);

          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    {viewMode === "personal" ? "Moje rutyny na dziś" : "Rutyny na dziś"}
                  </CardTitle>
                  <CardDescription>
                    {routinesCompleted}/{routinesForToday.length} ukończonych
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/tasks/routines">
                    Zobacz wszystkie
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {routinesForToday.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Repeat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>{viewMode === "personal" ? "Brak Twoich rutyn na dziś" : "Brak rutyn na dziś"}</p>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/tasks/routines">Dodaj rutynę</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {timeGroups.map((group) => (
                      <div key={group.key} className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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
                                    "flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors",
                                    isOverdue && "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                                  )}
                                >
                                  <Checkbox
                                    checked={routine.status === TaskStatus.COMPLETED}
                                    onCheckedChange={(checked) => handleToggleRoutine(routine.id, !!checked)}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className={cn(
                                      "text-sm font-medium truncate",
                                      routine.status === TaskStatus.COMPLETED && "line-through text-muted-foreground"
                                    )}>
                                      {routine.title}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {routine.dueTime && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {routine.dueTime}
                                        </p>
                                      )}
                                      {isOverdue && (
                                        <Badge variant="destructive" className="h-4 text-[10px] px-1">
                                          Spóźniona
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {routine.assignee && viewMode === "family" && (
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback
                                        style={{ backgroundColor: routine.assignee.color }}
                                        className="text-white text-xs"
                                      >
                                        {routine.assignee.name?.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );

        case "main-meals":
          return (
            <MealsWidget
              meals={filteredMeals}
              viewMode={viewMode}
              activeUserId={activeUserId}
              userName={activeUser.name || undefined}
            />
          );

        case "main-shopping":
          return (
            <ShoppingWidget
              items={shoppingItems}
              totalCount={stats.shoppingCount}
            />
          );

        case "side-weather":
          return <WeatherWidget />;

        case "side-calendar":
          return (
            <MiniCalendarWidget
              events={[
                ...todayEvents.map((e) => ({
                  date: new Date(e.startDate),
                  count: 1,
                  color: e.color || undefined,
                })),
                ...todayTasks
                  .filter((t) => t.dueDate)
                  .map((t) => ({
                    date: new Date(t.dueDate!),
                    count: 1,
                    color: "hsl(var(--primary))",
                  })),
              ]}
            />
          );

        case "side-schedule":
          return (
            <ScheduleWidget
              schedules={schedules}
              viewMode={viewMode}
              activeUserId={activeUserId}
            />
          );

        case "side-budget":
          return (
            <BudgetWidget
              transactions={transactions}
              viewMode={viewMode}
              activeUserId={activeUserId}
              userName={activeUser.name || undefined}
            />
          );

        case "side-presence":
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kto jest w domu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => {
                    const isHome = member.presenceRecords[0]?.status === "HOME";
                    return (
                      <div key={member.id} className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.avatar || undefined} />
                            <AvatarFallback
                              style={{ backgroundColor: member.color }}
                              className="text-white text-xs"
                            >
                              {member.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                              isHome ? "bg-green-500" : "bg-gray-400"
                            )}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {isHome ? (
                              <>
                                <Home className="h-3 w-3" /> W domu
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3 w-3" /> Poza domem
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    {homeMembers.length} z {members.length} w domu
                  </p>
                </div>
              </CardContent>
            </Card>
          );

        case "side-trips":
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  Nadchodzące wyjazdy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingTrips.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Brak zaplanowanych wyjazdów</p>
                    <Button variant="link" size="sm" asChild>
                      <Link href="/trips">Zaplanuj wyjazd</Link>
                    </Button>
                  </div>
                ) : (
                  upcomingTrips.map((trip) => {
                    const daysUntil = differenceInDays(new Date(trip.startDate), new Date());
                    return (
                      <Link
                        key={trip.id}
                        href="/trips"
                        className="block p-3 rounded-lg bg-accent/30 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{trip.name}</p>
                          <Badge variant="secondary">
                            {daysUntil === 0 ? "Dziś!" : `za ${daysUntil} dni`}
                          </Badge>
                        </div>
                        {trip.destination && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {trip.destination}
                          </p>
                        )}
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );

        case "side-events":
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dzisiejsze wydarzenia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Brak wydarzeń na dziś
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-accent/30"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(event.startDate), "HH:mm")}
                            {event.endDate && ` - ${format(new Date(event.endDate), "HH:mm")}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <Link href="/calendar">
                    Zobacz kalendarz
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );

        case "side-notifications":
          return (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Powiadomienia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Brak nowych powiadomień</p>
                  </div>
                ) : (
                  <>
                    {notifications.slice(0, 3).map((notif) => (
                      <div
                        key={notif.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-primary/5"
                      >
                        <AlertCircle className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {notif.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href="/notifications">
                        Zobacz wszystkie ({notifications.length})
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          );

        case "side-birthdays":
          return <UpcomingBirthdaysWidget birthdays={upcomingBirthdays} />;

        case "side-namedays":
          return <UpcomingNameDaysWidget nameDays={upcomingNameDays} />;

        case "side-anniversaries":
          return <UpcomingAnniversariesWidget anniversaries={upcomingAnniversariesData} />;

        case "side-financial-accounts":
          return <FinancialAccountsWidget accounts={financialAccounts} />;

        case "side-gamification":
          return <GamificationWidget userId={user.id} />;

        case "main-board-notes":
          const pinnedNotes = boardNotes.filter(n => n.isPinned).slice(0, 3);
          const recentNotes = boardNotes.filter(n => !n.isPinned).slice(0, 3);
          const displayNotes = [...pinnedNotes, ...recentNotes].slice(0, 5);

          return (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>📌 Tablica rodzinna</CardTitle>
                  <CardDescription>Notatki i rysunki</CardDescription>
                </div>
                <Link href="/board">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {displayNotes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Brak notatek</p>
                    <Link href="/board">
                      <Button variant="link" size="sm" className="mt-2">
                        Dodaj pierwszą notatkę
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayNotes.map((note) => (
                      <Link key={note.id} href="/board">
                        <Card
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          style={{ backgroundColor: note.color }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback style={{ backgroundColor: note.author.color }}>
                                  {(note.author.name || "?").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-medium">{note.author.name}</span>
                                  {note.isPinned && <span className="text-xs">📌</span>}
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(note.createdAt), "d MMM, HH:mm", { locale: pl })}
                                  </span>
                                </div>
                                {note.content && (
                                  <p className="text-sm line-clamp-2">{note.content}</p>
                                )}
                                {note.drawing && !note.content && (
                                  <p className="text-xs text-muted-foreground italic">🎨 Zawiera rysunek</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                    {boardNotes.length > 5 && (
                      <Link href="/board">
                        <Button variant="outline" className="w-full" size="sm">
                          Zobacz wszystkie ({boardNotes.length})
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );

        default:
          return null;
      }
    },
    [
      displayStats,
      filteredTasks,
      filteredRoutines,
      filteredEvents,
      filteredMeals,
      viewMode,
      activeUserId,
      activeUser,
      shoppingItems,
      todayEvents,
      todayTasks,
      schedules,
      transactions,
      members,
      homeMembers,
      upcomingTrips,
      notifications,
      stats,
      balance,
      upcomingBirthdays,
      upcomingNameDays,
      upcomingAnniversariesData,
      financialAccounts,
      boardNotes,
      user.id,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* User Switcher - Tryb kiosk */}
          {members.length > 0 && (
            <UserSwitcher
              currentUserId={user.id}
              activeUserId={activeUserId}
              users={members.map((m) => ({
                id: m.id,
                name: m.name,
                avatar: m.avatar,
                color: m.color,
                role: m.role,
              }))}
              onUserChange={handleUserChange}
              onSetDefault={handleSetDefaultUser}
              defaultUserId={userSettings?.defaultActiveUserId}
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {greeting}, {activeUser.name?.split(" ")[0] || "Użytkowniku"}! 👋
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(), "EEEE, d MMMM yyyy", { locale: pl })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Przełącznik widoku */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "family" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => handleViewModeChange("family")}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Rodzina</span>
            </Button>
            <Button
              variant={viewMode === "personal" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1"
              onClick={() => handleViewModeChange("personal")}
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Mój widok</span>
            </Button>
          </div>
          {displayStats.unreadNotifications > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/notifications">
                <Bell className="mr-2 h-4 w-4" />
                {displayStats.unreadNotifications} nowych
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href="/tasks">
              <Plus className="mr-2 h-4 w-4" />
              Nowe zadanie
            </Link>
          </Button>
        </div>
      </div>

      {/* Widgets Grid with Drag & Drop */}
      <DashboardWidgets
        widgets={widgets}
        onLayoutChange={handleLayoutChange}
        renderWidget={renderWidget}
        isEditing={isEditingLayout}
        onEditingChange={setIsEditingLayout}
      />
    </div>
  );
}

