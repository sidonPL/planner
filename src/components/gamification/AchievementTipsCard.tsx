'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Target, Utensils, Flame, Star, ShoppingCart, Pizza, Calendar, Trophy, ChefHat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const achievementTips = [
  {
    icon: <Utensils className="h-5 w-5 text-blue-500" />,
    title: 'Gotuj regularnie',
    description: 'Oceniaj przepisy po ugotowaniu, aby odblokowywać osiągnięcia kulinarne',
    category: 'RECIPES',
    color: 'blue',
  },
  {
    icon: <Flame className="h-5 w-5 text-orange-500" />,
    title: 'Buduj serie',
    description: 'Gotuj każdego dnia, aby zwiększyć swój streak i zdobywać bonusowe XP',
    category: 'STREAK',
    color: 'orange',
  },
  {
    icon: <Target className="h-5 w-5 text-green-500" />,
    title: 'Ukończ zadania',
    description: 'Wykonuj zadania z listy, aby odblokowywać osiągnięcia związane z produktywnością',
    category: 'TASKS',
    color: 'green',
  },
  {
    icon: <Star className="h-5 w-5 text-yellow-500" />,
    title: 'Eksperymentuj',
    description: 'Próbuj różnych kategorii przepisów i odkrywaj nowe osiągnięcia',
    category: 'RECIPES',
    color: 'yellow',
  },
  {
    icon: <Pizza className="h-5 w-5 text-red-500" />,
    title: 'Mistrz Pizzy',
    description: 'Twórz własne przepisy na pizzę, aby zdobyć serię osiągnięć Bronze → Silver → Gold → Platinum',
    category: 'RECIPES',
    color: 'red',
  },
  {
    icon: <ShoppingCart className="h-5 w-5 text-purple-500" />,
    title: 'Król Zakupów',
    description: 'Ukończ 50 zakupów, aby zdobyć osiągnięcie "Król Zakupów". Każde ukończenie listy to krok bliżej!',
    category: 'SHOPPING',
    color: 'purple',
  },
  {
    icon: <Calendar className="h-5 w-5 text-cyan-500" />,
    title: 'Mistrz Planowania',
    description: 'Planuj posiłki regularnie na cały tydzień. Zaplanuj 100 posiłków dla osiągnięcia!',
    category: 'PLANNING',
    color: 'cyan',
  },
  {
    icon: <ChefHat className="h-5 w-5 text-pink-500" />,
    title: 'Twórca Smaków',
    description: 'Dodawaj własne przepisy do bazy. Im więcej unikalnych przepisów, tym wyższy poziom osiągnięcia!',
    category: 'RECIPES',
    color: 'pink',
  },
  {
    icon: <Trophy className="h-5 w-5 text-amber-500" />,
    title: 'Daily Quests',
    description: 'Ukończ codzienne zadania aby zdobywać dodatkowe XP. Nowe questy co 24h!',
    category: 'QUESTS',
    color: 'amber',
  },
  {
    icon: <Flame className="h-5 w-5 text-orange-600" />,
    title: 'Człowiek Nawyku',
    description: 'Utrzymaj streak przez 7, 30, 90 lub 365 dni! Każdy dzień aktywności się liczy.',
    category: 'STREAK',
    color: 'orange',
  },
];

export function AchievementTipsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Jak zdobywać osiągnięcia?
        </CardTitle>
        <CardDescription>Wskazówki, które pomogą Ci w rozwoju</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {achievementTips.map((tip, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="mt-0.5">{tip.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{tip.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {tip.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{tip.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Wskazówka:</strong> Sprawdzaj zakładkę &ldquo;Prawie tam!&rdquo; aby zobaczyć, które
            osiągnięcia jesteś najbliżej zdobycia!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

