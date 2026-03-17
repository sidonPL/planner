// Funkcje do obsługi zadań cyklicznych

import { prisma } from "@/lib/prisma";
import { RecurrenceType } from "@prisma/client";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  setDay,
  getDay,
  startOfDay,
  isAfter,
} from "date-fns";

interface RecurringTaskData {
  id: string;
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: Date | null;
  dueTime: string | null;
  isRecurring: boolean;
  recurrenceType: RecurrenceType | null;
  recurrenceInterval: number | null;
  recurrenceEndDate: Date | null;
  recurrenceDays: number[];
  reminderMinutes: number[];
  householdId: string;
  categoryId: string | null;
  assigneeId: string | null;
  creatorId: string;
  parentTaskId: string | null;
}

/**
 * Oblicza następną datę dla zadania cyklicznego
 */
export function calculateNextOccurrence(
  currentDate: Date,
  recurrenceType: RecurrenceType,
  interval: number,
  recurrenceDays?: number[]
): Date {
  const baseDate = startOfDay(currentDate);

  switch (recurrenceType) {
    case "DAILY":
      return addDays(baseDate, interval);

    case "WEEKLY":
      if (recurrenceDays && recurrenceDays.length > 0) {
        // Znajdź następny dzień tygodnia z listy
        const currentDayOfWeek = getDay(baseDate);
        const sortedDays = [...recurrenceDays].sort((a, b) => a - b);

        // Szukaj następnego dnia w tym samym tygodniu
        const nextDayThisWeek = sortedDays.find(day => day > currentDayOfWeek);

        if (nextDayThisWeek !== undefined) {
          return setDay(baseDate, nextDayThisWeek);
        }

        // Jeśli nie ma, przejdź do pierwszego dnia w następnym tygodniu/tygodniach
        const nextWeek = addWeeks(baseDate, interval);
        return setDay(nextWeek, sortedDays[0], { weekStartsOn: 0 });
      }
      return addWeeks(baseDate, interval);

    case "MONTHLY":
      return addMonths(baseDate, interval);

    case "YEARLY":
      return addYears(baseDate, interval);

    case "CUSTOM":
      // Custom domyślnie działa jak daily
      return addDays(baseDate, interval);

    default:
      return addDays(baseDate, 1);
  }
}

/**
 * Sprawdza czy należy wygenerować kolejne wystąpienie zadania
 */
export function shouldGenerateNextOccurrence(task: RecurringTaskData): boolean {
  if (!task.isRecurring || !task.recurrenceType) {
    return false;
  }

  // Sprawdź czy data końcowa nie została przekroczona
  if (task.recurrenceEndDate && task.dueDate) {
    const nextDate = calculateNextOccurrence(
      task.dueDate,
      task.recurrenceType,
      task.recurrenceInterval || 1,
      task.recurrenceDays
    );

    if (isAfter(nextDate, task.recurrenceEndDate)) {
      return false;
    }
  }

  return true;
}

/**
 * Generuje kolejne wystąpienie zadania cyklicznego
 */
export async function generateNextTaskOccurrence(
  completedTask: RecurringTaskData
): Promise<{ id: string } | null> {
  if (!shouldGenerateNextOccurrence(completedTask)) {
    return null;
  }

  if (!completedTask.dueDate || !completedTask.recurrenceType) {
    return null;
  }

  const nextDueDate = calculateNextOccurrence(
    completedTask.dueDate,
    completedTask.recurrenceType,
    completedTask.recurrenceInterval || 1,
    completedTask.recurrenceDays
  );

  // Sprawdź czy nie przekroczyliśmy daty końcowej
  if (completedTask.recurrenceEndDate && isAfter(nextDueDate, completedTask.recurrenceEndDate)) {
    return null;
  }

  // Utwórz nowe zadanie
  const newTask = await prisma.task.create({
    data: {
      title: completedTask.title,
      description: completedTask.description,
      priority: completedTask.priority,
      dueDate: nextDueDate,
      dueTime: completedTask.dueTime,
      isRecurring: true,
      recurrenceType: completedTask.recurrenceType,
      recurrenceInterval: completedTask.recurrenceInterval,
      recurrenceEndDate: completedTask.recurrenceEndDate,
      recurrenceDays: completedTask.recurrenceDays,
      reminderMinutes: completedTask.reminderMinutes,
      householdId: completedTask.householdId,
      categoryId: completedTask.categoryId,
      assigneeId: completedTask.assigneeId,
      creatorId: completedTask.creatorId,
      // Powiąż z oryginalnym zadaniem (rodzicem) lub zachowaj tego samego rodzica
      parentTaskId: completedTask.parentTaskId || completedTask.id,
    },
    select: {
      id: true,
    },
  });

  return newTask;
}

