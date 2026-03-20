'use client';

import { useState, useEffect } from 'react';
import { Flame, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityDay {
  date: string;
  points: number;
  hasActivity: boolean;
}

interface StreakCalendarCardProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCalendarCard({
  currentStreak,
  longestStreak,
  className
}: StreakCalendarCardProps) {
  const [calendar, setCalendar] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      const response = await fetch('/api/gamification/activity-calendar');
      if (response.ok) {
        const data = await response.json();
        setCalendar(data);
      }
    } catch (error) {
      console.error('Error loading activity calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityClass = (points: number) => {
    if (points === 0) return 'bg-gray-200 dark:bg-gray-800';
    if (points < 10) return 'bg-green-200 dark:bg-green-900';
    if (points < 25) return 'bg-green-400 dark:bg-green-700';
    if (points < 50) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  // Group by weeks
  const weeks: ActivityDay[][] = [];
  for (let i = 0; i < calendar.length; i += 7) {
    weeks.push(calendar.slice(i, i + 7));
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Seria aktywności
        </CardTitle>
        <CardDescription>
          Twoja aktywność w ciągu ostatnich 30 dni
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
            <div className="text-4xl font-bold text-orange-500 flex items-center justify-center gap-2">
              🔥 {currentStreak}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Aktualna seria
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
            <div className="text-4xl font-bold text-purple-500 flex items-center justify-center gap-2">
              ⭐ {longestStreak}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Najdłuższa seria
            </p>
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>Kalendarz aktywności</span>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Ładowanie...
            </div>
          ) : (
            <div className="space-y-1">
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground mb-2">
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map(day => (
                  <div key={day} className="text-center">{day}</div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const date = parseISO(day.date);
                    return (
                      <div
                        key={day.date}
                        className={cn(
                          'aspect-square rounded transition-colors cursor-pointer',
                          getIntensityClass(day.points),
                          'hover:ring-2 hover:ring-primary'
                        )}
                        title={`${format(date, 'PP', { locale: pl })}\n${day.points} punktów`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground pt-2">
            <span>Mniej</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900" />
              <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-700" />
              <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-600" />
              <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500" />
            </div>
            <span>Więcej</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

