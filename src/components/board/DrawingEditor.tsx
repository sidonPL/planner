"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Pen, Eraser, Trash2, Undo, Redo } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawingEditorProps {
  initialDrawing?: string;
  onDrawingChange: (drawing: string) => void;
  className?: string;
}

type DrawingPath = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export function DrawingEditor({ initialDrawing, onDrawingChange, className }: DrawingEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [history, setHistory] = useState<DrawingPath[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const colors = [
    "#000000", // Czarny
    "#EF4444", // Czerwony
    "#3B82F6", // Niebieski
    "#10B981", // Zielony
    "#F59E0B", // Pomarańczowy
    "#8B5CF6", // Fioletowy
    "#EC4899", // Różowy
    "#14B8A6", // Turkusowy
  ];

  // Wczytaj rysunek z JSON
  useEffect(() => {
    if (initialDrawing) {
      try {
        const loadedPaths = JSON.parse(initialDrawing);
        // Użyj callback aby uniknąć ostrzeżenia
        setPaths(() => loadedPaths);
        setHistory(() => [loadedPaths]);
        setHistoryIndex(0);
      } catch (error) {
        console.error("Error loading drawing:", error);
      }
    }
  }, [initialDrawing]);

  // Rysuj na canvasie
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Wyczyść canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rysuj wszystkie ścieżki
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);

      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }

      ctx.stroke();
    });

    // Rysuj aktualną ścieżkę
    if (currentPath && currentPath.points.length > 0) {
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      ctx.moveTo(currentPath.points[0].x, currentPath.points[0].y);

      for (let i = 1; i < currentPath.points.length; i++) {
        ctx.lineTo(currentPath.points[i].x, currentPath.points[i].y);
      }

      ctx.stroke();
    }
  }, [paths, currentPath]);

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);

    const point = getCanvasPoint(e);
    setCurrentPath({
      points: [point],
      color: tool === "eraser" ? "#FFFFFF" : color,
      width: tool === "eraser" ? lineWidth * 3 : lineWidth,
    });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentPath) return;

    const point = getCanvasPoint(e);
    setCurrentPath({
      ...currentPath,
      points: [...currentPath.points, point],
    });
  };

  const stopDrawing = () => {
    if (currentPath && currentPath.points.length > 0) {
      const newPaths = [...paths, currentPath];
      setPaths(newPaths);

      // Zapisz do historii
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPaths);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      // Zapisz do JSON
      onDrawingChange(JSON.stringify(newPaths));
    }

    setIsDrawing(false);
    setCurrentPath(null);
  };

  const clearCanvas = () => {
    setPaths([]);
    setCurrentPath(null);
    setHistory([[]]);
    setHistoryIndex(0);
    onDrawingChange("");
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
      onDrawingChange(JSON.stringify(history[newIndex]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setPaths(history[newIndex]);
      onDrawingChange(JSON.stringify(history[newIndex]));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted rounded-lg">
        {/* Narzędzia */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
          >
            <Pen className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {/* Kolory */}
        {tool === "pen" && (
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        )}

        {/* Grubość linii */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <span className="text-sm text-muted-foreground">Grubość:</span>
          <Slider
            value={[lineWidth]}
            onValueChange={(v: number[]) => setLineWidth(v[0])}
            min={1}
            max={10}
            step={1}
            className="flex-1"
          />
          <span className="text-sm font-medium w-6">{lineWidth}</span>
        </div>

        {/* Akcje */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={undo}
            disabled={historyIndex <= 0}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
          >
            <Redo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearCanvas}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="w-full border-2 border-border rounded-lg cursor-crosshair bg-white touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}

