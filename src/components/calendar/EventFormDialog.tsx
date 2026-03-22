"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Bell, CalendarIcon, Loader2, Plus, X } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const eventFormSchema = z.object({
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  allDay: z.boolean(),
  color: z.string().optional(),
  type: z.enum(["GENERAL", "TASK", "MEAL", "TRIP", "WORK", "SCHOOL", "REMINDER"]),
  location: z.string().optional(),
  reminderMinutes: z.array(z.number().int().nonnegative()),
});

type EventFormData = z.input<typeof eventFormSchema>;

type Member = {
  id: string;
  name: string | null;
  color: string;
};

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  defaultDate?: Date;
  event?: {
    id: string;
    title: string;
    description?: string | null;
    startDate: Date | string;
    endDate?: Date | string | null;
    allDay: boolean;
    color?: string | null;
    type: string;
    location?: string | null;
    reminderMinutes?: number[];
  };
}

const eventColors = [
  { name: "Niebieski", value: "#3B82F6" },
  { name: "Zielony", value: "#10B981" },
  { name: "Czerwony", value: "#EF4444" },
  { name: "Żółty", value: "#F59E0B" },
  { name: "Fioletowy", value: "#8B5CF6" },
  { name: "Różowy", value: "#EC4899" },
  { name: "Pomarańczowy", value: "#F97316" },
  { name: "Turkusowy", value: "#06B6D4" },
];

const eventTypes = [
  { label: "Ogólne", value: "GENERAL" },
  { label: "Praca", value: "WORK" },
  { label: "Szkoła", value: "SCHOOL" },
  { label: "Wyjazd", value: "TRIP" },
  { label: "Przypomnienie", value: "REMINDER" },
];

const reminderPresets = [
  { label: "10 min wcześniej", value: 10 },
  { label: "30 min wcześniej", value: 30 },
  { label: "1 godz. wcześniej", value: 60 },
  { label: "2 godz. wcześniej", value: 120 },
  { label: "1 dzień wcześniej", value: 1440 },
  { label: "7 dni wcześniej", value: 10080 },
];

const customReminderUnits = [
  { label: "min", value: "minutes", multiplier: 1 },
  { label: "godz", value: "hours", multiplier: 60 },
  { label: "dni", value: "days", multiplier: 1440 },
] as const;

type CustomReminderUnit = (typeof customReminderUnits)[number]["value"];

function formatReminderLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min wcześniej`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "dzień" : "dni"} wcześniej`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "godz." : "godz."} wcześniej`;
  }
  return `${minutes} min wcześniej`;
}

function BadgeRemovable({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background"
        aria-label={`Usuń przypomnienie ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function EventFormDialog({
  open,
  onOpenChange,
  members: _members,
  defaultDate,
  event,
}: EventFormDialogProps) {
  void _members;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customReminderValue, setCustomReminderValue] = useState("");
  const [customReminderUnit, setCustomReminderUnit] = useState<CustomReminderUnit>("minutes");

  const buildDefaultValues = useCallback((): EventFormData => {
    const eventStartDate = event?.startDate ? new Date(event.startDate) : undefined;
    const eventEndDate = event?.endDate ? new Date(event.endDate) : undefined;

    const supportedTypeValues = new Set(eventTypes.map((type) => type.value));
    const normalizedType = event?.type && supportedTypeValues.has(event.type)
      ? (event.type as EventFormData["type"])
      : "GENERAL";

    return {
      title: event?.title || "",
      description: event?.description || "",
      startDate: eventStartDate || defaultDate || new Date(),
      endDate: eventEndDate,
      startTime: eventStartDate && !event?.allDay ? format(eventStartDate, "HH:mm") : "",
      endTime: eventEndDate && !event?.allDay ? format(eventEndDate, "HH:mm") : "",
      allDay: event?.allDay ?? true,
      color: event?.color || "#3B82F6",
      type: normalizedType,
      location: event?.location || "",
      reminderMinutes: Array.isArray(event?.reminderMinutes) ? event.reminderMinutes : [],
    };
  }, [event, defaultDate]);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: buildDefaultValues(),
  });

  useEffect(() => {
    if (open) {
      form.reset(buildDefaultValues());
    }
  }, [open, form, buildDefaultValues]);

  const isAllDay = form.watch("allDay");
  const selectedReminders = form.watch("reminderMinutes");

  const toggleReminder = (minutes: number) => {
    const current = form.getValues("reminderMinutes") || [];
    const next = current.includes(minutes)
      ? current.filter((m) => m !== minutes)
      : [...current, minutes].sort((a, b) => a - b);
    form.setValue("reminderMinutes", next, { shouldDirty: true });
  };

  const removeReminder = (minutes: number) => {
    const current = form.getValues("reminderMinutes") || [];
    form.setValue(
      "reminderMinutes",
      current.filter((m) => m !== minutes),
      { shouldDirty: true }
    );
  };

  const addCustomReminder = () => {
    const rawValue = Number(customReminderValue);

    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      toast.error("Podaj poprawną wartość przypomnienia");
      return;
    }

    const unit = customReminderUnits.find((item) => item.value === customReminderUnit);
    if (!unit) return;

    const minutes = Math.round(rawValue * unit.multiplier);
    if (minutes > 60 * 24 * 30) {
      toast.error("Maksymalne przypomnienie to 30 dni wcześniej");
      return;
    }

    const current = form.getValues("reminderMinutes") || [];
    if (current.includes(minutes)) {
      toast.info("To przypomnienie już jest dodane");
      return;
    }

    form.setValue("reminderMinutes", [...current, minutes].sort((a, b) => a - b), {
      shouldDirty: true,
    });
    setCustomReminderValue("");
  };

  const handleCustomReminderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomReminder();
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      const startDateTime = new Date(data.startDate);
      if (!data.allDay && data.startTime) {
        const [hours, minutes] = data.startTime.split(":").map(Number);
        startDateTime.setHours(hours || 0, minutes || 0, 0, 0);
      } else {
        startDateTime.setHours(0, 0, 0, 0);
      }

      let endDateTime: Date | undefined;
      if (data.endDate) {
        endDateTime = new Date(data.endDate);
        if (!data.allDay && data.endTime) {
          const [hours, minutes] = data.endTime.split(":").map(Number);
          endDateTime.setHours(hours || 0, minutes || 0, 0, 0);
        } else if (data.allDay) {
          endDateTime.setHours(0, 0, 0, 0);
        }
      }

      const isEditMode = Boolean(event?.id);
      const payload = {
        ...data,
        startDate: startDateTime.toISOString(),
        ...(endDateTime ? { endDate: endDateTime.toISOString() } : {}),
        reminderMinutes: data.reminderMinutes,
      };

      const response = await fetch(isEditMode ? `/api/events/${event!.id}` : "/api/events", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(isEditMode ? "Wydarzenie zostało zaktualizowane" : "Wydarzenie zostało dodane");
        form.reset();
        onOpenChange(false);
        // Odśwież stronę aby zobaczyć nowe wydarzenie
        window.location.reload();
      } else {
        const errorData = await response.json().catch(() => null);
        const backendMessage = errorData?.error || errorData?.message;
        if (backendMessage) {
          toast.error(backendMessage);
          return;
        }
        toast.error(isEditMode ? "Nie udało się zaktualizować wydarzenia" : "Nie udało się dodać wydarzenia");
      }
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? "Edytuj wydarzenie" : "Nowe wydarzenie"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tytuł */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tytuł</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Spotkanie z rodziną" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Opis */}
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

            {/* Typ i kolor */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kolor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: field.value }}
                              />
                              {eventColors.find((c) => c.value === field.value)?.name}
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventColors.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: color.value }}
                              />
                              {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cały dzień */}
            <FormField
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Cały dzień</FormLabel>
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

            {/* Data rozpoczęcia */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data rozpoczęcia</FormLabel>
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

              {!isAllDay && (
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Godzina rozpoczęcia</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Data zakończenia */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data zakończenia (opcjonalnie)</FormLabel>
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

              {!isAllDay && (
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Godzina zakończenia</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Lokalizacja */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokalizacja (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Input placeholder="Np. Warszawa, ul. Przykładowa 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Przypomnienia */}
            <FormField
              control={form.control}
              name="reminderMinutes"
              render={() => (
                <FormItem className="space-y-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <FormLabel className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Przypomnienia
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Wybierz, kiedy aplikacja ma wysłać przypomnienie.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {reminderPresets.map((preset) => {
                      const active = selectedReminders?.includes(preset.value);
                      return (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleReminder(preset.value)}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={customReminderValue}
                      onChange={(e) => setCustomReminderValue(e.target.value)}
                      onKeyDown={handleCustomReminderKeyDown}
                      placeholder="Własna wartość"
                    />
                    <Select
                      value={customReminderUnit}
                      onValueChange={(value) => setCustomReminderUnit(value as CustomReminderUnit)}
                    >
                      <SelectTrigger className="w-[90px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {customReminderUnits.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" onClick={addCustomReminder}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {(selectedReminders?.length || 0) > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedReminders
                        .slice()
                        .sort((a, b) => a - b)
                        .map((value) => (
                          <BadgeRemovable
                            key={value}
                            label={formatReminderLabel(value)}
                            onRemove={() => removeReminder(value)}
                          />
                        ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Przyciski */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisywanie...
                  </>
                ) : event ? (
                  "Zapisz zmiany"
                ) : (
                  "Dodaj wydarzenie"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

