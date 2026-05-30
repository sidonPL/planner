"use client";

import { Bell } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatReminderLabel } from "@/lib/reminder-options";
import { cn } from "@/lib/utils";

interface TaskReminderIndicatorProps {
  reminderMinutes?: number[] | null;
  className?: string;
  iconClassName?: string;
}

function getReminderMinutes(reminderMinutes?: number[] | null): number[] {
  if (!Array.isArray(reminderMinutes) || reminderMinutes.length === 0) {
    return [];
  }

  return [...reminderMinutes].sort((a, b) => a - b);
}

export function TaskReminderIndicator({
  reminderMinutes,
  className,
  iconClassName,
}: TaskReminderIndicatorProps) {
  const reminders = getReminderMinutes(reminderMinutes);

  if (reminders.length === 0) {
    return null;
  }

  const summary = reminders.map(formatReminderLabel).join(", ");
  const countLabel =
    reminders.length === 1 ? "1 przypomnienie" : `${reminders.length} przypomnienia`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-muted-foreground",
              className
            )}
            aria-label={`Przypomnienia: ${summary}`}
          >
            <Bell className={cn("h-3 w-3 shrink-0 text-amber-600", iconClassName)} />
            {reminders.length > 1 && (
              <span className="text-[10px] font-medium leading-none text-amber-700">
                {reminders.length}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-medium">{countLabel}</p>
          <p className="text-xs text-muted-foreground">{summary}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function formatTaskReminderSummary(reminderMinutes?: number[] | null): string {
  return getReminderMinutes(reminderMinutes).map(formatReminderLabel).join(", ");
}
