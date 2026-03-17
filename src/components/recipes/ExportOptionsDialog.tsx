"use client";

import { useState } from "react";
import { Download, FileText, BookOpen, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportOptionsDialogProps {
  onExport: (options: ExportOptions) => void;
  isExporting: boolean;
  currentServings: number;
  originalServings: number;
}

export interface ExportOptions {
  servingsMultiplier: number;
  includeQR: boolean;
  includeImage: boolean;
  cardFormat?: boolean;
  fontFamily?: string;
  accentColor?: string;
  includeCheckboxes?: boolean;
  printMode?: boolean;
  pageSize?: 'A4' | 'A5' | 'LETTER';
}

const ACCENT_COLORS: Record<string, string> = {
  purple: '#8b5cf6',
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  orange: '#f97316',
  pink: '#ec4899',
};

export function ExportOptionsDialog({
  onExport,
  isExporting,
  currentServings,
  originalServings,
}: ExportOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [servingsMultiplier, setServingsMultiplier] = useState(currentServings / originalServings);
  const [includeQR, setIncludeQR] = useState(true);
  const [includeImage, setIncludeImage] = useState(true);
  const [cardFormat, setCardFormat] = useState(false);
  const [fontFamily, setFontFamily] = useState("courier"); // Courier obsługuje polskie znaki
  const [accentColor, setAccentColor] = useState<keyof typeof ACCENT_COLORS>("purple");
  const [includeCheckboxes, setIncludeCheckboxes] = useState(false);
  const [printMode, setPrintMode] = useState(false);
  const [pageSize, setPageSize] = useState<'A4' | 'A5' | 'LETTER'>('A4');

  const handleExport = () => {
    onExport({
      servingsMultiplier,
      includeQR,
      includeImage,
      cardFormat,
      fontFamily,
      accentColor: ACCENT_COLORS[accentColor],
      includeCheckboxes,
      printMode,
      pageSize: cardFormat ? 'A5' : pageSize,
    });
    setOpen(false);
  };

  const scaledServings = Math.round(originalServings * servingsMultiplier);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" disabled={isExporting} className="bg-purple-600 hover:bg-purple-700">
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Generowanie..." : "Exportuj PDF"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Eksport do PDF
          </DialogTitle>
          <DialogDescription>
            Dostosuj opcje eksportu przepisu do pliku PDF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Porcje */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Liczba porcji</Label>
              <span className="text-sm font-medium">{scaledServings}</span>
            </div>
            <Slider
              value={[servingsMultiplier]}
              onValueChange={([value]) => setServingsMultiplier(value)}
              min={0.5}
              max={4}
              step={0.5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Składniki zostaną automatycznie przeskalowane
            </p>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <Label>Format strony</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={!cardFormat ? "default" : "outline"}
                size="sm"
                onClick={() => setCardFormat(false)}
                className="justify-start"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Standard
              </Button>
              <Button
                variant={cardFormat ? "default" : "outline"}
                size="sm"
                onClick={() => setCardFormat(true)}
                className="justify-start"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Karta
              </Button>
            </div>
            {!cardFormat && (
              <div className="mt-2">
                <Select value={pageSize} onValueChange={(value: 'A4' | 'A5' | 'LETTER') => setPageSize(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (21×29.7 cm)</SelectItem>
                    <SelectItem value="A5">A5 (14.8×21 cm)</SelectItem>
                    <SelectItem value="LETTER">Letter (21.6×27.9 cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Opcje zawartości */}
          <div className="space-y-3">
            <Label>Zawartość</Label>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="qr" className="font-normal">
                  QR kod z linkiem
                </Label>
                <Switch
                  id="qr"
                  checked={includeQR}
                  onCheckedChange={setIncludeQR}
                  disabled={cardFormat}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="image" className="font-normal">
                  Zdjęcie przepisu
                </Label>
                <Switch
                  id="image"
                  checked={includeImage}
                  onCheckedChange={setIncludeImage}
                  disabled={cardFormat}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="checkboxes" className="font-normal">
                  Checkboxy przy składnikach
                </Label>
                <Switch
                  id="checkboxes"
                  checked={includeCheckboxes}
                  onCheckedChange={setIncludeCheckboxes}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="printMode" className="font-normal">
                  Tryb druku (oszczędność tuszu)
                </Label>
                <Switch
                  id="printMode"
                  checked={printMode}
                  onCheckedChange={setPrintMode}
                />
              </div>
            </div>
          </div>

          {/* Styl */}
          <div className="space-y-3">
            <Label>Czcionka</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="courier">Courier (polskie znaki ✓)</SelectItem>
                <SelectItem value="helvetica">Helvetica (klasyczna)</SelectItem>
                <SelectItem value="times">Times (elegancka)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Kolor akcentu */}
          <div className="space-y-3">
            <Label>Kolor akcentu</Label>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(ACCENT_COLORS).map(([name, hex]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setAccentColor(name as keyof typeof ACCENT_COLORS)}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    accentColor === name ? "border-primary scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                  title={name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Anuluj
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            Pobierz PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

