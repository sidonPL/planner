import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatsCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = 'text-blue-500',
  iconBgColor = 'bg-blue-50 dark:bg-blue-950/20',
  trend = 'neutral',
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg', iconBgColor)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {change && (
          <p
            className={cn(
              'text-xs mt-1 font-medium',
              trend === 'up' && 'text-green-600',
              trend === 'down' && 'text-red-600',
              trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

