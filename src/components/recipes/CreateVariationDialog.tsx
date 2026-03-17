"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const variationSchema = z.object({
  variationName: z.string().min(1, "Nazwa wariantu jest wymagana"),
  description: z.string().optional(),
});

type VariationFormData = z.infer<typeof variationSchema>;

interface CreateVariationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentRecipeName: string;
  onSubmit: (data: VariationFormData) => void;
}

export function CreateVariationDialog({
  open,
  onOpenChange,
  parentRecipeName,
  onSubmit,
}: CreateVariationDialogProps) {
  const form = useForm<VariationFormData>({
    resolver: zodResolver(variationSchema),
    defaultValues: {
      variationName: "",
      description: "",
    },
  });

  const handleSubmit = (data: VariationFormData) => {
    onSubmit(data);
    form.reset();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => form.reset(), 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Utwórz wariant: {parentRecipeName}</DialogTitle>
          <DialogDescription>
            Podaj nazwę i opis wariantu przepisu. W następnym kroku będziesz mógł dostosować przepis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="variationName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nazwa wariantu <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="np. Wersja wegańska, Wersja ostra, Wersja z kurczakiem..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Krótka nazwa opisująca czym różni się ten wariant.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opis zmian (opcjonalnie)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Opisz co zostało zmienione w tym wariancie..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Możesz opisać jakie zmiany wprowadzasz i dlaczego.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Anuluj
              </Button>
              <Button type="submit">Dalej - dostosuj przepis</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

