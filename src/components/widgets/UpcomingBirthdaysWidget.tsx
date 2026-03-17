"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake } from "lucide-react";

interface UpcomingBirthday {
  id: string;
  userId: string;
  name: string;
  date: Date;
  age: number;
  color: string;
  avatar: string | null;
  daysUntil: number;
}

interface UpcomingBirthdaysWidgetProps {
  birthdays: UpcomingBirthday[];
}

export function UpcomingBirthdaysWidget({ birthdays }: UpcomingBirthdaysWidgetProps) {
  if (birthdays.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5" />
            Nadchodzące urodziny
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Cake className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak nadchodzących urodzin</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5" />
          Nadchodzące urodziny
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {birthdays.map((birthday) => {
          const isToday = birthday.daysUntil === 0;
          const isTomorrow = birthday.daysUntil === 1;

          return (
            <div
              key={birthday.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              style={{
                borderLeft: `4px solid ${birthday.color}`,
                backgroundColor: isToday ? `${birthday.color}10` : undefined,
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={birthday.avatar || undefined} />
                <AvatarFallback
                  style={{ backgroundColor: birthday.color }}
                  className="text-white"
                >
                  {birthday.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {birthday.name}
                  {isToday && (
                    <Badge variant="default" className="text-xs">
                      🎂 Dziś!
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
                    ? `Kończy ${birthday.age} lat`
                    : isTomorrow
                    ? `Za 1 dzień - ${birthday.age} lat`
                    : `Za ${birthday.daysUntil} dni - ${birthday.age} lat`}
                </div>
              </div>

              <div className="text-xl">🎉</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

