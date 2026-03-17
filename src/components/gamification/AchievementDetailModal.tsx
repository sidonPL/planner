'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Lock, Award, TrendingUp, Users, Pin, PinOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { AchievementIconLarge } from '@/lib/achievement-icons';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  xpReward: number;
  isSecret: boolean;
  isUnlocked: boolean;
  progress: number;
  percentage: number;
  unlockedAt: Date | null;
}

interface AchievementDetailModalProps {
  achievement: Achievement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabels: Record<string, string> = {
  TASKS: 'Zadania',
  RECIPES: 'Przepisy',
  MEALS: 'Posiłki',
  SHOPPING: 'Zakupy',
  INVENTORY: 'Inwentarz',
  STREAK: 'Serie',
  SOCIAL: 'Współpraca',
  MASTER: 'Mistrzostwa',
};

const categoryColors: Record<string, string> = {
  TASKS: 'bg-green-500/10 text-green-700 dark:text-green-400',
  RECIPES: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  MEALS: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  SHOPPING: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  INVENTORY: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  STREAK: 'bg-red-500/10 text-red-700 dark:text-red-400',
  SOCIAL: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  MASTER: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
};

const requirementTypeLabels: Record<string, string> = {
  TASKS_COMPLETED: 'Ukończone zadania',
  RECIPES_COOKED: 'Ugotowane przepisy',
  UNIQUE_RECIPES: 'Unikalne przepisy',
  COOKING_STREAK: 'Dni gotowania z rzędu',
  COOKING_TIME_HOURS: 'Godzin w kuchni',
  FIVE_STAR_RATINGS: 'Ocen 5 gwiazdek',
  STREAK_DAYS: 'Dni z aktywnym streakiem',
  CATEGORY_BREAKFAST: 'Śniadania',
  CATEGORY_LUNCH: 'Obiady',
  CATEGORY_DINNER: 'Kolacje',
  CATEGORY_DESSERT: 'Desery',
  CATEGORY_SNACK: 'Przekąski',
};

export function AchievementDetailModal({
  achievement,
  open,
  onOpenChange,
}: AchievementDetailModalProps) {
  const [isPinned, setIsPinned] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  if (!achievement) return null;

  const categoryColor = categoryColors[achievement.category] || categoryColors.TASKS;
  const requirementLabel =
    requirementTypeLabels[achievement.requirementType] || achievement.requirementType;

  const handleTogglePin = async () => {
    if (!achievement.isUnlocked) {
      toast.error('Możesz przypiąć tylko odblokowane osiągnięcia');
      return;
    }

    setIsPinning(true);
    try {
      const method = isPinned ? 'DELETE' : 'POST';
      const response = await fetch(
        `/api/gamification/achievements/${achievement.id}/pin`,
        { method }
      );

      if (response.ok) {
        setIsPinned(!isPinned);
        toast.success(isPinned ? 'Osiągnięcie odpięte' : 'Osiągnięcie przypięte');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Nie udało się przypiąć osiągnięcia');
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Błąd podczas przypinania');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <AchievementIconLarge
              icon={achievement.icon}
              unlocked={achievement.isUnlocked}
            />
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-2">
                {achievement.name}
                {achievement.isUnlocked && (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                )}
                {!achievement.isUnlocked && achievement.isSecret && (
                  <Lock className="h-6 w-6 text-muted-foreground" />
                )}
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                {achievement.description}
              </DialogDescription>
            </div>
            {achievement.isUnlocked && (
              <Button
                variant={isPinned ? 'default' : 'outline'}
                size="icon"
                onClick={handleTogglePin}
                disabled={isPinning}
                title={isPinned ? 'Odepnij osiągnięcie' : 'Przypnij osiągnięcie'}
              >
                {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Kategoria i XP */}
          <div className="flex items-center gap-3">
            <Badge className={categoryColor}>{categoryLabels[achievement.category]}</Badge>
            <Badge variant="outline" className="gap-1">
              <Award className="h-3 w-3" />
              {achievement.xpReward} XP
            </Badge>
            {achievement.isSecret && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                Ukryte
              </Badge>
            )}
          </div>

          {/* Postęp */}
          {achievement.isUnlocked ? (
            <div className="p-6 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-lg">Osiągnięcie odblokowane!</h3>
                  {achievement.unlockedAt && (
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(achievement.unlockedAt, {
                        addSuffix: true,
                        locale: pl,
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Gratulacje! Zdobyłeś <strong>+{achievement.xpReward} XP</strong> za to osiągnięcie!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Twój postęp
                  </h3>
                  <span className="text-2xl font-bold text-primary">{achievement.percentage}%</span>
                </div>
                <Progress value={achievement.percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm text-muted-foreground">Aktualny postęp</p>
                  <p className="text-2xl font-bold">{achievement.progress}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Wymagane</p>
                  <p className="text-2xl font-bold">{achievement.requirementValue}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-card">
                <h4 className="font-semibold mb-2">Wymagania</h4>
                <p className="text-sm text-muted-foreground">
                  {requirementLabel}: <strong>{achievement.requirementValue}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pozostało jeszcze:{' '}
                  <strong className="text-primary">
                    {achievement.requirementValue - achievement.progress}
                  </strong>
                </p>
              </div>
            </div>
          )}

          {/* Statystyki (jeśli są dostępne) */}
          {!achievement.isUnlocked && achievement.percentage >= 50 && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-semibold">Jesteś blisko!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ukończyłeś już ponad połowę! Kontynuuj dalej aby odblokować to osiągnięcie i
                    zdobyć <strong>+{achievement.xpReward} XP</strong>!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rarity / Trudność (opcjonalnie) */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Rzadkość</span>
              </div>
              <span className="font-medium">
                {achievement.xpReward >= 500
                  ? 'Legendarne 👑'
                  : achievement.xpReward >= 200
                  ? 'Rzadkie 💎'
                  : achievement.xpReward >= 100
                  ? 'Nietypowe ⭐'
                  : 'Powszechne 🔵'}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

