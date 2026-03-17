"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary - łapie błędy w drzewie komponentów i wyświetla fallback UI
 * Użycie: <ErrorBoundary><YourComponent /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Możesz tutaj wysłać błąd do serwisu monitoringu (np. Sentry)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Jeśli podano custom fallback, użyj go
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Domyślny fallback UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle>Coś poszło nie tak</CardTitle>
              </div>
              <CardDescription>
                Przepraszamy, wystąpił nieoczekiwany błąd.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {this.state.error && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Szczegóły błędu:</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                    {this.state.error.message}
                  </pre>
                  {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Stack trace (dev only)
                      </summary>
                      <pre className="bg-muted p-3 rounded mt-2 overflow-auto max-h-60">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReset} className="w-full">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Spróbuj ponownie
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Odśwież stronę
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

