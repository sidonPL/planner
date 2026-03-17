'use client';

import { useState, useEffect } from 'react';
import { Keyboard, Command, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Global
  { keys: ['Ctrl', 'K'], description: 'Otwórz Command Palette', category: 'Globalne' },
  { keys: ['?'], description: 'Pokaż skróty klawiszowe', category: 'Globalne' },
  { keys: ['Esc'], description: 'Zamknij dialog/modal', category: 'Globalne' },

  // Navigation
  { keys: ['g', 'h'], description: 'Przejdź do Dashboard', category: 'Nawigacja' },
  { keys: ['g', 't'], description: 'Przejdź do Zadań', category: 'Nawigacja' },
  { keys: ['g', 'r'], description: 'Przejdź do Przepisów', category: 'Nawigacja' },
  { keys: ['g', 'i'], description: 'Przejdź do Inwentarza', category: 'Nawigacja' },
  { keys: ['g', 's'], description: 'Przejdź do Harmonogramu', category: 'Nawigacja' },

  // Quick Actions
  { keys: ['n', 't'], description: 'Nowe zadanie', category: 'Szybkie akcje' },
  { keys: ['n', 'r'], description: 'Nowy przepis', category: 'Szybkie akcje' },
  { keys: ['n', 'e'], description: 'Nowe wydarzenie', category: 'Szybkie akcje' },

  // Lists
  { keys: ['↑'], description: 'Poprzedni element', category: 'Listy' },
  { keys: ['↓'], description: 'Następny element', category: 'Listy' },
  { keys: ['Enter'], description: 'Otwórz element', category: 'Listy' },
  { keys: ['Del'], description: 'Usuń element', category: 'Listy' },

  // Search
  { keys: ['Ctrl', 'F'], description: 'Szukaj na stronie', category: 'Wyszukiwanie' },
  { keys: ['/'], description: 'Szukaj (focus)', category: 'Wyszukiwanie' },
];

export function KeyboardShortcuts({ open, onOpenChange }: KeyboardShortcutsProps) {
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle>Skróty Klawiszowe</DialogTitle>
          </div>
          <DialogDescription>
            Używaj skrótów klawiszowych aby szybciej poruszać się po aplikacji
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <kbd className="pointer-events-none inline-flex h-6 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                              {key === 'Ctrl' && <Command className="h-3 w-3" />}
                              {key === '↑' && <ArrowUp className="h-3 w-3" />}
                              {key === '↓' && <ArrowDown className="h-3 w-3" />}
                              {key === 'Del' && <Trash2 className="h-3 w-3" />}
                              {!['Ctrl', '↑', '↓', 'Del'].includes(key) && key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Wskazówka: Naciśnij <kbd className="px-1.5 py-0.5 text-xs border rounded bg-muted">?</kbd> aby otworzyć tę pomoc w dowolnym momencie
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to trigger shortcuts dialog with ?
export function useKeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Open shortcuts help with ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}

