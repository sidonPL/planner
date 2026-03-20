import {
  Trophy,
  Pizza,
  Flame,
  ShoppingCart,
  Calendar,
  ChefHat,
  Star,
  Utensils,
  Coffee,
  Cookie,
  Salad,
  Fish,
  Beef,
  Apple,
  Cake,
  IceCream,
  Wine,
  Beer,
  CheckCircle,
  Zap,
  Heart,
  Sparkles,
  TrendingUp,
  Users,
  Home,
  Clock,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { createElement, useMemo } from 'react';

/**
 * Mapowanie emoji/string icons na komponenty Lucide React
 */
const iconMap: Record<string, LucideIcon> = {
  // Podstawowe osiągnięcia
  '🏆': Trophy,
  '⭐': Star,
  '✨': Sparkles,

  // Jedzenie i gotowanie
  '🍕': Pizza,
  '👨‍🍳': ChefHat,
  '🍽️': Utensils,
  '☕': Coffee,
  '🍪': Cookie,
  '🥗': Salad,
  '🐟': Fish,
  '🥩': Beef,
  '🍎': Apple,
  '🎂': Cake,
  '🍦': IceCream,
  '🍷': Wine,
  '🍺': Beer,

  // Streak i postęp
  '🔥': Flame,
  '📈': TrendingUp,
  '⚡': Zap,
  '💖': Heart,

  // Zadania i organizacja
  '✅': CheckCircle,
  '📋': ListChecks,
  '🕐': Clock,
  '📅': Calendar,

  // Zakupy i dom
  '🛒': ShoppingCart,
  '🏠': Home,
  '👥': Users,

  // Fallback
  'default': Trophy,
};

/**
 * Zwraca komponent ikony Lucide dla danego emoji/stringa
 */
export function getAchievementIcon(iconString: string): LucideIcon {
  return iconMap[iconString] || iconMap['default'];
}

/**
 * Renderuje ikonę osiągnięcia jako komponent React
 */
export function AchievementIcon({
  icon,
  className = "h-6 w-6",
  unlocked = false
}: {
  icon: string;
  className?: string;
  unlocked?: boolean;
}) {
  const finalClassName = useMemo(() =>
    `${className} ${unlocked ? 'text-yellow-500' : 'text-muted-foreground'}`,
    [className, unlocked]
  );

  return createElement(getAchievementIcon(icon), { className: finalClassName });
}

/**
 * Renderuje dużą ikonę osiągnięcia (dla modali, kart, etc.)
 */
export function AchievementIconLarge({
  icon,
  unlocked = false,
  tier
}: {
  icon: string;
  unlocked?: boolean;
  tier?: number | null;
}) {
  // Kolory zależne od tier
  const tierColor = useMemo(() => {
    if (!tier || !unlocked) return 'text-muted-foreground';

    switch (tier) {
      case 1: return 'text-amber-700'; // Bronze
      case 2: return 'text-slate-400'; // Silver
      case 3: return 'text-yellow-500'; // Gold
      case 4: return 'text-purple-500'; // Platinum
      default: return 'text-yellow-500';
    }
  }, [tier, unlocked]);

  const containerClassName = useMemo(() =>
    `relative p-4 rounded-full bg-gradient-to-br ${
      unlocked 
        ? 'from-yellow-100 to-orange-100 dark:from-yellow-950 dark:to-orange-950' 
        : 'from-muted/50 to-muted'
    }`,
    [unlocked]
  );

  return (
    <div className={containerClassName}>
      {createElement(getAchievementIcon(icon), { className: `h-12 w-12 ${tierColor}` })}
      {unlocked && (
        <div className="absolute -top-1 -right-1">
          <CheckCircle className="h-6 w-6 text-green-500 fill-white dark:fill-slate-950" />
        </div>
      )}
    </div>
  );
}

