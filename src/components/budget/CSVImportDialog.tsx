'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string; type: string }>;
  onImportComplete: () => void;
}

type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category?: string;
};

export function CSVImportDialog({
  open,
  onOpenChange,
  accounts,
  onImportComplete,
}: CSVImportDialogProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): ParsedTransaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // Zakładamy CSV format: Data,Opis,Kwota,Typ,Kategoria
    const transactions: ParsedTransaction[] = [];

    // Pomiń nagłówek jeśli istnieje
    const startIndex = lines[0].toLowerCase().includes('data') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      try {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));

        if (parts.length < 4) continue;

        const [dateStr, description, amountStr, typeStr, category] = parts;

        // Parsuj datę (YYYY-MM-DD lub DD/MM/YYYY lub DD-MM-YYYY)
        let date: Date;
        if (dateStr.includes('/')) {
          const [day, month, year] = dateStr.split('/');
          date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
        } else if (dateStr.includes('-')) {
          const dateParts = dateStr.split('-');
          if (dateParts[0].length === 4) {
            date = new Date(dateStr); // YYYY-MM-DD
          } else {
            const [day, month, year] = dateParts;
            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
          }
        } else {
          continue; // Skip invalid date
        }

        // Parsuj kwotę
        const amount = Math.abs(parseFloat(amountStr.replace(/[^\d.-]/g, '')));
        if (isNaN(amount)) continue;

        // Określ typ (INCOME vs EXPENSE)
        let type: 'INCOME' | 'EXPENSE';
        if (typeStr.toLowerCase().includes('przychód') || typeStr.toLowerCase().includes('income') || parseFloat(amountStr) > 0) {
          type = 'INCOME';
        } else {
          type = 'EXPENSE';
        }

        transactions.push({
          date: date.toISOString(),
          description: description || 'Bez opisu',
          amount,
          type,
          category,
        });
      } catch (error) {
        console.error('Error parsing line:', lines[i], error);
      }
    }

    return transactions;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setParsedData(parsed);

      if (parsed.length === 0) {
        toast.error('Nie znaleziono prawidłowych transakcji w pliku');
      } else {
        toast.success(`Znaleziono ${parsed.length} transakcji`);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('Brak danych do importu');
      return;
    }

    if (!selectedAccountId) {
      toast.error('Wybierz konto');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/budget/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: parsedData,
          accountId: selectedAccountId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setImportResult({
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors,
        });

        toast.success(`Import zakończony: ${data.imported} dodanych, ${data.skipped} pominiętych`);
        onImportComplete();
      } else {
        toast.error('Błąd podczas importu');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Nie udało się zaimportować transakcji');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setParsedData([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import transakcji z CSV
          </DialogTitle>
          <DialogDescription>
            Importuj transakcje z pliku CSV eksportowanego z banku
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Oczekiwany format CSV:</strong><br />
              Data,Opis,Kwota,Typ,Kategoria<br />
              <span className="text-xs text-muted-foreground">
                Przykład: 2026-01-01,Zakupy,100.50,Wydatek,Jedzenie
              </span>
            </AlertDescription>
          </Alert>

          {/* File upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Wybierz plik CSV</Label>
            <input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {/* Account selection */}
          {parsedData.length > 0 && !importResult && (
            <div className="space-y-2">
              <Label htmlFor="account">Przypisz do konta</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && !importResult && (
            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">
                Znaleziono {parsedData.length} transakcji
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {parsedData.slice(0, 5).map((t, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex justify-between">
                    <span>{new Date(t.date).toLocaleDateString()}</span>
                    <span className="flex-1 mx-2 truncate">{t.description}</span>
                    <span className={t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
                      {t.type === 'INCOME' ? '+' : '-'}{t.amount} zł
                    </span>
                  </div>
                ))}
                {parsedData.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    ... i {parsedData.length - 5} więcej
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-2">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Import zakończony!</strong><br />
                  ✅ {importResult.imported} transakcji dodanych<br />
                  {importResult.skipped > 0 && `⏭️ ${importResult.skipped} pominiętych (duplikaty)\n`}
                  {importResult.errors > 0 && `❌ ${importResult.errors} błędów`}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          {!importResult ? (
            <>
              <Button variant="outline" onClick={() => {
                handleReset();
                onOpenChange(false);
              }}>
                Anuluj
              </Button>
              <Button
                onClick={handleImport}
                disabled={parsedData.length === 0 || !selectedAccountId || isProcessing}
              >
                {isProcessing ? 'Importowanie...' : `Importuj ${parsedData.length} transakcji`}
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              handleReset();
              onOpenChange(false);
            }}>
              Zamknij
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

