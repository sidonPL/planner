'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lock, Eye, EyeOff, Shield, History, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface SecurityTabProps {
  userId: string;
}

interface AuditLog {
  id: string;
  action: string;
  createdAt: Date;
  details: unknown;
}

export function SecurityTab({ userId }: SecurityTabProps) {
  void userId;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changing, setChanging] = useState(false);
  const [loginHistory, setLoginHistory] = useState<AuditLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadLoginHistory();
  }, []);

  const loadLoginHistory = async () => {
    try {
      const response = await fetch('/api/user/login-history');
      if (response.ok) {
        const data = await response.json() as { history: Array<Omit<AuditLog, 'createdAt'> & { createdAt: string | Date }> };
        setLoginHistory(data.history.map((h) => ({
          ...h,
          createdAt: new Date(h.createdAt),
        })));
      }
    } catch (error) {
      console.error('Error loading login history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Nowe hasła nie są identyczne');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Hasło musi mieć minimum 8 znaków');
      return;
    }

    setChanging(true);
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        toast.success('Hasło zostało zmienione');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Nie udało się zmienić hasła');
      }
    } catch {
      toast.error('Wystąpił błąd');
    } finally {
      setChanging(false);
    }
  };

  const getIpFromDetails = (details: unknown): string => {
    if (!details || typeof details !== 'object' || Array.isArray(details)) {
      return 'N/A';
    }
    const ip = (details as Record<string, unknown>).ip;
    return typeof ip === 'string' && ip.length > 0 ? ip : 'N/A';
  };

  return (
    <div className="space-y-4">
      {/* Zmiana hasła */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Zmiana hasła
          </CardTitle>
          <CardDescription>
            Regularnie zmieniaj hasło aby zachować bezpieczeństwo konta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Obecne hasło</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nowe hasło</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Minimum 8 znaków
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Potwierdź nowe hasło</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button onClick={handleChangePassword} disabled={changing}>
            <Lock className="mr-2 h-4 w-4" />
            {changing ? 'Zmieniam...' : 'Zmień hasło'}
          </Button>
        </CardContent>
      </Card>

      {/* Historia logowań */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historia logowań
          </CardTitle>
          <CardDescription>
            Ostatnie 10 logowań do Twojego konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Brak historii logowań</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data i czas</TableHead>
                  <TableHead>Akcja</TableHead>
                  <TableHead>Szczegóły</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loginHistory.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-sm">
                        {formatDistanceToNow(log.createdAt, {
                          addSuffix: true,
                          locale: pl,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.action === 'LOGIN' ? 'default' : 'secondary'}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getIpFromDetails(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 2FA (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Uwierzytelnianie dwuskładnikowe (2FA)
          </CardTitle>
          <CardDescription>
            Dodatkowa warstwa bezpieczeństwa dla Twojego konta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Funkcja w przygotowaniu</p>
            <p className="text-sm text-muted-foreground">
              Dwuskładnikowe uwierzytelnianie będzie dostępne wkrótce
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Aktywne sesje (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Aktywne sesje
          </CardTitle>
          <CardDescription>
            Zarządzaj urządzeniami, na których jesteś zalogowany
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-6 text-center">
            <LogOut className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Funkcja w przygotowaniu</p>
            <p className="text-sm text-muted-foreground">
              Zarządzanie sesjami będzie dostępne wkrótce
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

