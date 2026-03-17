'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Plus,
  ShoppingCart,
  Utensils,
  ListChecks,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { emitXPEarned } from '@/lib/gamification-events';

interface Quest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  target: number;
  reward: number;
  userProgress: number;
  userCompleted: boolean;
}

interface QuickActionButtonProps {
  quest: Quest;
  onComplete?: () => void;
}

/**
 * Quick Action Button - szybka akcja do wykonania questa
 */
export function QuickActionButton({ quest }: QuickActionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const getActionConfig = () => {
    switch (quest.type) {
      case 'COMPLETE_TASKS':
        return {
          label: 'Idź do zadań',
          icon: <ListChecks className="h-4 w-4" />,
          action: () => router.push('/tasks'),
        };
      case 'COOK_RECIPES':
        return {
          label: 'Gotuj przepis',
          icon: <Utensils className="h-4 w-4" />,
          action: () => router.push('/recipes'),
        };
      case 'ADD_SHOPPING_ITEMS':
        return {
          label: 'Dodaj do listy',
          icon: <ShoppingCart className="h-4 w-4" />,
          action: () => router.push('/shopping'),
        };
      case 'RATE_RECIPES':
        return {
          label: 'Oceń przepis',
          icon: <Utensils className="h-4 w-4" />,
          action: () => router.push('/recipes'),
        };
      case 'CHECK_INVENTORY':
        return {
          label: 'Sprawdź inwentarz',
          icon: <Plus className="h-4 w-4" />,
          action: () => router.push('/inventory'),
        };
      case 'MAINTAIN_STREAK':
        return {
          label: 'Kontynuuj serię',
          icon: <Flame className="h-4 w-4" />,
          action: () => router.push('/gamification'),
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();

  if (!config || quest.userCompleted) {
    return null;
  }

  const handleClick = async () => {
    setLoading(true);
    try {
      config.action();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-2"
    >
      {config.icon}
      {config.label}
      <ArrowRight className="h-3 w-3" />
    </Button>
  );
}

interface EnhancedQuestCardProps {
  quest: Quest;
  onComplete?: () => void;
}

/**
 * Enhanced Quest Card - ulepszona karta questa z quick action
 */
export function EnhancedQuestCard({ quest, onComplete }: EnhancedQuestCardProps) {
  const percentage = Math.min((quest.userProgress / quest.target) * 100, 100);
  const isCompleted = quest.userCompleted;

  const getQuestIcon = () => {
    switch (quest.type) {
      case 'COMPLETE_TASKS':
        return <ListChecks className="h-5 w-5" />;
      case 'COOK_RECIPES':
        return <Utensils className="h-5 w-5" />;
      case 'ADD_SHOPPING_ITEMS':
        return <ShoppingCart className="h-5 w-5" />;
      case 'MAINTAIN_STREAK':
        return <Flame className="h-5 w-5" />;
      default:
        return <CheckCircle2 className="h-5 w-5" />;
    }
  };

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all
        ${isCompleted 
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
          : 'bg-card hover:shadow-md'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          flex-shrink-0 p-2 rounded-lg
          ${isCompleted 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600' 
            : 'bg-primary/10 text-primary'
          }
        `}>
          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : getQuestIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{quest.title}</h4>
              {quest.description && (
                <p className="text-xs text-muted-foreground">{quest.description}</p>
              )}
            </div>
            <Badge variant={isCompleted ? 'default' : 'secondary'} className="shrink-0">
              +{quest.reward} XP
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Postęp: {quest.userProgress} / {quest.target}
              </span>
              <span className="font-semibold">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Quick Action */}
          {!isCompleted && (
            <div className="mt-3">
              <QuickActionButton quest={quest} onComplete={onComplete} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

