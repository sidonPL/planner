"use client";

import { useState, useEffect } from "react";
import { Flame, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutineStreak {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletedAt: Date | null;
}

interface RoutineStreakBadgeProps {
  taskId: string;
  compact?: boolean;
  className?: string;
}

export function RoutineStreakBadge({
  taskId,
  compact = false,
  className
}: RoutineStreakBadgeProps) {
  const [streak, setStreak] = useState<RoutineStreak | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStreak();
  }, [taskId]);

  const loadStreak = async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/streak`);
      if (response.ok) {
        const data = await response.json();
        setStreak(data);
      }
    } catch (error) {
      console.error("Error loading streak:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streak || streak.currentStreak === 0) {
    return null;
  }

  // Compact version for TaskCard
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-xs",
          streak.currentStreak >= 7 && "text-orange-600 font-medium",
          className
        )}
        title={`Seria: ${streak.currentStreak} dni z rzędu`}
      >
        <Flame className={cn(
          "h-3 w-3",
          streak.currentStreak >= 30 && "animate-pulse"
        )} />
        <span>{streak.currentStreak}</span>
      </div>
    );
  }

  // Full version for TaskDetailDialog
  const getStreakColor = (days: number) => {
    if (days >= 50) return "from-orange-500 to-red-600";
    if (days >= 30) return "from-orange-400 to-orange-600";
    if (days >= 14) return "from-yellow-500 to-orange-500";
    if (days >= 7) return "from-yellow-400 to-yellow-600";
    return "from-gray-400 to-gray-600";
  };

  const getStreakMessage = (days: number) => {
    if (days >= 100) return "🏆 Legendarna seria!";
    if (days >= 50) return "🔥 Niesamowita seria!";
    if (days >= 30) return "⭐ Świetna seria!";
    if (days >= 14) return "💪 Dobra passa!";
    if (days >= 7) return "👍 Trzymaj tak dalej!";
    return "🌱 Początek serii";
  };

  return (
    <div className={cn(
      "bg-gradient-to-r p-4 rounded-lg border shadow-sm",
      streak.currentStreak >= 30 ? "from-orange-50 to-red-50 border-orange-200" :
      streak.currentStreak >= 7 ? "from-yellow-50 to-orange-50 border-yellow-200" :
      "from-gray-50 to-gray-100 border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "p-2 rounded-lg bg-gradient-to-br",
          getStreakColor(streak.currentStreak)
        )}>
          <Flame className="h-5 w-5 text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">Seria wykonań</h4>
          <p className="text-xs text-muted-foreground">
            {getStreakMessage(streak.currentStreak)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Current Streak */}
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold bg-gradient-to-br bg-clip-text text-transparent",
            getStreakColor(streak.currentStreak)
          )}>
            {streak.currentStreak}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Flame className="h-3 w-3" />
            <span>dni z rzędu</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {streak.longestStreak}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>najdłuższa</span>
          </div>
        </div>

        {/* Total */}
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">
            {streak.totalCompletions}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
            <Award className="h-3 w-3" />
            <span>łącznie</span>
          </div>
        </div>
      </div>

      {/* Motivational milestones */}
      {streak.currentStreak < 100 && (
        <div className="mt-3 pt-3 border-t border-dashed border-gray-300">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Do kolejnego kamienia milowego:</span>
            <span className="font-medium">
              {streak.currentStreak < 7 ? `${7 - streak.currentStreak} dni do 1 tyg` :
               streak.currentStreak < 14 ? `${14 - streak.currentStreak} dni do 2 tyg` :
               streak.currentStreak < 30 ? `${30 - streak.currentStreak} dni do miesiąca` :
               streak.currentStreak < 50 ? `${50 - streak.currentStreak} dni do 50` :
               `${100 - streak.currentStreak} dni do 100!`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all bg-gradient-to-r",
                getStreakColor(streak.currentStreak)
              )}
              style={{
                width: `${
                  streak.currentStreak < 7 ? (streak.currentStreak / 7) * 100 :
                  streak.currentStreak < 14 ? ((streak.currentStreak - 7) / 7) * 100 :
                  streak.currentStreak < 30 ? ((streak.currentStreak - 14) / 16) * 100 :
                  streak.currentStreak < 50 ? ((streak.currentStreak - 30) / 20) * 100 :
                  ((streak.currentStreak - 50) / 50) * 100
                }%`
              }}
            />
          </div>
        </div>
      )}

      {/* Special milestone celebration */}
      {[7, 14, 30, 50, 100].includes(streak.currentStreak) && (
        <div className="mt-3 p-2 bg-white/50 rounded text-center">
          <div className="text-xs font-medium text-orange-700">
            🎉 Gratulacje! Osiągnięto {streak.currentStreak} dni!
          </div>
        </div>
      )}
    </div>
  );
}

