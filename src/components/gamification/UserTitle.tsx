'use client';

import { Badge } from '@/components/ui/badge';
import { getActiveTitle, TitleId } from '@/lib/titles';
import { cn } from '@/lib/utils';

interface UserTitleProps {
  titleId: TitleId | string | null;
  className?: string;
}

export function UserTitle({ titleId, className }: UserTitleProps) {
  const title = getActiveTitle(titleId);

  if (!title || title.id === 'none') {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium',
        title.color,
        className
      )}
    >
      {title.icon} {title.name}
    </Badge>
  );
}

