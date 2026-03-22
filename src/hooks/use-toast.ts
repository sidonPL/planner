import { toast as sonnerToast } from "sonner";
import { useCallback, useMemo } from "react";

export function useToast() {
  const toast = useCallback(({
      title,
      description,
      variant = "default",
    }: {
      title?: string;
      description?: string;
      variant?: "default" | "destructive";
    }) => {
      if (variant === "destructive") {
        sonnerToast.error(title || "", {
          description,
        });
      } else {
        sonnerToast.success(title || "", {
          description,
        });
      }
    }, []);

  return useMemo(() => ({ toast }), [toast]);
}

