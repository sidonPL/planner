import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function MealsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Meal Grid */}
      <div className="grid gap-4">
        {[...Array(7)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

