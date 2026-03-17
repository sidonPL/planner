'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  CheckSquare,
  ChefHat,
  Calendar,
  ShoppingCart,
  Package,
  DollarSign,
  Users,
  Settings,
  Plus,
  Search,
  Home,
  BarChart3,
  MapPin,
  Book,
  Utensils,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Navigation items
  const navigationItems = [
    { icon: Home, label: 'Dashboard', href: '/', keywords: ['home', 'główna', 'start'] },
    { icon: CheckSquare, label: 'Zadania', href: '/tasks', keywords: ['tasks', 'todo', 'lista'] },
    { icon: Calendar, label: 'Harmonogram', href: '/schedule', keywords: ['schedule', 'kalendarz', 'plan'] },
    { icon: ChefHat, label: 'Przepisy', href: '/recipes', keywords: ['recipes', 'cooking', 'gotowanie'] },
    { icon: Package, label: 'Inwentarz', href: '/inventory', keywords: ['inventory', 'produkty', 'zapasy'] },
    { icon: ShoppingCart, label: 'Zakupy', href: '/shopping', keywords: ['shopping', 'lista zakupów'] },
    { icon: Utensils, label: 'Posiłki', href: '/meals', keywords: ['meals', 'jadłospis', 'menu'] },
    { icon: DollarSign, label: 'Budżet', href: '/budget', keywords: ['budget', 'finanse', 'pieniądze'] },
    { icon: MapPin, label: 'Wycieczki', href: '/trips', keywords: ['trips', 'podróże', 'wakacje'] },
    { icon: Users, label: 'Rodzina', href: '/family', keywords: ['family', 'członkowie', 'household'] },
    { icon: Book, label: 'Tablica', href: '/board', keywords: ['board', 'ogłoszenia', 'notes'] },
    { icon: BarChart3, label: 'Raporty', href: '/reports', keywords: ['reports', 'statystyki', 'analytics'] },
    { icon: Settings, label: 'Ustawienia', href: '/settings', keywords: ['settings', 'preferencje', 'config'] },
  ];

  // Quick actions
  const quickActions = [
    { icon: Plus, label: 'Nowe zadanie', action: () => router.push('/tasks?new=true'), keywords: ['new task', 'dodaj zadanie'] },
    { icon: Plus, label: 'Nowy przepis', action: () => router.push('/recipes?new=true'), keywords: ['new recipe', 'dodaj przepis'] },
    { icon: Plus, label: 'Dodaj do zakupów', action: () => router.push('/shopping?new=true'), keywords: ['add shopping', 'zakupy'] },
    { icon: Plus, label: 'Dodaj do inwentarza', action: () => router.push('/inventory?new=true'), keywords: ['add inventory'] },
    { icon: Plus, label: 'Nowe wydarzenie', action: () => router.push('/calendar?new=true'), keywords: ['new event', 'wydarzenie'] },
    { icon: Plus, label: 'Nowy harmonogram', action: () => router.push('/schedule?new=true'), keywords: ['new schedule'] },
  ];

  const handleSelect = useCallback((callback: () => void) => {
    onOpenChange(false);
    callback();
  }, [onOpenChange]);

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <DialogTitle className="sr-only">Paleta poleceń</DialogTitle>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Wyszukaj lub wpisz komendę..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nie znaleziono wyników
            </Command.Empty>

            {/* Navigation */}
            <Command.Group heading="Nawigacja">
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.href}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(() => router.push(item.href))}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Quick Actions */}
            <Command.Group heading="Szybkie akcje">
              {quickActions.map((item, index) => (
                <Command.Item
                  key={index}
                  value={`${item.label} ${item.keywords.join(' ')}`}
                  onSelect={() => handleSelect(item.action)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground">
            Wskazówka: Użyj <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd> aby otworzyć
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

