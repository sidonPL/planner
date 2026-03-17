"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface UpcomingNameDay {
  userId: string;
  name: string;
  date: Date;
  color: string;
  avatar: string | null;
  daysUntil: number;
}

interface UpcomingNameDaysWidgetProps {
  nameDays: UpcomingNameDay[];
}

export function UpcomingNameDaysWidget({ nameDays }: UpcomingNameDaysWidgetProps) {
  if (nameDays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Nadchodzące imieniny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak nadchodzących imienin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Nadchodzące imieniny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {nameDays.map((nameDay, index) => {
          const isToday = nameDay.daysUntil === 0;
          const isTomorrow = nameDay.daysUntil === 1;

          return (
            <div
              key={`${nameDay.userId}-${index}`}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              style={{
                borderLeft: `4px solid ${nameDay.color}`,
                backgroundColor: isToday ? `${nameDay.color}10` : undefined,
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={nameDay.avatar || undefined} />
                <AvatarFallback
                  style={{ backgroundColor: nameDay.color }}
                  className="text-white"
                >
                  {nameDay.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {nameDay.name}
                  {isToday && (
                    <Badge variant="default" className="text-xs">
                      ✨ Dziś!
                    </Badge>
                  )}
                  {isTomorrow && (
                    <Badge variant="secondary" className="text-xs">
                      Jutro
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isToday
                    ? "Imieniny"
                    : isTomorrow
                    ? "Za 1 dzień"
                    : `Za ${nameDay.daysUntil} dni`}
                </div>
              </div>

              <div className="text-xl">🎊</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

