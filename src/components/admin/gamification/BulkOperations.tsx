'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Zap, Trophy, Award } from 'lucide-react';
import { toast } from 'sonner';

export function BulkOperations() {
  const [xpAmount, setXpAmount] = useState('100');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleBulkAwardXP = async () => {
    if (!reason.trim()) {
      toast.error('Podaj powód przyznania XP');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/gamification/bulk-award-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseInt(xpAmount), reason }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Przyznano ${xpAmount} XP dla ${result.usersCount} użytkowników!`);
        setReason('');
      } else {
        toast.error('Błąd przyznawania XP');
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    } finally {
      setProcessing(false);
    }
  };

  const handleResetDailyQuests = async () => {
    if (!confirm('Czy na pewno zresetować wszystkie daily quests? To usunie postęp!')) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/gamification/reset-daily-quests', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Daily quests zresetowane!');
      } else {
        toast.error('Błąd resetowania');
      }
    } catch (error) {
      toast.error('Błąd połączenia');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Bulk Award XP */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Masowe przyznanie XP
          </CardTitle>
          <CardDescription>
            Przyznaj XP wszystkim użytkownikom jednocześnie (np. za event specjalny)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="xp">Ilość XP</Label>
            <Input
              id="xp"
              type="number"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Powód</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="np. Bonus świąteczny 2026"
            />
          </div>
          <Button onClick={handleBulkAwardXP} disabled={processing} className="w-full">
            <Zap className="mr-2 h-4 w-4" />
            {processing ? 'Przetwarzanie...' : 'Przyznaj XP wszystkim'}
          </Button>
        </CardContent>
      </Card>

      {/* Reset Daily Quests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-purple-500" />
            Resetuj Daily Quests
          </CardTitle>
          <CardDescription>
            Usuń wszystkie dzisiejsze questy i wygeneruj nowe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleResetDailyQuests}
            disabled={processing}
            variant="destructive"
            className="w-full"
          >
            {processing ? 'Przetwarzanie...' : 'Resetuj i regeneruj questy'}
          </Button>
        </CardContent>
      </Card>

      {/* Other Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Inne operacje masowe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full" disabled>
            <Award className="mr-2 h-4 w-4" />
            Przyznaj achievement wszystkim (TODO)
          </Button>
          <Button variant="outline" className="w-full" disabled>
            <Trophy className="mr-2 h-4 w-4" />
            Odbierz odznakę wszystkim (TODO)
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Więcej operacji będzie dostępnych w przyszłych wersjach
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

