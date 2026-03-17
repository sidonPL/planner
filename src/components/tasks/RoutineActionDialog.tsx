"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertCircle, CalendarRange, CheckCircle2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type ActionType = "edit" | "delete";
type ScopeType = "single" | "future" | "all";

interface RoutineActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  routineTitle: string;
  actionType: ActionType;
  onSuccess: () => void;
}

export function RoutineActionDialog({
  open,
  onOpenChange,
  routineId,
  routineTitle,
  actionType,
  onSuccess,
}: RoutineActionDialogProps) {
  const [scope, setScope] = useState<ScopeType>("future");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    setIsSubmitting(true);

    try {
      if (actionType === "delete") {
        const response = await fetch(`/api/routines/${routineId}?scope=${scope}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Nie udało się usunąć rutyny");
        }

        const data = await response.json();

        toast({
          title: "Rutyna usunięta",
          description: data.message || `Usunięto ${data.deletedCount} instancji`,
        });
      } else {
        // Dla edycji - przekieruj do formularza z informacją o zakresie
        // Ten dialog jest używany głównie do potwierdzenia zakresu
        onSuccess();
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error performing routine action:", error);
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Wystąpił błąd",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionType === "delete" ? (
              <>
                <Trash2 className="h-5 w-5 text-red-500" />
                Usuń rutynę
              </>
            ) : (
              <>
                <CalendarRange className="h-5 w-5 text-blue-500" />
                Edytuj rutynę
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {actionType === "delete"
              ? "Wybierz zakres usuwania rutyny"
              : "Wybierz zakres edycji rutyny"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rutyna:</strong> {routineTitle}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Zakres {actionType === "delete" ? "usuwania" : "edycji"}</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as ScopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Tylko ta instancja</span>
                    <span className="text-xs text-muted-foreground">
                      {actionType === "delete" ? "Usuń" : "Edytuj"} tylko to jedno wystąpienie
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="future">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Przyszłe instancje</span>
                    <span className="text-xs text-muted-foreground">
                      {actionType === "delete" ? "Usuń" : "Edytuj"} wszystkie przyszłe wystąpienia (od dzisiaj)
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Wszystkie instancje</span>
                    <span className="text-xs text-muted-foreground">
                      {actionType === "delete" ? "Usuń" : "Edytuj"} wszystkie wystąpienia (włącznie z przeszłymi)
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {actionType === "delete" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {scope === "single" && "Zostanie usunięta tylko ta jedna instancja rutyny."}
                {scope === "future" && "Zostaną usunięte wszystkie przyszłe instancje tej rutyny."}
                {scope === "all" && "Zostaną usunięte wszystkie instancje tej rutyny, włącznie z historycznymi."}
              </AlertDescription>
            </Alert>
          )}

          {actionType === "edit" && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                {scope === "single" && "Zmiany zostaną zastosowane tylko do tej jednej instancji."}
                {scope === "future" && "Zmiany zostaną zastosowane do wszystkich przyszłych instancji."}
                {scope === "all" && "Zmiany zostaną zastosowane do wszystkich instancji rutyny."}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
          <Button
            variant={actionType === "delete" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Przetwarzanie..." : actionType === "delete" ? "Usuń" : "Kontynuuj"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

