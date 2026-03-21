"use client";

import { useEffect, useState } from "react";
import { Bell, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isPast, isFuture } from "date-fns";
import { pl } from "date-fns/locale";

interface PaymentReminder {
  id: string;
  title: string;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
}

interface PaymentRemindersWidgetProps {
  onOpenReminders?: () => void;
}

export function PaymentRemindersWidget({ onOpenReminders }: PaymentRemindersWidgetProps) {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const response = await fetch("/api/budget/reminders");
        if (response.ok) {
          const data: Array<Record<string, unknown>> = await response.json();
          setReminders(
            data.map((r) => ({
              id: r.id as string,
              title: r.title as string,
              amount: r.amount as number,
              dueDate: new Date(r.dueDate as string),
              isPaid: r.isPaid as boolean,
            }))
          );
        }
      } catch (error) {
        console.error("Error loading reminders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReminders();
    // Odśwież co 5 minut
    const interval = setInterval(loadReminders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const overdueReminders = reminders.filter((r) => !r.isPaid && isPast(r.dueDate));
  const upcomingReminders = reminders.filter((r) => !r.isPaid && isFuture(r.dueDate));

  const totalOverdue = overdueReminders.reduce((sum, r) => sum + r.amount, 0);
  const totalUpcoming = upcomingReminders.reduce((sum, r) => sum + r.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Przypomnienia płatności
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Ładowanie...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Przypomnienia płatności
          </CardTitle>
          {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
            <Badge variant="secondary">
              {overdueReminders.length + upcomingReminders.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zaległe */}
        {overdueReminders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
              <AlertCircle className="h-4 w-4" />
              Zaległe ({overdueReminders.length})
            </div>
            <div className="space-y-2 pl-6">
              {overdueReminders.slice(0, 3).map((reminder) => (
                <div key={reminder.id} className="text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{reminder.title}</span>
                    <span className="text-red-600 font-bold">{reminder.amount} zł</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(reminder.dueDate, "d MMM yyyy", { locale: pl })}
                  </div>
                </div>
              ))}
              {overdueReminders.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  i {overdueReminders.length - 3} więcej...
                </div>
              )}
            </div>
            {overdueReminders.length > 0 && (
              <div className="text-sm font-semibold text-red-600 mt-2">
                Razem zaległych: {totalOverdue.toFixed(2)} zł
              </div>
            )}
          </div>
        )}

        {/* Nadchodzące */}
        {upcomingReminders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
              <Calendar className="h-4 w-4" />
              Nadchodzące ({upcomingReminders.length})
            </div>
            <div className="space-y-2 pl-6">
              {upcomingReminders.slice(0, 3).map((reminder) => (
                <div key={reminder.id} className="text-sm">
                  <div className="flex justify-between items-start">
                    <span className="font-medium">{reminder.title}</span>
                    <span className="text-amber-600 font-bold">{reminder.amount} zł</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(reminder.dueDate, "d MMM yyyy", { locale: pl })}
                  </div>
                </div>
              ))}
              {upcomingReminders.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  i {upcomingReminders.length - 3} więcej...
                </div>
              )}
            </div>
            {upcomingReminders.length > 0 && (
              <div className="text-sm font-semibold text-amber-600 mt-2">
                Razem nadchodzących: {totalUpcoming.toFixed(2)} zł
              </div>
            )}
          </div>
        )}

        {/* Brak przypomnień */}
        {reminders.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Brak przypomnień o płatnościach</p>
          </div>
        )}

        {/* Przycisk */}
        {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
          <Button onClick={onOpenReminders} variant="outline" className="w-full" size="sm">
            Zarządzaj przypomnień
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


