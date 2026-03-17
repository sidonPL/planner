"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Repeat, Calendar, Trash2 } from "lucide-react";

type RecurringAction = "this" | "future" | "all";

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "delete";
  onSelect: (action: RecurringAction) => void;
  taskTitle?: string;
}

export function RecurringTaskDialog({
  open,
  onOpenChange,
  mode,
  onSelect,
  taskTitle,
}: RecurringTaskDialogProps) {
  const isEdit = mode === "edit";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-blue-500" />
            {isEdit ? "Edytuj zadanie cykliczne" : "Usuń zadanie cykliczne"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {taskTitle && (
              <span className="font-medium text-foreground block mb-2">
                &quot;{taskTitle}&quot;
              </span>
            )}
            {isEdit
              ? "To jest zadanie cykliczne. Wybierz które wystąpienia chcesz edytować:"
              : "To jest zadanie cykliczne. Wybierz które wystąpienia chcesz usunąć:"}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => {
              onSelect("this");
              onOpenChange(false);
            }}
          >
            <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium">
                {isEdit ? "Tylko to wystąpienie" : "Tylko to wystąpienie"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isEdit
                  ? "Zmieni tylko to jedno zadanie"
                  : "Usunie tylko to jedno zadanie"}
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={() => {
              onSelect("future");
              onOpenChange(false);
            }}
          >
            <Repeat className="h-4 w-4 mr-3 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">
                {isEdit
                  ? "To i przyszłe wystąpienia"
                  : "To i przyszłe wystąpienia"}
              </div>
              <div className="text-xs text-muted-foreground">
                {isEdit
                  ? "Zmieni to zadanie i wszystkie przyszłe"
                  : "Usunie to zadanie i wszystkie przyszłe"}
              </div>
            </div>
          </Button>

          {mode === "delete" && (
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-3 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => {
                onSelect("all");
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-3 text-red-500" />
              <div className="text-left">
                <div className="font-medium text-red-600">
                  Wszystkie wystąpienia
                </div>
                <div className="text-xs text-muted-foreground">
                  Usunie całą serię zadań (przeszłe i przyszłe)
                </div>
              </div>
            </Button>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

