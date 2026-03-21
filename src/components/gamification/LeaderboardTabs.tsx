"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LeaderboardPeriod = "WEEKLY" | "MONTHLY" | "ALL_TIME";

interface LeaderboardEntry {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
    color: string;
    level: number;
    activeTitle?: string | null;
    activeBadge?: {
      id: string;
      name: string;
      icon: string;
    } | null;
  };
  xpEarned: number;
  rank: number;
  tasksCompleted?: number;
  recipesAdded?: number;
  achievementsUnlocked?: number;
}

interface LeaderboardTabsProps {
  householdId?: string; // Reserved for future use
}

export function LeaderboardTabs({ }: LeaderboardTabsProps = {}) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("WEEKLY");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Użyj seasonal endpoint dla WEEKLY i MONTHLY
      let url: string;
      if (period === "ALL_TIME") {
        url = `/api/gamification/leaderboard?period=${period}`;
      } else {
        url = `/api/gamification/leaderboard/seasonal?period=${period}&offset=0`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        console.error("Failed to fetch leaderboard");
        return;
      }

      const data = await res.json();

      // Seasonal endpoint zwraca inną strukturę
      if (period !== "ALL_TIME") {
        setLeaderboard(data.entries || []);
        setCurrentUserRank(data.userEntry?.rank || null);
      } else {
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank);
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Nie udało się pobrać rankingu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-500";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-muted";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="WEEKLY" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Tydzień
            </TabsTrigger>
            <TabsTrigger value="MONTHLY" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Miesiąc
            </TabsTrigger>
            <TabsTrigger value="ALL_TIME" className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              Ogólny
            </TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Brak danych dla tego okresu</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-all",
                      entry.rank <= 3 ? getRankBadge(entry.rank) : "bg-muted/30",
                      currentUserRank === entry.rank && "ring-2 ring-primary"
                    )}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8">
                      {getRankIcon(entry.rank) || (
                        <span className="text-sm font-semibold text-muted-foreground">
                          #{entry.rank}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.user.avatar || undefined} />
                      <AvatarFallback style={{ backgroundColor: entry.user.color }}>
                        {entry.user.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>

                    {/* User info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        entry.rank <= 3 && "text-white"
                      )}>
                        {entry.user.name || "Użytkownik"}
                        {entry.user.activeTitle && (
                          <span className="ml-2 text-xs opacity-75">
                            {entry.user.activeTitle}
                          </span>
                        )}
                        {entry.user.activeBadge && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs opacity-90">
                            <span>{entry.user.activeBadge.icon || '🏅'}</span>
                            <span>{entry.user.activeBadge.name}</span>
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <p className={cn(
                          entry.rank <= 3 ? "text-white/80" : "text-muted-foreground"
                        )}>
                          Poziom {entry.user.level}
                        </p>
                        {/* Dodatkowe statystyki dla seasonal */}
                        {period !== "ALL_TIME" && (entry.tasksCompleted || entry.recipesAdded || entry.achievementsUnlocked) && (
                          <div className="flex items-center gap-2 text-xs">
                            {entry.tasksCompleted !== undefined && entry.tasksCompleted > 0 && (
                              <span className={cn(
                                "flex items-center gap-0.5",
                                entry.rank <= 3 ? "text-white/70" : "text-muted-foreground"
                              )}>
                                ✓ {entry.tasksCompleted}
                              </span>
                            )}
                            {entry.recipesAdded !== undefined && entry.recipesAdded > 0 && (
                              <span className={cn(
                                "flex items-center gap-0.5",
                                entry.rank <= 3 ? "text-white/70" : "text-muted-foreground"
                              )}>
                                🍳 {entry.recipesAdded}
                              </span>
                            )}
                            {entry.achievementsUnlocked !== undefined && entry.achievementsUnlocked > 0 && (
                              <span className={cn(
                                "flex items-center gap-0.5",
                                entry.rank <= 3 ? "text-white/70" : "text-muted-foreground"
                              )}>
                                🏆 {entry.achievementsUnlocked}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        entry.rank <= 3 && "text-white"
                      )}>
                        {entry.xpEarned.toLocaleString()} XP
                      </p>
                      {currentUserRank === entry.rank && (
                        <Badge variant="secondary" className="mt-1">
                          Ty
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current user rank (if not in top 10) */}
            {currentUserRank && currentUserRank > 10 && (
              <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-center">
                  <span className="font-semibold">Twoja pozycja:</span> #{currentUserRank}
                </p>
              </div>
            )}

            {/* Period info */}
            <div className="mt-4 pt-4 border-t text-center text-sm text-muted-foreground">
              {period === "WEEKLY" && "Ranking odświeża się co poniedziałek o północy"}
              {period === "MONTHLY" && "Ranking odświeża się 1-go dnia miesiąca"}
              {period === "ALL_TIME" && "Ranking całościowy - suma XP od początku"}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

