'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChefHat, Search, ArrowLeft, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface Recipe {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  isPublic: boolean;
  userId: string;
  userName: string | null;
  createdAt: Date;
}

export function AdminRecipesClient() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const response = await fetch('/api/admin/recipes');
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublic = async (id: string, currentState: boolean) => {
    try {
      const response = await fetch(`/api/admin/recipes/${id}/toggle-public`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentState }),
      });

      if (response.ok) {
        toast.success(`Przepis ${!currentState ? 'upubliczniony' : 'oznaczony jako prywatny'}`);
        loadRecipes();
      } else {
        toast.error('Błąd zmiany widoczności');
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Czy na pewno usunąć przepis "${name}"?`)) return;

    try {
      const response = await fetch(`/api/admin/recipes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Przepis usunięty');
        loadRecipes();
      } else {
        toast.error('Błąd usuwania');
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    }
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    const matchesVisibility =
      visibilityFilter === 'all' ||
      (visibilityFilter === 'public' && recipe.isPublic) ||
      (visibilityFilter === 'private' && !recipe.isPublic);
    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const getDifficultyBadge = (difficulty: string) => {
    const colors: Record<string, string> = {
      EASY: 'bg-green-500',
      MEDIUM: 'bg-yellow-500',
      HARD: 'bg-red-500',
    };
    const labels: Record<string, string> = {
      EASY: 'Łatwy',
      MEDIUM: 'Średni',
      HARD: 'Trudny',
    };
    return (
      <Badge variant="default" className={colors[difficulty] || 'bg-gray-500'}>
        {labels[difficulty] || difficulty}
      </Badge>
    );
  };

  const categories = Array.from(new Set(recipes.map((r) => r.category)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ChefHat className="h-8 w-8 text-orange-500" />
              Zarządzanie Przepisami
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Moderacja i zarządzanie wszystkimi przepisami w systemie
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie przepisy</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recipes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Publiczne</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipes.filter((r) => r.isPublic).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prywatne</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recipes.filter((r) => !r.isPublic).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategorie</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj po nazwie..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Widoczność" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="public">Publiczne</SelectItem>
                <SelectItem value="private">Prywatne</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recipes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Przepisy ({filteredRecipes.length})</CardTitle>
          <CardDescription>Lista wszystkich przepisów w systemie</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak przepisów spełniających kryteria
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa</TableHead>
                  <TableHead>Kategoria</TableHead>
                  <TableHead>Trudność</TableHead>
                  <TableHead>Czas</TableHead>
                  <TableHead>Porcje</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Widoczność</TableHead>
                  <TableHead>Utworzono</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipes.map((recipe) => (
                  <TableRow key={recipe.id}>
                    <TableCell className="font-medium">{recipe.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{recipe.category}</Badge>
                    </TableCell>
                    <TableCell>{getDifficultyBadge(recipe.difficulty)}</TableCell>
                    <TableCell>
                      {recipe.prepTime + recipe.cookTime} min
                    </TableCell>
                    <TableCell>{recipe.servings}</TableCell>
                    <TableCell>
                      <span className="text-sm">{recipe.userName || 'Nieznany'}</span>
                    </TableCell>
                    <TableCell>
                      {recipe.isPublic ? (
                        <Badge variant="default" className="bg-green-500">
                          <Eye className="h-3 w-3 mr-1" />
                          Publiczny
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Prywatny</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {formatDistanceToNow(recipe.createdAt, {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublic(recipe.id, recipe.isPublic)}
                        >
                          {recipe.isPublic ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(recipe.id, recipe.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

