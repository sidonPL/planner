'use client';

import { Star, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface XPBadgeProps {
  xp: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'rainbow';
  showIcon?: boolean;
  className?: string;
}

/**
 * Badge pokazujący ilość XP
 * Używany w TaskCard, RecipeCard, etc.
 */
export function XPBadge({
  xp,
  size = 'sm',
  variant = 'default',
  showIcon = true,
  className,
}: XPBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const variantClasses = {
    default: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    subtle: 'bg-muted text-muted-foreground border-muted',
    rainbow: 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white border-0',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  // Określ kolor na podstawie ilości XP
  const getVariantByXP = () => {
    if (variant !== 'default') return variant;
    if (xp >= 50) return 'rainbow';
    return 'default';
  };

  const finalVariant = getVariantByXP();

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-bold',
        sizeClasses[size],
        variantClasses[finalVariant],
        className
      )}
    >
      {showIcon && (
        finalVariant === 'rainbow' ? (
          <Sparkles className={iconSizes[size]} />
        ) : (
          <Star className={cn(iconSizes[size], 'fill-current')} />
        )
      )}
      +{xp} XP
    </Badge>
  );
}

