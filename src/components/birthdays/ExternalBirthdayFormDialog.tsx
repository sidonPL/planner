"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Imię jest wymagane"),
  birthDate: z.date({
    message: "Data urodzin jest wymagana",
  }),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Nieprawidłowy adres email").optional().or(z.literal("")),
  notes: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Nieprawidłowy kolor").optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ExternalBirthdayFormDialogProps {
  trigger?: React.ReactNode;
  externalBirthday?: {
    id: string;
    name: string;
    birthDate: Date;
    relationship?: string | null;
    phone?: string | null;
    email?: string | null;
    notes?: string | null;
    color: string;
  };
  onSuccess?: () => void;
}

export function ExternalBirthdayFormDialog({
  trigger,
  externalBirthday,
  onSuccess,
}: ExternalBirthdayFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!externalBirthday;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: externalBirthday?.name || "",
      birthDate: externalBirthday?.birthDate ? new Date(externalBirthday.birthDate) : undefined,
      relationship: externalBirthday?.relationship || "",
      phone: externalBirthday?.phone || "",
      email: externalBirthday?.email || "",
      notes: externalBirthday?.notes || "",
      color: externalBirthday?.color || "#EC4899",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      const url = isEditing
        ? `/api/external-birthdays/${externalBirthday.id}`
        : "/api/external-birthdays";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          birthDate: data.birthDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save external birthday");
      }

      toast.success(
        isEditing
          ? "Urodziny zaktualizowane"
          : "Urodziny dodane"
      );

      setOpen(false);
      form.reset();
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving external birthday:", error);
      toast.error("Nie udało się zapisać urodzin");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            {isEditing ? "Edytuj" : "Dodaj urodziny"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj urodziny" : "Dodaj urodziny osoby spoza gospodarstwa"}
          </DialogTitle>
          <DialogDescription>
            Dodaj urodziny krewnych, przyjaciół lub innych ważnych osób
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imię i nazwisko *</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Jan Kowalski" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data urodzin *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd.MM.yyyy")
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relacja</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. ciocia, przyjaciel, sąsiad"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Jak ta osoba jest z Tobą związana
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl>
                    <Input placeholder="+48 123 456 789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan@example.com"
                      {...field}
                    />
                  </FormControl>
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
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="w-20 h-10"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#EC4899"
                        className="flex-1"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Kolor wyświetlania w kalendarzu
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notatki</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Dodatkowe informacje..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Anuluj
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Zapisz zmiany" : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

