import { memo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader dla pojedynczej karty przepisu
 * Memoized - nie rerenderuje się niepotrzebnie
 */
export const RecipeCardSkeleton = memo(function RecipeCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        {/* Image skeleton */}
        <Skeleton className="h-48 w-full rounded-t-lg" />
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {/* Title skeleton */}
        <Skeleton className="h-6 w-3/4" />

        {/* Description skeleton */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />

        {/* Badges skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>

        {/* Meta info skeleton */}
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </CardFooter>
    </Card>
  );
});

/**
 * Grid z wieloma skeleton loaderami
 * Memoized z porównaniem count
 */
export const RecipesGridSkeleton = memo(function RecipesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <RecipeCardSkeleton key={i} />
      ))}
    </div>
  );
});

