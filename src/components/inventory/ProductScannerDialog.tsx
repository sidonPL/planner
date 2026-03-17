"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, Keyboard } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProductScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function ProductScannerDialog({ open, onOpenChange, onScan }: ProductScannerDialogProps) {
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");

  useEffect(() => {
    if (open && activeTab === "camera") {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab]);

  const startScanner = async () => {
    try {
      setError(null);
      setScanning(true);

      // Sprawdź wsparcie przeglądarki dla MediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("BROWSER_NOT_SUPPORTED");
      }

      // Sprawdź czy to HTTPS (wymagane dla camera access)
      if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        throw new Error("HTTPS_REQUIRED");
      }

      // Sprawdź permisje kamery
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermission(permission.state);

          if (permission.state === "denied") {
            throw new Error("PERMISSION_DENIED");
          }
        } catch {
          // Ignore permission query errors, będzie sprawdzone przy getUserMedia
        }
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.7778,
      };

      await scanner.start(
        { facingMode: "environment" }, // Użyj tylnej kamery
        config,
        (decodedText) => {
          // Sukces - zeskanowano kod
          onScan(decodedText);
          stopScanner();
          onOpenChange(false);
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (_errorMessage) => {
          // Błąd podczas skanowania (normalny podczas szukania kodu)
          // Ignoruj - html5-qrcode wyświetla to ciągle
        }
      );

      setScanning(false);
    } catch (err: unknown) {
      // Log tylko w dev mode, nie zaśmiecaj konsoli produkcyjnej
      if (process.env.NODE_ENV === 'development') {
        console.warn("Scanner error (handled):", err);
      }
      setScanning(false);

      // Obsługa różnych typów błędów
      const error = err as Error;
      if (error.message === "BROWSER_NOT_SUPPORTED") {
        setError("Twoja przeglądarka nie wspiera skanowania kodów kreskowych. Użyj ręcznego wprowadzania.");
      } else if (error.message === "HTTPS_REQUIRED") {
        setError("Skanowanie wymaga bezpiecznego połączenia HTTPS. Użyj ręcznego wprowadzania kodu.");
      } else if (error.message === "PERMISSION_DENIED" || error.name === "NotAllowedError") {
        setError("Brak dostępu do kamery. Zezwól na użycie kamery w ustawieniach przeglądarki.");
        setCameraPermission("denied");
      } else if (error.name === "NotFoundError") {
        setError("Nie znaleziono kamery. Użyj ręcznego wprowadzania kodu.");
      } else if (error.message?.includes("streaming not supported") || error.name === "NotSupportedError") {
        setError("Twoja przeglądarka nie wspiera streamingu z kamery. Użyj ręcznego wprowadzania kodu.");
      } else {
        setError("Nie można uruchomić skanera. Spróbuj wprowadzić kod ręcznie.");
      }

      // Automatycznie przełącz na manual input
      setActiveTab("manual");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // Ignoruj błędy przy zatrzymywaniu
      }
      scannerRef.current = null;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = manualBarcode.trim();

    if (!cleaned) {
      setError("Wprowadź kod kreskowy");
      return;
    }

    if (!/^\d{8,13}$/.test(cleaned)) {
      setError("Kod kreskowy musi mieć 8-13 cyfr");
      return;
    }

    onScan(cleaned);
    setManualBarcode("");
    onOpenChange(false);
  };

  const handleClose = () => {
    stopScanner();
    setError(null);
    setManualBarcode("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Skanuj kod kreskowy</DialogTitle>
          <DialogDescription>
            Zeskanuj kod kreskowy produktu lub wpisz go ręcznie
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "camera" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Kamera
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Ręcznie
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {/* Informacja o wymaganiach skanera */}
            {!error && typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost" && (
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3 text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-300">
                  ℹ️ Wymagane HTTPS
                </p>
                <p className="mt-1 text-blue-600 dark:text-blue-400">
                  Skanowanie kodów kreskowych wymaga bezpiecznego połączenia HTTPS.
                  W trybie produkcyjnym funkcja będzie działać prawidłowo.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {cameraPermission === "denied" && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 text-sm">
                <p className="font-semibold text-yellow-700 dark:text-yellow-300">
                  Brak dostępu do kamery
                </p>
                <p className="mt-1 text-yellow-600 dark:text-yellow-400">
                  Musisz zezwolić na użycie kamery w ustawieniach przeglądarki.
                </p>
              </div>
            )}

            <div className="relative">
              <div
                id="qr-reader"
                className="overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25"
              />

              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uruchamianie kamery...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Skieruj kamerę na kod kreskowy produktu
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Kod kreskowy</Label>
                <Input
                  id="barcode"
                  placeholder="np. 3017620422003"
                  value={manualBarcode}
                  onChange={(e) => {
                    setManualBarcode(e.target.value.replace(/\D/g, ""));
                    setError(null);
                  }}
                  maxLength={13}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Wprowadź 8-13 cyfrowy kod EAN/UPC
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Anuluj
                </Button>
                <Button type="submit" className="flex-1">
                  Wyszukaj
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

