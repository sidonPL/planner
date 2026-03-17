"use client";

import { useEffect, useRef } from "react";

interface DrawingViewerProps {
  drawing: string;
  className?: string;
}

type DrawingPath = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

export function DrawingViewer({ drawing, className }: DrawingViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!drawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const paths: DrawingPath[] = JSON.parse(drawing);

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
    } catch (error) {
      console.error("Error rendering drawing:", error);
    }
  }, [drawing]);

  if (!drawing) return null;

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className={className}
    />
  );
}

