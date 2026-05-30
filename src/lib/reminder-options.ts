export const reminderPresets = [
  { label: "10 min wcześniej", value: 10 },
  { label: "30 min wcześniej", value: 30 },
  { label: "1 godz. wcześniej", value: 60 },
  { label: "2 godz. wcześniej", value: 120 },
  { label: "1 dzień wcześniej", value: 1440 },
  { label: "7 dni wcześniej", value: 10080 },
] as const;

export const customReminderUnits = [
  { label: "min", value: "minutes", multiplier: 1 },
  { label: "godz", value: "hours", multiplier: 60 },
  { label: "dni", value: "days", multiplier: 1440 },
] as const;

export type CustomReminderUnit = (typeof customReminderUnits)[number]["value"];

export function formatReminderLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min wcześniej`;
  }
  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? "dzień" : "dni"} wcześniej`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? "godz." : "godz."} wcześniej`;
  }
  return `${minutes} min wcześniej`;
}

export function customValueToMinutes(value: number, unit: CustomReminderUnit): number {
  const multiplier =
    customReminderUnits.find((entry) => entry.value === unit)?.multiplier ?? 1;
  return Math.max(1, Math.round(value * multiplier));
}