/**
 * Pobiera wszystkie wystąpienia zadania cyklicznego
 */
export async function getTaskOccurrences(taskId: string) {
  // Znajdź zadanie nadrzędne
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, parentTaskId: true },
  });

  if (!task) {
    return [];
  }

  const parentId = task.parentTaskId || task.id;

  // Pobierz wszystkie wystąpienia
  const occurrences = await prisma.task.findMany({
    where: {
      OR: [
        { id: parentId },
        { parentTaskId: parentId },
      ],
    },
    orderBy: {
      dueDate: "asc",
    },
    include: {
      completions: {
        orderBy: {
          completedAt: "desc",
        },
        take: 1,
      },
    },
  });

  return occurrences;
}

/**
 * Aktualizuje wszystkie przyszłe wystąpienia zadania cyklicznego
 */
export async function updateFutureOccurrences(
  taskId: string,
  updates: {
    title?: string;
    description?: string | null;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueTime?: string | null;
    categoryId?: string | null;
    assigneeId?: string | null;
    reminderMinutes?: number[];
  }
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, parentTaskId: true },
  });

  if (!task) {
    return 0;
  }

  const parentId = task.parentTaskId || task.id;
  const today = startOfDay(new Date());

  // Aktualizuj wszystkie przyszłe wystąpienia (status = TODO i data >= dziś)
  const result = await prisma.task.updateMany({
    where: {
      OR: [
        { id: parentId },
        { parentTaskId: parentId },
      ],
      status: "TODO",
      dueDate: {
        gte: today,
      },
    },
    data: updates,
  });

  return result.count;
}

/**
 * Usuwa wszystkie przyszłe wystąpienia zadania cyklicznego
 */
export async function deleteFutureOccurrences(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, parentTaskId: true },
  });

  if (!task) {
    return 0;
  }

  const parentId = task.parentTaskId || task.id;
  const today = startOfDay(new Date());

  // Usuń wszystkie przyszłe wystąpienia (status = TODO i data >= dziś)
  const result = await prisma.task.deleteMany({
    where: {
      OR: [
        { id: parentId },
        { parentTaskId: parentId },
      ],
      status: "TODO",
      dueDate: {
        gte: today,
      },
    },
  });

  return result.count;
}

/**
 * Zatrzymuje cykliczność zadania (nie generuje więcej wystąpień)
 */
export async function stopRecurrence(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, parentTaskId: true },
  });

  if (!task) {
    return;
  }

  const parentId = task.parentTaskId || task.id;

  // Zaktualizuj zadanie główne, ustawiając datę końcową na dziś
  await prisma.task.update({
    where: { id: parentId },
    data: {
      recurrenceEndDate: new Date(),
    },
  });

  // Usuń przyszłe niezakończone wystąpienia
  await deleteFutureOccurrences(taskId);
}

/**
 * Generuje instancje rutyny na miesiąc do przodu
 */
