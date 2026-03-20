"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  Trophy,
  Medal,
  Star,
  Crown,
  Flame,
  Target,
  Zap,
  Award,
  TrendingUp,
  Gift,
  Plus,
  Check,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Badge, UserBadge } from "@prisma/client";
import { LevelProgressCard } from "@/components/gamification/LevelProgressCard";
import { StreakCalendarCard } from "@/components/gamification/StreakCalendarCard";
import { DailyQuestsCard } from "@/components/gamification/DailyQuestsCard";
import { StatCard } from "@/components/gamification/StatCard";
import { RecentAchievementsCard } from "@/components/gamification/RecentAchievementsCard";
import { WeeklyChallenges } from "@/components/gamification/WeeklyChallenges";
import { TodayProgressCard } from "@/components/gamification/TodayProgressCard";
import { AchievementShowcase } from "@/components/gamification/AchievementShowcase";
import { LeaderboardTabs } from "@/components/gamification/LeaderboardTabs";
import { StatsDashboard } from "@/components/gamification/StatsDashboard";

type MemberWithStats = {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
  completedTasks: number;
  badges: (UserBadge & { badge: Badge })[];
  points: number;
  availablePoints: number;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
};

type RecentBadge = UserBadge & {
  badge: Badge;
  user: { id: string; name: string | null; color: string };
};

type Reward = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  pointsCost: number;
  isActive: boolean;
  claimedBy: {
    id: string;
    claimedAt: Date;
    fulfilled: boolean;
    user: { id: string; name: string | null; color: string };
  }[];
};

interface GamificationClientProps {
  members: MemberWithStats[];
  allBadges: Badge[];
  recentBadges: RecentBadge[];
  rewards: Reward[];
  currentUserId: string;
}

// Ikony dla odznak
const badgeIcons: Record<string, React.ElementType> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  crown: Crown,
  flame: Flame,
  target: Target,
  zap: Zap,
  award: Award,
};


