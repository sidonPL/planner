'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, ChefHat, ClipboardList, Wallet, Package, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';

interface SearchClientProps {
  userId: string;
}

interface SearchResults {
  recipes: Recipe[];
  tasks: Task[];
  transactions: Transaction[];
  inventory: InventoryItem[];
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  difficulty?: string;
  image?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  dueDate?: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: string;
  category?: string;
  date: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  location?: string;
  expiryDate?: string;
}

export function SearchClient({ userId: _userId }: SearchClientProps) {
  void _userId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>({
    recipes: [],
    tasks: [],
    transactions: [],
    inventory: [],
  });

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    console.log('[SearchClient] Starting search for:', searchQuery);
    setIsSearching(true);
    setError(null);
    try {
      const url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
      console.log('[SearchClient] Fetching:', url);

      const response = await fetch(url);
      console.log('[SearchClient] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[SearchClient] Results received:', {
          recipes: data.recipes?.length || 0,
          tasks: data.tasks?.length || 0,
          transactions: data.transactions?.length || 0,
          inventory: data.inventory?.length || 0,
        });

        setResults(data);

        // Update URL with search query
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`, { scroll: false });
      } else {
        const errorData = await response.json();
        console.error('[SearchClient] Error response:', errorData);
        setError(errorData.error || 'Wystąpił błąd podczas wyszukiwania');
        toast.error('Nie udało się wyszukać wyników');
      }
    } catch (error) {
      console.error('[SearchClient] Exception:', error);
      setError('Błąd połączenia z serwerem');
      toast.error('Błąd połączenia z serwerem');
    } finally {
      setIsSearching(false);
    }
  }, [router]);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const totalResults =
    results.recipes.length +
    results.tasks.length +
    results.transactions.length +
    results.inventory.length;

  return (
    <div className="w-full max-w-[2000px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Search className="h-8 w-8 text-primary" />
          Wyszukiwanie
        </h1>
        <p className="text-muted-foreground mt-1">
          Znajdź przepisy, zadania, wydatki i produkty
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Wpisz czego szukasz..."
              className="pl-11 text-base h-12"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(query);
                }
              }}
              autoFocus
            />
          </div>

          {/* Propozycje wyszukiwania - pokazuj tylko gdy pole jest puste */}
          {!query && !isSearching && totalResults === 0 && (
            <div className="space-y-4 pt-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Popularne wyszukiwania:</h3>
                <div className="flex flex-wrap gap-2">
                  {['spaghetti', 'kurczak', 'pizza', 'makaron', 'zakupy', 'sprzątanie', 'rachunki', 'pranie'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setQuery(suggestion);
                        handleSearch(suggestion);
                      }}
                      className="px-4 py-2 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground text-sm font-medium transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Kategorie:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => router.push('/recipes')}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-solid hover:border-primary transition-all text-left group hover:shadow-lg hover:scale-[1.02]"
                  >
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 ring-1 ring-black/5">
                      <ChefHat className="h-6 w-6 text-orange-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">Przepisy</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Przeglądaj wszystkie</div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/tasks')}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-solid hover:border-primary transition-all text-left group hover:shadow-lg hover:scale-[1.02]"
                  >
                    <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 ring-1 ring-black/5">
                      <ClipboardList className="h-6 w-6 text-purple-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">Zadania</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Zobacz wszystkie</div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/budget')}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-solid hover:border-primary transition-all text-left group hover:shadow-lg hover:scale-[1.02]"
                  >
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-black/5">
                      <Wallet className="h-6 w-6 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">Finanse</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Budżet i wydatki</div>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push('/inventory')}
                    className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed hover:border-solid hover:border-primary transition-all text-left group hover:shadow-lg hover:scale-[1.02]"
                  >
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 ring-1 ring-black/5">
                      <Package className="h-6 w-6 text-green-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base">Inwentarz</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Produkty w domu</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Szukam...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-6 text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          )}
          {!isSearching && !error && query && totalResults === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-lg">
                Nie znaleziono wyników dla <span className="font-semibold">&ldquo;{query}&rdquo;</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Spróbuj użyć innych słów kluczowych
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {totalResults > 0 && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Wszystkie ({totalResults})
            </TabsTrigger>
            <TabsTrigger value="recipes" className="text-xs sm:text-sm">
              <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Przepisy</span> ({results.recipes.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Zadania</span> ({results.tasks.length})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs sm:text-sm">
              <Wallet className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Finanse</span> ({results.transactions.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Inwentarz</span> ({results.inventory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6 mt-4">
            {results.recipes.length > 0 && (
              <SearchSection
                title="Przepisy"
                icon={ChefHat}
                items={results.recipes}
                renderItem={(recipe: Recipe) => (
                  <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block h-full">
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary hover:scale-[1.02]">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-1">{recipe.name}</CardTitle>
                        {recipe.description && (
                          <CardDescription className="line-clamp-2">
                            {recipe.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {recipe.category && (
                            <Badge variant="secondary">{recipe.category}</Badge>
                          )}
                          {recipe.difficulty && (
                            <Badge variant="outline">{recipe.difficulty}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              />
            )}

            {results.tasks.length > 0 && (
              <SearchSection
                title="Zadania"
                icon={ClipboardList}
                items={results.tasks}
                renderItem={(task: Task) => (
                  <Link key={task.id} href={`/tasks`} className="block h-full">
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary hover:scale-[1.02]">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
                        {task.description && (
                          <CardDescription className="line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={task.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="secondary">{task.priority}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              />
            )}

            {results.transactions.length > 0 && (
              <SearchSection
                title="Finanse"
                icon={Wallet}
                items={results.transactions}
                renderItem={(transaction: Transaction) => (
                  <Card key={transaction.id} className="hover:shadow-lg transition-all h-full border-2">
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-1">{transaction.description}</CardTitle>
                      <CardDescription>
                        {new Date(transaction.date).toLocaleDateString('pl-PL')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>
                          {transaction.type === 'INCOME' ? '+' : '-'} {transaction.amount} zł
                        </Badge>
                        {transaction.category && (
                          <Badge variant="outline">{transaction.category}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            )}

            {results.inventory.length > 0 && (
              <SearchSection
                title="Inwentarz"
                icon={Package}
                items={results.inventory}
                renderItem={(item: InventoryItem) => (
                  <Card key={item.id} className="hover:shadow-lg transition-all h-full border-2">
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                      <CardDescription>
                        {item.quantity} {item.unit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {item.location && (
                          <Badge variant="outline">{item.location}</Badge>
                        )}
                        {item.expiryDate && new Date(item.expiryDate) < new Date() && (
                          <Badge variant="destructive">Przeterminowane</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            )}
          </TabsContent>

          <TabsContent value="recipes" className="space-y-4 mt-4">
            {results.recipes.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.recipes.map((recipe: Recipe) => (
                  <Link key={recipe.id} href={`/recipes/${recipe.id}`} className="block h-full">
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary hover:scale-[1.02]">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-1">{recipe.name}</CardTitle>
                        {recipe.description && (
                          <CardDescription className="line-clamp-2">
                            {recipe.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {recipe.category && (
                            <Badge variant="secondary">{recipe.category}</Badge>
                          )}
                          {recipe.difficulty && (
                            <Badge variant="outline">{recipe.difficulty}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak przepisów</p>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            {results.tasks.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {results.tasks.map((task: Task) => (
                  <Link key={task.id} href={`/tasks`} className="block h-full">
                    <Card className="hover:shadow-lg transition-all cursor-pointer h-full border-2 hover:border-primary hover:scale-[1.02]">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-1">{task.title}</CardTitle>
                        {task.description && (
                          <CardDescription className="line-clamp-2">
                            {task.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={task.status === 'COMPLETED' ? 'default' : 'outline'}>
                            {task.status}
                          </Badge>
                          {task.priority && (
                            <Badge variant="secondary">{task.priority}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak zadań</p>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 mt-4">
            {results.transactions.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {results.transactions.map((transaction: Transaction) => (
                  <Card key={transaction.id} className="hover:shadow-lg transition-all border-2">
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-1">{transaction.description}</CardTitle>
                      <CardDescription>
                        {new Date(transaction.date).toLocaleDateString('pl-PL')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>
                          {transaction.type === 'INCOME' ? '+' : '-'} {transaction.amount} zł
                        </Badge>
                        {transaction.category && (
                          <Badge variant="outline">{transaction.category}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak transakcji</p>
            )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4 mt-4">
            {results.inventory.length > 0 ? (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {results.inventory.map((item: InventoryItem) => (
                  <Card key={item.id} className="hover:shadow-lg transition-all border-2">
                    <CardHeader>
                      <CardTitle className="text-base line-clamp-1">{item.name}</CardTitle>
                      <CardDescription>
                        {item.quantity} {item.unit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {item.category && (
                          <Badge variant="secondary">{item.category}</Badge>
                        )}
                        {item.location && (
                          <Badge variant="outline">{item.location}</Badge>
                        )}
                        {item.expiryDate && new Date(item.expiryDate) < new Date() && (
                          <Badge variant="destructive">Przeterminowane</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Brak produktów</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface SearchSectionProps<T> {
  title: string;
  icon: LucideIcon;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function SearchSection<T>({ title, icon: Icon, items, renderItem }: SearchSectionProps<T>) {
  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        {title} ({items.length})
      </h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map(renderItem)}
      </div>
    </div>
  );
}

