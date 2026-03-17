'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface MemberStats {
  id: string;
  name: string | null;
  avatar: string | null;
  color: string;
  points: number;
}

interface LeaderboardPodiumProps {
  members: MemberStats[];
}

export function LeaderboardPodium({ members }: LeaderboardPodiumProps) {
  const top3 = members.slice(0, 3);

  // Arrange: 2nd, 1st, 3rd (podium layout)
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const heights = ['h-32', 'h-40', 'h-24'];
  const colors = [
    'from-gray-300 to-gray-400',  // Silver
    'from-yellow-300 to-yellow-500',  // Gold
    'from-amber-400 to-amber-600',  // Bronze
  ];
  const borderColors = [
    'border-gray-400',
    'border-yellow-400',
    'border-amber-600',
  ];

  if (top3.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-end justify-center gap-4 mb-4">
        {podiumOrder.map((member, index) => {
          if (!member) return null;

          const actualRank = index === 0 ? 2 : index === 1 ? 1 : 3;
          const heightClass = heights[index];
          const colorClass = colors[index];
          const borderColor = borderColors[index];

          return (
            <div key={member.id} className="flex flex-col items-center gap-2">
              {/* Avatar */}
              <Avatar className={cn(
                "border-4",
                actualRank === 1 ? "h-20 w-20" :
                actualRank === 2 ? "h-16 w-16" :
                "h-14 w-14",
                borderColor
              )}>
                <AvatarImage src={member.avatar || undefined} />
                <AvatarFallback style={{ backgroundColor: member.color }} className="text-white">
                  {member.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Name & Points */}
              <div className="text-center">
                <div className={cn(
                  "font-semibold",
                  actualRank === 1 ? "text-base" : "text-sm"
                )}>
                  {member.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {member.points} pkt
                </div>
              </div>

              {/* Podium */}
              <div className={cn(
                heightClass,
                "w-24 rounded-t-lg bg-gradient-to-b",
                colorClass,
                "flex items-center justify-center text-white font-bold text-2xl",
                "shadow-lg"
              )}>
                {actualRank === 1 ? '👑' : actualRank === 2 ? '🥈' : '🥉'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

