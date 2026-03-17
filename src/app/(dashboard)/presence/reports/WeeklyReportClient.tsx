"use client";

import { useState, useEffect, useCallback } from "react";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { pl } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, BarChart3, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface WeeklyReport {
  summary: {
    weekStart: string;
    weekEnd: string;
    weekLabel: string;
    totalUsers: number;
    totalEvents: number;
    totalZones: number;
  };
  userReports: Array<{
    userId: string;
    userName: string;
    userColor: string;
    summary: {
      totalEntries: number;
      totalExits: number;
      totalEvents: number;
    };
    zoneStats: Array<{
      zoneName: string;
      zoneType: string;
      entries: number;
      exits: number;
      totalHours: number;
    }>;
    dailyStats: Array<{
      date: string;
      dayName: string;
      totalEvents: number;
      entries: number;
      exits: number;
    }>;
  }>;
}

export function WeeklyReportClient() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Pobierz raport
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/geofence/reports/weekly?weekStart=${format(weekStart, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        toast.error("Nie udało się pobrać raportu");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Eksport do CSV
  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/geofence/export?startDate=${format(weekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `raport-tygodniowy-${format(weekStart, "yyyy-MM-dd")}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Raport wyeksportowany");
      } else {
        toast.error("Nie udało się wyeksportować raportu");
      }
    } catch (error) {
      toast.error("Wystąpił błąd");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Raporty Tygodniowe</h1>
          <p className="text-muted-foreground mt-2">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Raporty Tygodniowe</h1>
          <p className="text-muted-foreground mt-2">Brak danych do wyświetlenia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Raporty Tygodniowe</h1>
        <p className="text-muted-foreground mt-2">
          Statystyki obecności i geofencingu dla całego gospodarstwa
        </p>
      </div>

      {/* Nawigacja tygodniowa */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-xl font-semibold">{report.summary.weekLabel}</p>
              <p className="text-sm text-muted-foreground">
                {format(weekStart, "d MMMM", { locale: pl })} - {format(weekEnd, "d MMMM yyyy", { locale: pl })}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              disabled={currentWeek > new Date()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Podsumowanie */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Łączne Wydarzenia</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {report.summary.totalUsers} użytkowników
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktywne Strefy</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalZones}</div>
            <p className="text-xs text-muted-foreground">stref geofencing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Akcje</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Eksport CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Raporty użytkowników */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Użytkownicy</h2>
        {report.userReports.map((userReport) => (
          <Card key={userReport.userId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: userReport.userColor }}
                />
                {userReport.userName}
              </CardTitle>
              <CardDescription>
                {userReport.summary.totalEvents} wydarzeń •{" "}
                {userReport.summary.totalEntries} wejść •{" "}
                {userReport.summary.totalExits} wyjść
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statystyki stref */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Czas w strefach
                </h3>
                <div className="space-y-2">
                  {userReport.zoneStats
                    .filter((z) => z.totalHours > 0)
                    .sort((a, b) => b.totalHours - a.totalHours)
                    .map((zone) => (
                      <div key={zone.zoneName} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{zone.zoneName}</span>
                          <span className="font-medium">{zone.totalHours}h</span>
                        </div>
                        <Progress
                          value={(zone.totalHours / 168) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                </div>
              </div>

              {/* Statystyki dzienne */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Aktywność dzienna
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {userReport.dailyStats.map((day) => (
                    <div
                      key={day.date}
                      className="text-center p-2 rounded border"
                    >
                      <p className="text-xs text-muted-foreground capitalize">
                        {format(new Date(day.date), "EEE", { locale: pl })}
                      </p>
                      <p className="text-xl font-bold">{day.totalEvents}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
