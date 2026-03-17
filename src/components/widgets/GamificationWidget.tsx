"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Star, Medal, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type BadgeType = {
  id: string;
  name: string;
  points: number;
};

type UserBadgeWithBadge = {
  id: string;
  badge: BadgeType;
};

type LeaderboardMember = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
  points: number;
  completedTasks: number;
  badges: UserBadgeWithBadge[];
};

interface GamificationWidgetProps {
  userId?: string;
}

export function GamificationWidget({ userId }: GamificationWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<{
    totalPoints: number;
    taskPoints: number;
    badgePoints: number;
    totalBadges: number;
    completedTasks: number;
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardMember[]>([]);
  const [userRank, setUserRank] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      try {
        // Pobierz statystyki użytkownika i leaderboard
        const [statsResponse, leaderboardResponse] = await Promise.all([
          userId ? fetch(`/api/badges/user/${userId}`) : Promise.resolve(null),
          fetch("/api/leaderboard"),
        ]);

        if (statsResponse) {
          const statsData = await statsResponse.json();
          setUserStats(statsData.stats);
        }

        if (leaderboardResponse.ok) {
          const leaderboardData = await leaderboardResponse.json();
          setLeaderboard(leaderboardData);

          // Znajdź pozycję użytkownika
          if (userId) {
            const rank = leaderboardData.findIndex((m: LeaderboardMember) => m.id === userId);
            setUserRank(rank + 1);
          }
        }
      } catch (error) {
        console.error("Error fetching gamification data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Gamifikacja
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Znajdź najbliższą odznakę do zdobycia
  const nextBadgeThreshold = [10, 50, 100].find((threshold) =>
    userStats && userStats.completedTasks < threshold
  );

  const progressToNextBadge = nextBadgeThreshold && userStats
    ? (userStats.completedTasks / nextBadgeThreshold) * 100
    : 0;

  // Top 3 z leaderboard
  const top3 = leaderboard.slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Gamifikacja
            </CardTitle>
            <CardDescription>
              Twoje punkty i pozycja w rankingu
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/gamification">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statystyki użytkownika */}
        {userStats && (
          <div className="space-y-4">
            {/* Punkty */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
              <div>
                <p className="text-sm text-muted-foreground">Twoje punkty</p>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-5 w-5 text-yellow-600 fill-current" />
                  <span className="text-2xl font-bold">{userStats.totalPoints}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Pozycja</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold">#{userRank}</span>
                </div>
              </div>
            </div>

            {/* Szczegóły punktów */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Zadania</p>
                <p className="text-lg font-semibold">{userStats.taskPoints}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Odznaki</p>
                <p className="text-lg font-semibold">{userStats.badgePoints}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">
                  <Medal className="h-3 w-3 inline" />
                </p>
                <p className="text-lg font-semibold">{userStats.totalBadges}</p>
              </div>
            </div>

            {/* Postęp do następnej odznaki */}
            {nextBadgeThreshold && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Następna odznaka: {nextBadgeThreshold} zadań
                  </span>
                  <span className="font-medium">
                    {userStats.completedTasks}/{nextBadgeThreshold}
                  </span>
                </div>
                <Progress value={progressToNextBadge} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Top 3 Ranking */}
        {top3.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Top 3 Ranking</h4>
            <div className="space-y-2">
              {top3.map((member, index) => {
                const rank = index + 1;
                const rankColors = [
                  "bg-yellow-500", // 1st - złoto
                  "bg-gray-400",   // 2nd - srebro
                  "bg-amber-600",  // 3rd - brąz
                ];

                return (
                  <div
                    key={`${member.id}-${index}`}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      member.id === userId && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
                      rankColors[rank - 1]
                    )}>
                      {rank}
                    </div>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={member.avatar || undefined} />
                      <AvatarFallback
                        style={{ backgroundColor: member.color }}
                        className="text-white text-xs"
                      >
                        {member.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.completedTasks} zadań
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-600">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-sm font-bold">{member.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Link do pełnej strony */}
        <Button variant="outline" className="w-full" asChild>
          <Link href="/gamification">
            <Trophy className="h-4 w-4 mr-2" />
            Zobacz pełny ranking
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

