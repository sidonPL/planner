"use client";

import { useState, useEffect } from "react";
import { Target, Plus, TrendingUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface NutritionGoal {
  id: string;
  goalType: string;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  targetFiber: number | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface NutritionGoalsDialogProps {
  onGoalSet?: (goal: NutritionGoal) => void;
}

export function NutritionGoalsDialog({ onGoalSet }: NutritionGoalsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [goals, setGoals] = useState<NutritionGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<NutritionGoal | null>(null);
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState<"daily" | "weekly">("daily");
  const [targetCalories, setTargetCalories] = useState("");
  const [targetProtein, setTargetProtein] = useState("");
  const [targetCarbs, setTargetCarbs] = useState("");
  const [targetFat, setTargetFat] = useState("");
  const [targetFiber, setTargetFiber] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const loadGoals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/nutrition/goals");
      if (response.ok) {
        const data = await response.json();
        setGoals(data.goals || []);
        setActiveGoal(data.activeGoal || null);
      }
    } catch (error) {
      console.error("Error loading goals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/nutrition/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType,
          targetCalories: targetCalories ? parseInt(targetCalories) : null,
          targetProtein: targetProtein ? parseInt(targetProtein) : null,
          targetCarbs: targetCarbs ? parseInt(targetCarbs) : null,
          targetFat: targetFat ? parseInt(targetFat) : null,
          targetFiber: targetFiber ? parseInt(targetFiber) : null,
          notes: notes.trim() || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Cel żywieniowy ustawiony!");
        setActiveGoal(data.goal);
        onGoalSet?.(data.goal);
        setShowForm(false);
        resetForm();
        loadGoals();
      } else {
        toast.error("Nie udało się zapisać celu");
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Wystąpił błąd");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm("Czy na pewno chcesz usunąć ten cel?")) {
      return;
    }

    try {
      const response = await fetch(`/api/nutrition/goals/${goalId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Cel usunięty");
        loadGoals();
      }
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Nie udało się usunąć celu");
    }
  };

  const resetForm = () => {
    setGoalType("daily");
    setTargetCalories("");
    setTargetProtein("");
    setTargetCarbs("");
    setTargetFat("");
    setTargetFiber("");
    setNotes("");
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Target className="h-4 w-4" />
          Cele Żywieniowe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Cele Żywieniowe
          </DialogTitle>
          <DialogDescription>
            Ustaw swoje cele kaloryczne i makroskładniki. Śledź postępy dzień po dniu.
          </DialogDescription>
        </DialogHeader>

        {/* Active Goal */}
        {activeGoal && !showForm && (
          <div className="border rounded-lg p-4 bg-primary/5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge>Aktywny cel</Badge>
                  <Badge variant="outline">
                    {activeGoal.goalType === "daily" ? "Dzienny" : "Tygodniowy"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Od: {formatDate(activeGoal.startDate)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteGoal(activeGoal.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {activeGoal.targetCalories && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{activeGoal.targetCalories} kcal</div>
                    <div className="text-xs text-muted-foreground">Kalorie</div>
                  </div>
                </div>
              )}
              {activeGoal.targetProtein && (
                <div className="text-sm">
                  <div className="font-medium">{activeGoal.targetProtein}g</div>
                  <div className="text-xs text-muted-foreground">Białko</div>
                </div>
              )}
              {activeGoal.targetCarbs && (
                <div className="text-sm">
                  <div className="font-medium">{activeGoal.targetCarbs}g</div>
                  <div className="text-xs text-muted-foreground">Węglowodany</div>
                </div>
              )}
              {activeGoal.targetFat && (
                <div className="text-sm">
                  <div className="font-medium">{activeGoal.targetFat}g</div>
                  <div className="text-xs text-muted-foreground">Tłuszcze</div>
                </div>
              )}
              {activeGoal.targetFiber && (
                <div className="text-sm">
                  <div className="font-medium">{activeGoal.targetFiber}g</div>
                  <div className="text-xs text-muted-foreground">Błonnik</div>
                </div>
              )}
            </div>

            {activeGoal.notes && (
              <div className="mt-3 text-sm text-muted-foreground">
                📝 {activeGoal.notes}
              </div>
            )}
          </div>
        )}

        {/* New Goal Form */}
        {showForm ? (
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="font-medium">Nowy cel żywieniowy</h3>

            <div className="space-y-2">
              <Label>Typ celu</Label>
              <Select value={goalType} onValueChange={(v: "daily" | "weekly") => setGoalType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Dzienny</SelectItem>
                  <SelectItem value="weekly">Tygodniowy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="calories">Kalorie (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  placeholder="2000"
                  value={targetCalories}
                  onChange={(e) => setTargetCalories(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Białko (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  placeholder="150"
                  value={targetProtein}
                  onChange={(e) => setTargetProtein(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Węglowodany (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  placeholder="250"
                  value={targetCarbs}
                  onChange={(e) => setTargetCarbs(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Tłuszcze (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  placeholder="70"
                  value={targetFat}
                  onChange={(e) => setTargetFat(e.target.value)}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="fiber">Błonnik (g)</Label>
                <Input
                  id="fiber"
                  type="number"
                  placeholder="30"
                  value={targetFiber}
                  onChange={(e) => setTargetFiber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
              <Textarea
                id="notes"
                placeholder="np. redukcja, masa, utrzymanie..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Anuluj
              </Button>
              <Button onClick={handleCreateGoal} disabled={isSaving}>
                {isSaving ? "Zapisywanie..." : "Zapisz cel"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowForm(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            {activeGoal ? "Zmień cel" : "Ustaw nowy cel"}
          </Button>
        )}

        {/* Past Goals */}
        {goals.filter(g => !g.isActive).length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Historia celów</h4>
            <div className="space-y-2">
              {goals.filter(g => !g.isActive).map((goal) => (
                <div
                  key={goal.id}
                  className="text-sm p-2 rounded bg-muted/50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium">
                      {goal.targetCalories ? `${goal.targetCalories} kcal` : "Brak danych"}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {formatDate(goal.startDate)}
                      {goal.endDate && ` - ${formatDate(goal.endDate)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Wskazówka:</strong> Ustalenie celu pomoże Ci śledzić dzienne/tygodniowe
          spożycie kalorii i makroskładników. Porównuj z posiłkami z jadłospisu.
        </div>
      </DialogContent>
    </Dialog>
  );
}

