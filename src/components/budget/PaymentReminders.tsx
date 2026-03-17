'use client';

import { useState } from 'react';
import { Bell, Plus, Calendar, DollarSign, Repeat, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PaymentReminder {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  dueDate: Date;
  recurring: boolean;
  recurrencePattern: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM' | null;
  notifyDaysBefore: number;
  isPaid: boolean;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface PaymentRemindersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Array<{ id: string; name: string; color: string }>;
}

export function PaymentReminders({ open, onOpenChange, categories }: PaymentRemindersProps) {
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    description: '',
    amount: '',
    dueDate: '',
    recurring: false,
    recurrencePattern: '' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | '',
    categoryId: '',
    notifyDaysBefore: '3',
  });

  const loadReminders = async () => {
    try {
      const response = await fetch('/api/budget/reminders');
      if (response.ok) {
        const data: PaymentReminder[] = await response.json();
        setReminders(data.map((r) => ({ ...r, dueDate: new Date(r.dueDate) })));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const handleAddReminder = async () => {
    if (!newReminder.title || !newReminder.amount || !newReminder.dueDate) {
      toast.error('Wypełnij wymagane pola');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/budget/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReminder.title,
          description: newReminder.description || undefined,
          amount: parseFloat(newReminder.amount),
          dueDate: new Date(newReminder.dueDate).toISOString(),
          recurring: newReminder.recurring,
          recurrencePattern: newReminder.recurring && newReminder.recurrencePattern ? newReminder.recurrencePattern : undefined,
          categoryId: newReminder.categoryId || undefined,
          notifyDaysBefore: parseInt(newReminder.notifyDaysBefore),
        }),
      });

      if (response.ok) {
        toast.success('Przypomnienie dodane');
        setIsAddDialogOpen(false);
        setNewReminder({
          title: '',
          description: '',
          amount: '',
          dueDate: '',
          recurring: false,
          recurrencePattern: '',
          categoryId: '',
          notifyDaysBefore: '3',
        });
        loadReminders();
      } else {
        toast.error('Nie udało się dodać przypomnienia');
      }
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error('Błąd podczas dodawania');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (_id: string) => {
    // TODO: Implement mark as paid endpoint
    toast.success('Oznaczono jako opłacone');
  };

  const handleDelete = async (_id: string) => {
    // TODO: Implement delete endpoint
    toast.success('Usunięto przypomnienie');
  };

  // Load reminders when dialog opens
  useState(() => {
    if (open) {
      loadReminders();
    }
  });

  const upcomingReminders = reminders.filter(r => !r.isPaid && isFuture(r.dueDate));
  const overdueReminders = reminders.filter(r => !r.isPaid && isPast(r.dueDate));
  const paidReminders = reminders.filter(r => r.isPaid);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Przypomnienia o płatnościach
            </DialogTitle>
            <DialogDescription>
              Zarządzaj przypomnieniami o rachunkach i płatnościach
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add button */}
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj przypomnienie
            </Button>

            {/* Overdue */}
            {overdueReminders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-red-600">Zaległe ({overdueReminders.length})</h3>
                {overdueReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onMarkPaid={handleMarkAsPaid}
                    onDelete={handleDelete}
                    variant="overdue"
                  />
                ))}
              </div>
            )}

            {/* Upcoming */}
            {upcomingReminders.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Nadchodzące ({upcomingReminders.length})</h3>
                {upcomingReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onMarkPaid={handleMarkAsPaid}
                    onDelete={handleDelete}
                    variant="upcoming"
                  />
                ))}
              </div>
            )}

            {/* Paid */}
            {paidReminders.length > 0 && (
              <details className="space-y-2">
                <summary className="font-semibold text-sm cursor-pointer">
                  Opłacone ({paidReminders.length})
                </summary>
                {paidReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder.id}
                    reminder={reminder}
                    onMarkPaid={handleMarkAsPaid}
                    onDelete={handleDelete}
                    variant="paid"
                  />
                ))}
              </details>
            )}

            {reminders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Brak przypomnień o płatnościach</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Reminder Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj przypomnienie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Tytuł *</Label>
              <Input
                id="title"
                placeholder="np. Czynsz"
                value={newReminder.title}
                onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Kwota *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newReminder.amount}
                onChange={(e) => setNewReminder({ ...newReminder, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Termin płatności *</Label>
              <Input
                id="dueDate"
                type="date"
                value={newReminder.dueDate}
                onChange={(e) => setNewReminder({ ...newReminder, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Kategoria (opcjonalnie)</Label>
              <Select value={newReminder.categoryId} onValueChange={(v) => setNewReminder({ ...newReminder, categoryId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="recurring">Cykliczne</Label>
              <Switch
                id="recurring"
                checked={newReminder.recurring}
                onCheckedChange={(v) => setNewReminder({ ...newReminder, recurring: v })}
              />
            </div>

            {newReminder.recurring && (
              <div className="space-y-2">
                <Label htmlFor="pattern">Częstotliwość</Label>
                <Select value={newReminder.recurrencePattern} onValueChange={(v) => setNewReminder({ ...newReminder, recurrencePattern: v as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Co tydzień</SelectItem>
                    <SelectItem value="MONTHLY">Co miesiąc</SelectItem>
                    <SelectItem value="YEARLY">Co rok</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notifyBefore">Przypomnij z wyprzedzeniem (dni)</Label>
              <Input
                id="notifyBefore"
                type="number"
                min="0"
                max="30"
                value={newReminder.notifyDaysBefore}
                onChange={(e) => setNewReminder({ ...newReminder, notifyDaysBefore: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleAddReminder} disabled={isLoading}>
              {isLoading ? 'Dodawanie...' : 'Dodaj'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Helper component
function ReminderCard({
  reminder,
  onMarkPaid,
  onDelete,
  variant,
}: {
  reminder: PaymentReminder;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  variant: 'overdue' | 'upcoming' | 'paid';
}) {
  return (
    <Card className={variant === 'overdue' ? 'border-red-200 bg-red-50' : variant === 'paid' ? 'opacity-60' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{reminder.title}</h4>
              {reminder.recurring && (
                <Badge variant="outline" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  {reminder.recurrencePattern}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="font-medium">{reminder.amount} zł</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(reminder.dueDate, 'PPP', { locale: pl })}
                  {' · '}
                  {formatDistanceToNow(reminder.dueDate, { addSuffix: true, locale: pl })}
                </span>
              </div>
              {reminder.category && (
                <Badge variant="secondary" style={{ backgroundColor: reminder.category.color + '20', color: reminder.category.color }}>
                  {reminder.category.name}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {!reminder.isPaid && (
              <Button size="icon" variant="ghost" onClick={() => onMarkPaid(reminder.id)}>
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={() => onDelete(reminder.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

