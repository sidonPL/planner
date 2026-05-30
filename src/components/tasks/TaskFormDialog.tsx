"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Loader2, X, Plus, Clock } from "lucide-react";
import { TaskReminderField } from "@/components/tasks/TaskReminderField";
import { sanitizePlainText, sanitizeRichHTML } from "@/lib/sanitize";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import type { Task, Category } from "@prisma/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const taskFormSchema = z.object({
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  categoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.date().optional(),
  dueTime: z.string().optional(),
  isRecurring: z.boolean(),
  recurrenceType: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY", "CUSTOM"]).optional(),
  recurrenceInterval: z.number().min(1).optional(),
  recurrenceTimes: z.array(z.string()).optional(), // Wielokrotne godziny dziennie
  reminderMinutes: z.array(z.number().int().nonnegative()).optional(),
  updateFuture: z.boolean().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

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
};

type Member = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
};

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskWithRelations | null;
  categories: Category[];
  members: Member[];
  onTaskCreated: (task: TaskWithRelations) => void;
  onTaskUpdated: (task: TaskWithRelations) => void;
  defaultIsRecurring?: boolean;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  categories,
  members,
  onTaskCreated,
  onTaskUpdated,
  defaultIsRecurring = false,
}: TaskFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtasks, setSubtasks] = useState<Array<{ title: string; assigneeId?: string }>>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const isEditing = !!task;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM",
      categoryId: undefined,
      assigneeId: undefined,
      dueDate: undefined,
      dueTime: undefined,
      isRecurring: false,
      recurrenceType: undefined,
      recurrenceInterval: 1,
      recurrenceTimes: [],
      reminderMinutes: [],
      updateFuture: false,
    },
  });

  // Reset form when task changes (for edit mode)
  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "MEDIUM",
        categoryId: task.categoryId || undefined,
        assigneeId: task.assigneeId || undefined,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        dueTime: task.dueTime || undefined,
        isRecurring: task.isRecurring || false,
        recurrenceType: (task.recurrenceType ?? undefined) as "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "CUSTOM" | undefined,
        recurrenceInterval: task.recurrenceInterval || 1,
        recurrenceTimes: (task as Task & { recurrenceTimes?: string[] }).recurrenceTimes || [],
        reminderMinutes: Array.isArray(task.reminderMinutes) ? task.reminderMinutes : [],
        updateFuture: false,
      });
      setSubtasks([]);
    } else {
      form.reset({
        title: "",
        description: "",
        priority: "MEDIUM",
        categoryId: undefined,
        assigneeId: undefined,
        dueDate: undefined,
        dueTime: undefined,
        isRecurring: defaultIsRecurring,
        recurrenceType: defaultIsRecurring ? "DAILY" : undefined,
        recurrenceInterval: 1,
        recurrenceTimes: [],
        reminderMinutes: [],
        updateFuture: false,
      });
      setSubtasks([]);
    }
  }, [task, form, defaultIsRecurring]);

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      setSubtasks([...subtasks, { title: newSubtaskTitle.trim() }]);
      setNewSubtaskTitle("");
    }
  };

  const handleRemoveSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const isRecurring = form.watch("isRecurring");
  const showRecurrenceEditOption = isEditing && task?.isRecurring;

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = isEditing ? "PUT" : "POST";

      // SECURITY: Sanityzacja user inputs
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          title: sanitizePlainText(data.title),
          description: sanitizeRichHTML(data.description),
          dueDate: data.dueDate?.toISOString(),
          updateFuture: data.updateFuture,
          subtasks: !isEditing ? subtasks.map(st => ({
            title: sanitizePlainText(st.title),
            assigneeId: st.assigneeId || null,
          })) : undefined,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const apiMessage = errorBody?.error || errorBody?.message;
        throw new Error(apiMessage || `Nie udało się zapisać zadania (${response.status})`);
      }

      const savedTask = await response.json();

      // Jeśli są podzadania, utwórz je przez API
      if (!isEditing && subtasks.length > 0) {
        const subtaskPromises = subtasks.map((subtask) =>
          fetch(`/api/tasks/${savedTask.id}/subtasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: subtask.title,
              assigneeId: subtask.assigneeId || null,
            }),
          })
        );

        await Promise.all(subtaskPromises);
      }

      // Zamknij dialog
      onOpenChange(false);

      // Wywołaj callbacki
      if (isEditing) {
        onTaskUpdated(savedTask);
      } else {
        onTaskCreated(savedTask);
      }

      // Reset formularza
      form.reset();
      setSubtasks([]);
      setNewSubtaskTitle("");

      toast.success(isEditing ? "Zapisano zmiany zadania" : "Dodano zadanie");
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(
        error instanceof Error ? error.message : "Nie udało się zapisać zadania"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onInvalid = () => {
    toast.error("Nie można zapisać formularza. Sprawdź wymagane pola.");
  };

  const handleSaveClick = form.handleSubmit(onSubmit, onInvalid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col min-h-0">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj zadanie" : "Nowe zadanie"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveClick();
            }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 min-h-0">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Posprzątać kuchnię" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe szczegóły..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority & Category */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorytet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">🟢 Niski</SelectItem>
                        <SelectItem value="MEDIUM">🔵 Średni</SelectItem>
                        <SelectItem value="HIGH">🟠 Wysoki</SelectItem>
                        <SelectItem value="URGENT">🔴 Pilny</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Due Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Termin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "d MMM yyyy", { locale: pl })
                            ) : (
                              <span>Wybierz datę</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={pl}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Godzina</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)}
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz godzinę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="none">Bez godziny</SelectItem>
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <React.Fragment key={hour}>
                            <SelectItem value={`${String(hour).padStart(2, '0')}:00`}>
                              {String(hour).padStart(2, '0')}:00
                            </SelectItem>
                            <SelectItem value={`${String(hour).padStart(2, '0')}:30`}>
                              {String(hour).padStart(2, '0')}:30
                            </SelectItem>
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reminderMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <TaskReminderField
                      value={field.value || []}
                      onChange={field.onChange}
                      description={
                        isRecurring
                          ? "Przypomnienia działają dla każdej instancji rutyny (wymagana data lub godzina)."
                          : "Powiadomienie push/e-mail przed terminem zadania (wymagana data lub godzina)."
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee */}
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Przypisz do</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz osobę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-6 w-6 rounded-full flex items-center justify-center text-xs text-white"
                              style={{ backgroundColor: member.color }}
                            >
                              {member.name?.charAt(0).toUpperCase() || "U"}
                            </span>
                            {member.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Recurring */}
            <FormField
              control={form.control}
              name="isRecurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Zadanie cykliczne</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Powtarzaj to zadanie regularnie
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Recurrence Options */}
            {isRecurring && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Co ile</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jednostka</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Wybierz" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DAILY">
                              {form.watch("recurrenceInterval") === 1 ? "dzień" : "dni"}
                            </SelectItem>
                            <SelectItem value="WEEKLY">
                              {form.watch("recurrenceInterval") === 1 ? "tydzień" : "tygodni"}
                            </SelectItem>
                            <SelectItem value="MONTHLY">
                              {form.watch("recurrenceInterval") === 1 ? "miesiąc" : "miesięcy"}
                            </SelectItem>
                            <SelectItem value="YEARLY">
                              {form.watch("recurrenceInterval") === 1 ? "rok" : "lat"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Podgląd częstotliwości */}
                {form.watch("recurrenceType") && (
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    ℹ️ Zadanie będzie powtarzane co{" "}
                    {form.watch("recurrenceInterval") || 1}{" "}
                    {form.watch("recurrenceType") === "DAILY" && (form.watch("recurrenceInterval") === 1 ? "dzień" : "dni")}
                    {form.watch("recurrenceType") === "WEEKLY" && (form.watch("recurrenceInterval") === 1 ? "tydzień" : "tygodni")}
                    {form.watch("recurrenceType") === "MONTHLY" && (form.watch("recurrenceInterval") === 1 ? "miesiąc" : "miesięcy")}
                    {form.watch("recurrenceType") === "YEARLY" && (form.watch("recurrenceInterval") === 1 ? "rok" : "lat")}
                  </div>
                )}

                {/* Wielokrotne godziny wykonania (tylko dla DAILY) */}
                {form.watch("recurrenceType") === "DAILY" && (
                  <div className="space-y-3">
                    <FormLabel className="text-sm font-medium">
                      Godziny wykonania w ciągu dnia
                    </FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {(form.watch("recurrenceTimes") || []).map((time, index) => (
                        <div key={index} className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1.5 rounded-md text-sm">
                          <Clock className="h-3 w-3" />
                          <span>{time}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const times = form.getValues("recurrenceTimes") || [];
                              form.setValue("recurrenceTimes", times.filter((_, i) => i !== index));
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="flex items-center gap-1 px-3 py-1.5 border-2 border-dashed border-muted-foreground/30 rounded-md text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Dodaj godzinę
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-2" align="start">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Wybierz godzinę:</p>
                            <div className="max-h-[300px] overflow-y-auto space-y-1">
                              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                                <React.Fragment key={hour}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                      const newTime = `${String(hour).padStart(2, '0')}:00`;
                                      const times = form.getValues("recurrenceTimes") || [];
                                      if (!times.includes(newTime)) {
                                        form.setValue("recurrenceTimes", [...times, newTime].sort());
                                      }
                                    }}
                                  >
                                    <Clock className="h-3 w-3 mr-2" />
                                    {String(hour).padStart(2, '0')}:00
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                      const newTime = `${String(hour).padStart(2, '0')}:30`;
                                      const times = form.getValues("recurrenceTimes") || [];
                                      if (!times.includes(newTime)) {
                                        form.setValue("recurrenceTimes", [...times, newTime].sort());
                                      }
                                    }}
                                  >
                                    <Clock className="h-3 w-3 mr-2" />
                                    {String(hour).padStart(2, '0')}:30
                                  </Button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Dodaj wiele godzin, aby rutyna była wykonywana kilka razy dziennie (np. &quot;Umyć zęby&quot; o 7:00 i 22:00)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Opcja aktualizacji przyszłych wystąpień dla zadań cyklicznych */}
            {showRecurrenceEditOption && (
              <FormField
                control={form.control}
                name="updateFuture"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-blue-700 dark:text-blue-300">
                        Zaktualizuj przyszłe wystąpienia
                      </FormLabel>
                      <p className="text-sm text-blue-600 dark:text-blue-400">
                        Zmień również wszystkie przyszłe powtórzenia tego zadania
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* Quick Subtasks */}
            {!isEditing && (
              <div className="rounded-lg border p-3 space-y-3">
                <div>
                  <FormLabel>Podzadania (opcjonalnie)</FormLabel>
                  <p className="text-xs text-muted-foreground">Dodaj listę podzadań do wykonania</p>
                </div>

                {/* Lista podzadań */}
                {subtasks.length > 0 && (
                  <div className="space-y-1">
                    {subtasks.map((subtask, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50 group hover:bg-muted"
                      >
                        <span className="flex-1 text-sm">{subtask.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveSubtask(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formularz dodawania */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Tytuł podzadania..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  💡 Wciśnij Enter aby dodać • Możesz też dodać podzadania później
                </p>
              </div>
            )}

            </div>

            {/* Submit */}
            <div className="relative z-20 flex justify-end gap-2 pt-4 border-t bg-background pointer-events-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="button" onClick={() => void handleSaveClick()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : isEditing ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj zadanie"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