export async function generateRoutineInstances(routineTask: RecurringTaskData) {
  if (!routineTask.isRecurring || !routineTask.recurrenceType) {
    return [];
  }

  const today = startOfDay(new Date());
  const oneMonthAhead = addMonths(today, 1);
  const instances: { id: string; dueDate: Date }[] = [];

  // Znajdź prawdziwy parentId (jeśli routineTask jest już instancją)
  const parentId = routineTask.parentTaskId || routineTask.id;

  // Znajdź istniejące przyszłe instancje (włącznie z wykonanymi)
  const existingInstances = await prisma.task.findMany({
    where: {
      OR: [
        { id: parentId },
        { parentTaskId: parentId },
      ],
      dueDate: {
        gte: today,
        lte: oneMonthAhead,
      },
    },
    select: {
      id: true,
      dueDate: true,
    },
  });

  const existingDates = new Set(
    existingInstances.map(i => i.dueDate ? startOfDay(i.dueDate).toISOString() : '')
  );

  // Generuj daty dla kolejnych wystąpień
  // Zacznij od daty zadania lub od dzisiaj
  const startDate = routineTask.dueDate ? startOfDay(routineTask.dueDate) : today;
  let currentDate = startDate;

  console.log('[generateRoutineInstances] Start:', {
    startDate: startDate.toISOString(),
    recurrenceType: routineTask.recurrenceType,
    recurrenceInterval: routineTask.recurrenceInterval,
    recurrenceDays: routineTask.recurrenceDays,
    existingDatesCount: existingDates.size
  });

  while (currentDate <= oneMonthAhead) {
    const dateKey = startOfDay(currentDate).toISOString();

    // Sprawdź czy data końcowa nie została przekroczona
    if (routineTask.recurrenceEndDate && currentDate > routineTask.recurrenceEndDate) {
      break;
    }

    // Sprawdź czy instancja już istnieje (pierwsze zadanie już istnieje jako parent)
    if (!existingDates.has(dateKey)) {
      console.log('[generateRoutineInstances] Creating instance for:', dateKey);
      // Utwórz nową instancję
      const newInstance = await prisma.task.create({
        data: {
          title: routineTask.title,
          description: routineTask.description,
          priority: routineTask.priority,
          dueDate: currentDate,
          dueTime: routineTask.dueTime,
          isRecurring: true,
          recurrenceType: routineTask.recurrenceType,
          recurrenceInterval: routineTask.recurrenceInterval,
          recurrenceEndDate: routineTask.recurrenceEndDate,
          recurrenceDays: routineTask.recurrenceDays,
          reminderMinutes: routineTask.reminderMinutes,
          householdId: routineTask.householdId,
          categoryId: routineTask.categoryId,
          assigneeId: routineTask.assigneeId,
          creatorId: routineTask.creatorId,
          parentTaskId: parentId,
          status: "TODO",
        },
        select: {
          id: true,
          dueDate: true,
        },
      });

      instances.push({
        id: newInstance.id,
        dueDate: newInstance.dueDate || currentDate,
      });
    }

    // Oblicz następną datę
    const nextDate = calculateNextOccurrence(
      currentDate,
      routineTask.recurrenceType,
      routineTask.recurrenceInterval || 1,
      routineTask.recurrenceDays
    );

    console.log('[generateRoutineInstances] Next date:', {
      from: currentDate.toISOString(),
      to: nextDate.toISOString()
    });

    currentDate = nextDate;
  }

  console.log('[generateRoutineInstances] Created', instances.length, 'instances');

  return instances;
}

/**
 * Usuwa i regeneruje przyszłe instancje rutyny (używane przy edycji)
 */
export async function regenerateRoutineInstances(taskId: string) {
  // Pobierz dane rutyny
  const routine = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      dueDate: true,
      dueTime: true,
      isRecurring: true,
      recurrenceType: true,
      recurrenceInterval: true,
      recurrenceEndDate: true,
      recurrenceDays: true,
      reminderMinutes: true,
      householdId: true,
      categoryId: true,
      assigneeId: true,
      creatorId: true,
      parentTaskId: true,
    },
  });

  if (!routine || !routine.isRecurring) {
    return [];
  }

  // Usuń przyszłe instancje
  await deleteFutureOccurrences(taskId);

  // Wygeneruj nowe instancje
  return await generateRoutineInstances(routine as RecurringTaskData);
}

