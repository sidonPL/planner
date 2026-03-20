"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  Award,
  Flame,
  Clock,
  Star,
  ChefHat,
  Trophy,
  Calendar,
  BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import Link from "next/link";

type RecipeSummary = {
  id: string;
  name: string;
  image: string | null;
};

interface CookingStatsData {
  stats: {
    totalRecipesCooked: number;
    uniqueRecipesCooked: number;
    currentStreak: number;
    longestStreak: number;
    totalCookingTime: number;
    totalCookingHours: number;
    favoriteCategory: string | null;
    xp: number;
    level: number;
  };
  mostCookedRecipes: Array<{
    recipe: RecipeSummary;
    count: number;
  }>;
  favoriteCategories: Array<{
    category: string;
    count: number;
  }>;
  topRatedRecipes: Array<{
    recipe: RecipeSummary;
    rating: number;
    cookedAt: string;
  }>;
  recentlyCooked: Array<{
    recipe: RecipeSummary;
    rating: number;
    cookedAt: string;
  }>;
  achievements: Array<{
    id: string;
    unlockedAt: string;
    achievement: {
      name: string;
      description: string;
      icon: string;
      xpReward: number;
    };
  }>;
}

const categoryLabels: Record<string, string> = {
  BREAKFAST: "Śniadania",
  LUNCH: "Obiady",
  DINNER: "Kolacje",
  SNACK: "Przekąski",
  DESSERT: "Desery",
  DRINK: "Napoje",
  OTHER: "Inne",
};

export function CookingStatsCard() {
  const [data, setData] = useState<CookingStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/recipes/cooking-stats");
      if (response.ok) {
        const statsData = await response.json();
        setData(statsData);
      }
    } catch (error) {
      console.error("Error loading cooking stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { stats, mostCookedRecipes, favoriteCategories, topRatedRecipes, recentlyCooked, achievements } = data;

  return (
    <div className="space-y-6">
      {/* Główne statystyki */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ugotowane przepisy</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipesCooked}</div>
            <p className="text-xs text-muted-foreground">
              {stats.uniqueRecipesCooked} unikalnych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obecny streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} 🔥</div>
            <p className="text-xs text-muted-foreground">
              Rekord: {stats.longestStreak} dni
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Czas w kuchni</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCookingHours}h</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCookingTime} minut łącznie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Poziom</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Lvl {stats.level}</div>
            <p className="text-xs text-muted-foreground">
              {stats.xp} XP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zakładki z szczegółami */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="history">Historia</TabsTrigger>
          <TabsTrigger value="top">Top przepisy</TabsTrigger>
          <TabsTrigger value="categories">Kategorie</TabsTrigger>
          <TabsTrigger value="achievements">Osiągnięcia</TabsTrigger>
        </TabsList>

        {/* Historia gotowania */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Ostatnio gotowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentlyCooked.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nie ugotowałeś jeszcze żadnego przepisu
                  </p>
                ) : (
                  recentlyCooked.map((item, idx) => (
                    <Link
                      key={idx}
                      href={`/recipes/${item.recipe.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      {item.recipe.image ? (
                        <div
                          className="w-12 h-12 rounded bg-cover bg-center flex-shrink-0"
                          style={{ backgroundImage: `url(${item.recipe.image})` }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.recipe.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < item.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.cookedAt), {
                              addSuffix: true,
                              locale: pl,
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Najczęściej gotowane */}
        <TabsContent value="top" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Najczęściej gotowane
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mostCookedRecipes.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/recipes/${item.recipe.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold flex-shrink-0">
                      #{idx + 1}
                    </div>
                    {item.recipe.image ? (
                      <div
                        className="w-12 h-12 rounded bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url(${item.recipe.image})` }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <ChefHat className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Ugotowano {item.count}x
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Najwyżej ocenione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topRatedRecipes.map((item, idx) => (
                  <Link
                    key={idx}
                    href={`/recipes/${item.recipe.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    {item.recipe.image ? (
                      <div
                        className="w-12 h-12 rounded bg-cover bg-center flex-shrink-0"
                        style={{ backgroundImage: `url(${item.recipe.image})` }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <ChefHat className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.recipe.name}</p>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < item.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Kategorie */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ulubione kategorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {favoriteCategories.map((item, idx) => {
                  const total = favoriteCategories.reduce((sum, cat) => sum + cat.count, 0);
                  const percentage = Math.round((item.count / total) * 100);

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {categoryLabels[item.category] || item.category}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Osiągnięcia */}
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Odblokowane osiągnięcia ({achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Brak osiągnięć - zacznij gotować!
                  </p>
                ) : (
                  achievements.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="text-3xl">{item.achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{item.achievement.name}</p>
                          <Badge variant="secondary" className="text-xs">
                            +{item.achievement.xpReward} XP
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.achievement.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Zdobyto{" "}
                          {formatDistanceToNow(new Date(item.unlockedAt), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

