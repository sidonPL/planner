import { useState, useEffect, useCallback } from 'react';

interface Recipe {
  id: string;
  [key: string]: unknown;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface UseInfiniteRecipesResult {
  recipes: Recipe[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => void;
  pagination: PaginationData | null;
}

export function useInfiniteRecipes(
  filters: {
    search?: string;
    category?: string;
    difficulty?: string;
    quickFilter?: string;
  } = {}
): UseInfiniteRecipesResult {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [page, setPage] = useState(1);

  const fetchRecipes = useCallback(
    async (pageNum: number, append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '24',
          ...(filters.search && { search: filters.search }),
          ...(filters.category && filters.category !== 'all' && { category: filters.category }),
          ...(filters.difficulty && filters.difficulty !== 'all' && { difficulty: filters.difficulty }),
          ...(filters.quickFilter && filters.quickFilter !== 'all' && { quickFilter: filters.quickFilter }),
        });

        const response = await fetch(`/api/recipes/paginated?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch recipes');
        }

        const data = await response.json();

        setRecipes((prev) => (append ? [...prev, ...data.recipes] : data.recipes));
        setPagination(data.pagination);
        setHasMore(data.pagination.page < data.pagination.pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [filters.search, filters.category, filters.difficulty, filters.quickFilter]
  );

  // Initial load + reload when filters change
  useEffect(() => {
    setPage(1);
    setRecipes([]);
    fetchRecipes(1, false);
  }, [fetchRecipes]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchRecipes(nextPage, true);
    }
  }, [isLoading, hasMore, page, fetchRecipes]);

  const refresh = useCallback(() => {
    setPage(1);
    setRecipes([]);
    fetchRecipes(1, false);
  }, [fetchRecipes]);

  return {
    recipes,
    isLoading,
    hasMore,
    error,
    loadMore,
    refresh,
    pagination,
  };
}

