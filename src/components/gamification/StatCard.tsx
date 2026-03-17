'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CountingNumber } from '@/components/ui/counting-number';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  subtitle: string;
  color: 'yellow' | 'orange' | 'purple' | 'blue' | 'green';
  className?: string;
}

const colorClasses = {
  yellow: 'from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950 border-yellow-200 dark:border-yellow-800',
  orange: 'from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800',
  purple: 'from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800',
  blue: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800',
  green: 'from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800',
};

export function StatCard({ icon, label, value, subtitle, color, className }: StatCardProps) {
  return (
    <Card className={cn('bg-gradient-to-br border', colorClasses[color], className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-3xl font-bold">
              {typeof value === 'number' ? (
                <CountingNumber value={value} duration={1500} />
              ) : (
                value
              )}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              {label}
            </div>
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

