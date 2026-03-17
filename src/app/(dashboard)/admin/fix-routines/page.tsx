"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";

interface Result {
  routineId: string;
  routineTitle: string;
  instancesCreated: number;
  success: boolean;
  error?: string;
}

interface ApiResponse {
  message: string;
  results: Result[];
}

export default function FixRoutinesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFix = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/tasks/generate-routine-instances", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔧 Naprawa instancji rutyn</h1>
        <p className="text-muted-foreground">
          Ta strona pozwala wygenerować instancje dla starych rutyn, które nie mają zaplanowanych zadań na przyszłe dni.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Jak to działa?</CardTitle>
          <CardDescription>
            Proces naprawy sprawdza wszystkie rutyny w Twoim gospodarstwie i generuje brakujące instancje na najbliższy miesiąc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <p className="text-sm">Znajduje wszystkie rutyny (zadania cykliczne)</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <p className="text-sm">Sprawdza, które dni nie mają jeszcze instancji</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <p className="text-sm">Generuje brakujące instancje na 30 dni do przodu</p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            <p className="text-sm">Nie duplikuje istniejących zadań</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Uruchom naprawę</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleFix}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generowanie instancji...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Wygeneruj instancje rutyn
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Wyniki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription className="text-base font-medium">
                {result.message}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="font-semibold mb-2">Szczegóły:</h3>
              {result.results.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    item.success 
                      ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" 
                      : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.routineTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.success
                          ? `✅ Utworzono ${item.instancesCreated} instancji`
                          : `❌ ${item.error || 'Błąd'}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {result.results.length === 0 && (
              <Alert>
                <AlertDescription>
                  Nie znaleziono rutyn do przetworzenia. Wszystkie rutyny mają już wygenerowane instancje! 🎉
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

