"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ButtonSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react";

type ConfirmVariant = "danger" | "warning" | "info" | "default";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: ConfirmVariant;
  isLoading?: boolean;
}

const variantConfig: Record<ConfirmVariant, {
  icon: typeof AlertTriangle;
  iconClass: string;
  buttonClass: string;
}> = {
  danger: {
    icon: Trash2,
    iconClass: "text-destructive bg-destructive/10",
    buttonClass: "bg-destructive hover:bg-destructive/90",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 bg-amber-100 dark:bg-amber-900/30",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    icon: Info,
    iconClass: "text-blue-600 bg-blue-100 dark:bg-blue-900/30",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
  },
  default: {
    icon: HelpCircle,
    iconClass: "text-muted-foreground bg-muted",
    buttonClass: "",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
              config.iconClass
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="mt-2">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(config.buttonClass)}
          >
            {isLoading && <ButtonSpinner className="mr-2" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook do łatwego użycia ConfirmDialog
import { useState, useCallback } from "react";

interface UseConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export function useConfirmDialog(options: UseConfirmDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(async () => {
    resolvePromise?.(true);
    setIsOpen(false);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    resolvePromise?.(false);
    setIsOpen(false);
  }, [resolvePromise]);

  const ConfirmDialogComponent = useCallback(() => (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      isLoading={isLoading}
      onConfirm={handleConfirm}
    />
  ), [isOpen, isLoading, options, handleConfirm, handleCancel]);

  return {
    confirm,
    setIsLoading,
    ConfirmDialog: ConfirmDialogComponent,
  };
}

