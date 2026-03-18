"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart } from "lucide-react";
import type { AnniversaryType } from "@prisma/client";
import {
  anniversaryTypeIcons,
  anniversaryTypeLabels,
} from "@/lib/anniversaries";

interface UpcomingAnniversary {
  id: string;
  title: string;
  date: Date;
  type: AnniversaryType;
  yearsAgo: number;
  color: string;
  daysUntil: number;
}

interface UpcomingAnniversariesWidgetProps {
  anniversaries: UpcomingAnniversary[];
}

export function UpcomingAnniversariesWidget({
  anniversaries,
}: UpcomingAnniversariesWidgetProps) {
  if (anniversaries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Nadchodzące rocznice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Heart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Brak nadchodzących rocznic</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Nadchodzące rocznice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {anniversaries.map((anniversary) => {
          const isToday = anniversary.daysUntil === 0;
          const isTomorrow = anniversary.daysUntil === 1;
          const icon = anniversaryTypeIcons[anniversary.type];
          const label = anniversaryTypeLabels[anniversary.type];

          // Specjalne wiadomości dla okrągłych rocznic
          const specialYears = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60];
          const isSpecial = specialYears.includes(anniversary.yearsAgo);

          return (
            <div
              key={anniversary.id}
              className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              style={{
                borderLeft: `4px solid ${anniversary.color}`,
                backgroundColor: isToday ? `${anniversary.color}10` : undefined,
              }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${anniversary.color}20` }}
              >
                {icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  <span className="truncate">{anniversary.title}</span>
                  {isToday && (
                    <Badge variant="default" className="text-xs">
                      💝 Dziś!
                    </Badge>
                  )}
                  {isTomorrow && (
                    <Badge variant="secondary" className="text-xs">
                      Jutro
                    </Badge>
                  )}
                  {isSpecial && (
                    <Badge variant="outline" className="text-xs">
                      🎊 {anniversary.yearsAgo} lat!
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {label} • {anniversary.yearsAgo === 0 ? "Dzisiaj po raz pierwszy" :
                   anniversary.yearsAgo === 1 ? "1 rok temu" :
                   anniversary.yearsAgo < 5 ? `${anniversary.yearsAgo} lata temu` :
                   `${anniversary.yearsAgo} lat temu`}
                  {!isToday && ` • ${isTomorrow ? "Za 1 dzień" : `Za ${anniversary.daysUntil} dni`}`}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

