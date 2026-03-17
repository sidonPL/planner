'use client';

import { useEffect, useRef } from 'react';

interface CountingNumberProps {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Komponent animującego się licznika - liczba animuje się od 0 do wartości docelowej
 */
export function CountingNumber({
  value,
  duration = 1000,
  className = '',
  decimals = 0,
  prefix = '',
  suffix = '',
}: CountingNumberProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const startValue = 0;
    const difference = value - startValue;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (easeOutCubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + difference * easeProgress;

      if (element) {
        element.textContent = `${prefix}${currentValue.toFixed(decimals)}${suffix}`;
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      startTimeRef.current = undefined;
    };
  }, [value, duration, decimals, prefix, suffix]);

  return <span ref={elementRef} className={className}>0</span>;
}

