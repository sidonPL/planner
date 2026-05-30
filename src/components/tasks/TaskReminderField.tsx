"use client";

import { useState } from "react";
import { Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  customReminderUnits,
  customValueToMinutes,
  formatReminderLabel,
  reminderPresets,
  type CustomReminderUnit,
} from "@/lib/reminder-options";

interface TaskReminderFieldProps {
  value: number[];
  onChange: (value: number[]) => void;
  description?: string;
}

function BadgeRemovable({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 text-xs">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-background"
        aria-label={`Usuń przypomnienie ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function TaskReminderField({
  value,
  onChange,
  description = "Powiadomienie push/e-mail wysyłane przed terminem zadania lub rutyny.",
}: TaskReminderFieldProps) {
  const [customReminderValue, setCustomReminderValue] = useState("");
  const [customReminderUnit, setCustomReminderUnit] =
    useState<CustomReminderUnit>("minutes");

  const toggleReminder = (minutes: number) => {
    const next = value.includes(minutes)
      ? value.filter((entry) => entry !== minutes)
      : [...value, minutes];
    onChange(next.sort((a, b) => a - b));
  };

  const removeReminder = (minutes: number) => {
    onChange(value.filter((entry) => entry !== minutes));
  };

  const addCustomReminder = () => {
    const parsed = Number.parseInt(customReminderValue, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    const minutes = customValueToMinutes(parsed, customReminderUnit);
    if (value.includes(minutes)) return;

    onChange([...value, minutes].sort((a, b) => a - b));
    setCustomReminderValue("");
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="space-y-1">
        <Label className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Przypomnienia
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {reminderPresets.map((preset) => {
          const active = value.includes(preset.value);
          return (
            <Button
              key={preset.value}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => toggleReminder(preset.value)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <Input
          type="number"
          min={1}
          value={customReminderValue}
          onChange={(e) => setCustomReminderValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomReminder();
            }
          }}
          placeholder="Własna wartość"
        />
        <Select
          value={customReminderUnit}
          onValueChange={(unit) => setCustomReminderUnit(unit as CustomReminderUnit)}
        >
          <SelectTrigger className="w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {customReminderUnits.map((unit) => (
              <SelectItem key={unit.value} value={unit.value}>
                {unit.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="icon" onClick={addCustomReminder}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((minutes) => (
            <BadgeRemovable
              key={minutes}
              label={formatReminderLabel(minutes)}
              onRemove={() => removeReminder(minutes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
