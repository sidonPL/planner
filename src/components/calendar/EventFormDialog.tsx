"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Loader2 } from "lucide-react";
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
});

type EventFormData = z.infer<typeof eventFormSchema>;

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

export function EventFormDialog({
  open,
  onOpenChange,
  members: _members,
  defaultDate,
  event,
}: EventFormDialogProps) {
  void _members;
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <DialogContent className="sm:max-w-[500px]">
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

