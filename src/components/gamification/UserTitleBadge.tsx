'use client';

import { Badge } from '@/components/ui/badge';
import { Crown, Star, Sparkles, Trophy, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserTitleBadgeProps {
  title: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Kolory dla różnych typów tytułów
const TITLE_COLORS: Record<string, string> = {
  // Królewskie
  król: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',
  królowa: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300',

  // Mistrzostwa
  mistrz: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
  mistrzyni: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',
  master: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300',

  // Eksperci
  expert: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  ekspert: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',
  pro: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300',

  // Legendy
  legenda: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  legend: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',
  hero: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300',

  // Czempioni
  czempion: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',
  champion: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300',

  // Magiczne
  guru: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300',
  mag: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300',
};

function getTitleColor(title: string): string {
  const lowercaseTitle = title.toLowerCase();
  for (const [key, color] of Object.entries(TITLE_COLORS)) {
    if (lowercaseTitle.includes(key)) {
      return color;
    }
  }
  return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-300'; // Domyślny kolor
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function UserTitleBadge({ title, className, size = 'md' }: UserTitleBadgeProps) {
  const colorClass = getTitleColor(title);
  const lowercaseTitle = title.toLowerCase();

  // Determine icon based on title
  let IconElement = null;
  if (lowercaseTitle.includes('król') || lowercaseTitle.includes('królowa')) {
    IconElement = <Crown className={iconSizes[size]} />;
  } else if (lowercaseTitle.includes('mistrz') || lowercaseTitle.includes('master') || lowercaseTitle.includes('czempion') || lowercaseTitle.includes('champion')) {
    IconElement = <Trophy className={iconSizes[size]} />;
  } else if (lowercaseTitle.includes('expert') || lowercaseTitle.includes('ekspert') || lowercaseTitle.includes('pro')) {
    IconElement = <Award className={iconSizes[size]} />;
  } else if (lowercaseTitle.includes('legenda') || lowercaseTitle.includes('legend') || lowercaseTitle.includes('hero')) {
    IconElement = <Star className={iconSizes[size]} />;
  } else if (lowercaseTitle.includes('guru') || lowercaseTitle.includes('mag')) {
    IconElement = <Sparkles className={iconSizes[size]} />;
  } else {
    IconElement = <Award className={iconSizes[size]} />;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        colorClass,
        sizeClasses[size],
        className
      )}
      title={`Tytuł: ${title}`}
    >
      {IconElement}
      {title}
    </Badge>
  );
}

interface UserNameWithTitleProps {
  name: string;
  title?: string | null;
  className?: string;
  titleSize?: 'sm' | 'md' | 'lg';
  showTitleFirst?: boolean;
}

/**
 * Wyświetla nazwę użytkownika z tytułem
 */
export function UserNameWithTitle({
  name,
  title,
  className,
  titleSize = 'sm',
  showTitleFirst = false,
}: UserNameWithTitleProps) {
  if (!title) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      {showTitleFirst ? (
        <>
          <UserTitleBadge title={title} size={titleSize} />
          <span>{name}</span>
        </>
      ) : (
        <>
          <span>{name}</span>
          <UserTitleBadge title={title} size={titleSize} />
        </>
      )}
    </span>
  );
}