export function GamificationClient({
  members,
  allBadges,
  recentBadges,
  rewards: initialRewards,
  currentUserId,
}: GamificationClientProps) {
  const [activeTab, setActiveTab] = useState("ranking");
  const [rewards, setRewards] = useState(initialRewards);
  const [isAddRewardOpen, setIsAddRewardOpen] = useState(false);
  const [newReward, setNewReward] = useState({ name: "", description: "", pointsCost: 100 });

  const currentUser = members.find((m) => m.id === currentUserId);
  const currentUserRank = members.findIndex((m) => m.id === currentUserId) + 1;

  const getIcon = (iconName: string) => {
    return badgeIcons[iconName] || Award;
  };

  const handleAddReward = async () => {
    if (!newReward.name || !newReward.pointsCost) {
      toast.error("Podaj nazwę i koszt nagrody");
      return;
    }

    try {
      const response = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReward),
      });

      if (response.ok) {
        const reward = await response.json();
        setRewards([...rewards, { ...reward, claimedBy: [] }]);
        setIsAddRewardOpen(false);
        setNewReward({ name: "", description: "", pointsCost: 100 });
        toast.success("Nagroda została dodana");
      }
    } catch {
      toast.error("Nie udało się dodać nagrody");
    }
  };

  const handleClaimReward = async (rewardId: string) => {
    try {
      const response = await fetch(`/api/rewards/${rewardId}/claim`, {
        method: "POST",
      });

      if (response.ok) {
        const claimed = await response.json();
        setRewards(rewards.map(r =>
          r.id === rewardId
            ? { ...r, claimedBy: [...r.claimedBy, claimed] }
            : r
        ));
        toast.success("Nagroda odebrana! 🎉");
      } else {
        const error = await response.json();
        toast.error(error.error || "Nie udało się odebrać nagrody");
      }
    } catch {
      toast.error("Nie udało się odebrać nagrody");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Gamifikacja
          </h1>
          <p className="text-muted-foreground">
            Zdobywaj XP, odblokuj osiągnięcia i zdobądź nagrody!
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/achievements">
              <Award className="h-4 w-4 mr-2" />
              Osiągnięcia
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/rewards">
              <Gift className="h-4 w-4 mr-2" />
              Nagrody
            </a>
          </Button>
        </div>
      </div>

      {/* Main Stats Cards */}
      {currentUser && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />}
              label="Poziom"
              value={currentUser.level}
              subtitle={`${currentUser.xp} XP`}
              color="yellow"
            />

            <StatCard
              icon={<Flame className="h-8 w-8 text-orange-500" />}
              label="Seria"
              value={currentUser.currentStreak}
              subtitle={`Najdłuższa: ${currentUser.longestStreak}`}
              color="orange"
            />

            <StatCard
              icon={<Trophy className="h-8 w-8 text-purple-500" />}
              label="Ranking"
              value={`#${currentUserRank}`}
              subtitle={`${currentUser.points} punktów`}
              color="purple"
            />

            <StatCard
              icon={<Target className="h-8 w-8 text-blue-500" />}
              label="Zadania"
              value={currentUser.completedTasks}
              subtitle="ukończone"
              color="blue"
            />
          </div>

          {/* Progress Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <LevelProgressCard
              level={currentUser.level}
              xp={currentUser.xp}
            />
            <StreakCalendarCard
              currentStreak={currentUser.currentStreak}
              longestStreak={currentUser.longestStreak}
            />
            <TodayProgressCard />
          </div>

          {/* Daily & Weekly Challenges */}
          <div className="grid gap-4 lg:grid-cols-2">
            <DailyQuestsCard
              isAdmin={currentUser.id === currentUserId}
            />
            <WeeklyChallenges
              currentUserId={currentUser.id}
              isAdmin={currentUser.id === currentUserId}
            />
          </div>

          {/* Achievement Showcase */}
          <AchievementShowcase />

          {/* Recent Achievements */}
          <RecentAchievementsCard />
        </>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ranking">
            <TrendingUp className="h-4 w-4 mr-2" />
            Ranking
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Target className="h-4 w-4 mr-2" />
            Statystyki
          </TabsTrigger>
          <TabsTrigger value="badges">
            <Medal className="h-4 w-4 mr-2" />
            Odznaki
          </TabsTrigger>
          <TabsTrigger value="rewards">
            <Gift className="h-4 w-4 mr-2" />
            Nagrody
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Zap className="h-4 w-4 mr-2" />
            Ostatnie osiągnięcia
          </TabsTrigger>
        </TabsList>

        {/* Ranking - Nowy komponent */}
        <TabsContent value="ranking" className="mt-4">
          <LeaderboardTabs />
        </TabsContent>

        {/* Statystyki - Nowy dashboard */}
        <TabsContent value="stats" className="mt-4">
          <StatsDashboard />
        </TabsContent>

        {/* Wszystkie odznaki */}
        <TabsContent value="badges" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allBadges.map((badge) => {
              const Icon = getIcon(badge.icon || "Award");
              const earnedByUser = currentUser?.badges.some((ub) => ub.badgeId === badge.id);

              return (
                <Card
                  key={badge.id}
                  className={cn(
                    "transition-all",
                    earnedByUser
                      ? "border-primary bg-primary/5"
                      : "opacity-60 grayscale"
                  )}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        earnedByUser ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{badge.name}</h3>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <div className="flex items-center gap-1 mt-2 text-yellow-600">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-sm font-medium">{badge.points} pkt</span>
                        </div>
                      </div>
                      {earnedByUser && (
                        <BadgeUI className="bg-green-500">Zdobyta</BadgeUI>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {allBadges.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Medal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak dostępnych odznak</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Nagrody */}
        <TabsContent value="rewards" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold">Dostępne nagrody</h2>
              {currentUser && (
                <p className="text-sm text-muted-foreground">
                  Masz <span className="font-bold text-yellow-600">{currentUser.availablePoints}</span> punktów do wydania
                </p>
              )}
            </div>
            <Button onClick={() => setIsAddRewardOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj nagrodę
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => {
              const canClaim = currentUser && currentUser.availablePoints >= reward.pointsCost;
              const alreadyClaimed = reward.claimedBy.some(c => c.user.id === currentUserId);

              return (
                <Card key={reward.id} className={cn(
                  "transition-all",
                  alreadyClaimed && "opacity-60"
                )}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white">
                        <Gift className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{reward.name}</h3>
                        {reward.description && (
                          <p className="text-sm text-muted-foreground">{reward.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-yellow-600">
                          <Star className="h-3 w-3 fill-current" />
                          <span className="text-sm font-medium">{reward.pointsCost} pkt</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4">
                      {alreadyClaimed ? (
                        <Button variant="outline" disabled className="w-full">
                          <Check className="h-4 w-4 mr-2" />
                          Odebrano
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleClaimReward(reward.id)}
                          disabled={!canClaim}
                          className="w-full"
                        >
                          <Gift className="h-4 w-4 mr-2" />
                          {canClaim ? "Odbierz nagrodę" : "Brak punktów"}
                        </Button>
                      )}
                    </div>
                    {reward.claimedBy.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Odebrane przez:
                        </p>
                        <div className="flex -space-x-2">
                          {reward.claimedBy.map((c) => (
                            <Avatar key={c.id} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback
                                style={{ backgroundColor: c.user.color }}
                                className="text-white text-xs"
                              >
                                {c.user.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {rewards.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak nagród do odebrania</p>
                <Button variant="outline" className="mt-4" onClick={() => setIsAddRewardOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj pierwszą nagrodę
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Ostatnie osiągnięcia */}
        <TabsContent value="recent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ostatnie zdobyte odznaki</CardTitle>
              <CardDescription>
                Najnowsze osiągnięcia w Twoim gospodarstwie
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentBadges.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak ostatnich osiągnięć</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBadges.map((ub) => {
                    const Icon = getIcon(ub.badge.icon || "Award");
                    return (
                      <div key={ub.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/30">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback
                                style={{ backgroundColor: ub.user.color }}
                                className="text-white text-xs"
                              >
                                {ub.user.name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{ub.user.name}</span>
                            <span className="text-muted-foreground">zdobył/a</span>
                            <span className="font-medium">{ub.badge.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(ub.earnedAt), "d MMMM yyyy, HH:mm", { locale: pl })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-medium">+{ub.badge.points}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog dodawania nagrody */}
      <Dialog open={isAddRewardOpen} onOpenChange={setIsAddRewardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj nową nagrodę</DialogTitle>
            <DialogDescription>
              Utwórz nagrodę, którą domownicy będą mogli odbierać za punkty
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reward-name">Nazwa nagrody</Label>
              <Input
                id="reward-name"
                placeholder="np. Wybór filmu na wieczór"
                value={newReward.name}
                onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-description">Opis (opcjonalnie)</Label>
              <Textarea
                id="reward-description"
                placeholder="Opisz na czym polega nagroda..."
                value={newReward.description}
                onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reward-points">Koszt punktowy</Label>
              <Input
                id="reward-points"
                type="number"
                min={1}
                value={newReward.pointsCost}
                onChange={(e) => setNewReward({ ...newReward, pointsCost: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddRewardOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddReward}>
              Dodaj nagrodę
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

