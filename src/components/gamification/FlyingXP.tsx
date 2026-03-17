'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Star, Sparkles } from 'lucide-react';
import { playXPEarn } from '@/lib/sound-effects';

interface FlyingXPProps {
  xp: number;
  startX: number;
  startY: number;
  onComplete?: () => void;
}

/**
 * Komponent latającego XP - animacja po zdobyciu punktów
 */
function FlyingXPElement({ xp, startX, startY, onComplete }: FlyingXPProps) {
  useEffect(() => {
    // Play XP sound
    playXPEarn();

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: startX,
        top: startY,
        animation: 'flyToTopRight 2s ease-out forwards',
      }}
    >
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white font-bold shadow-lg">
        {xp >= 50 ? (
          <Sparkles className="h-4 w-4" />
        ) : (
          <Star className="h-4 w-4 fill-current" />
        )}
        <span>+{xp} XP</span>
      </div>

      <style jsx>{`
        @keyframes flyToTopRight {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(100px, -100px) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate(200px, -200px) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

interface FlyingXPManagerProps {
  items: Array<{
    id: string;
    xp: number;
    x: number;
    y: number;
  }>;
  onRemove: (id: string) => void;
}

/**
 * Manager dla wielu latających XP
 */
export function FlyingXPManager({ items, onRemove }: FlyingXPManagerProps) {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      {items.map((item) => (
        <FlyingXPElement
          key={item.id}
          xp={item.xp}
          startX={item.x}
          startY={item.y}
          onComplete={() => onRemove(item.id)}
        />
      ))}
    </>,
    document.body
  );
}

/**
 * Hook do zarządzania latającymi XP
 */
export function useFlyingXP() {
  const [items, setItems] = useState<Array<{
    id: string;
    xp: number;
    x: number;
    y: number;
  }>>([]);

  const showFlyingXP = (xp: number, element?: HTMLElement) => {
    const rect = element?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top : window.innerHeight / 2;

    const id = `xp-${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, xp, x, y }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return {
    showFlyingXP,
    FlyingXPComponent: () => <FlyingXPManager items={items} onRemove={removeItem} />,
  };
}

