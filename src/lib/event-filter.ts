/**
 * Typy i parsowanie dla zaawansowanego filtrowania wydarzeń
 */

export interface EventFilterConfig {
  mode: "simple" | "advanced";

  // Simple mode (backward compatible)
  keywords?: string[]; // ["praca", "spotkanie"]

  // Advanced mode
  rules?: FilterRule[];
  logic?: "AND" | "OR"; // Jak łączyć reguły
}

export interface FilterRule {
  field: "title" | "description" | "location" | "category";
  operator: "contains" | "equals" | "regex" | "startsWith" | "endsWith";
  value: string;
  caseSensitive?: boolean;
}

/**
 * Parsuje eventFilter string do obiektu konfiguracji
 */
export function parseEventFilter(eventFilter: string | null): EventFilterConfig | null {
  if (!eventFilter) return null;

  try {
    // Jeśli zaczyna się od {, to JSON (advanced)
    if (eventFilter.trim().startsWith("{")) {
      return JSON.parse(eventFilter) as EventFilterConfig;
    }

    // W przeciwnym razie, backward compatible (simple)
    return {
      mode: "simple",
      keywords: eventFilter.split(",").map((k) => k.trim()).filter(Boolean),
    };
  } catch {
    // Fallback do simple
    return {
      mode: "simple",
      keywords: eventFilter.split(",").map((k) => k.trim()).filter(Boolean),
    };
  }
}

/**
 * Sprawdza czy wydarzenie pasuje do filtra
 */
export function matchesEventFilter(
  event: {
    summary: string;
    description?: string;
    location?: string;
    categories?: string[];
  },
  filter: EventFilterConfig
): boolean {
  if (filter.mode === "simple") {
    // Backward compatible - keyword search
    if (!filter.keywords || filter.keywords.length === 0) return true;

    const searchText = `${event.summary} ${event.description || ""} ${event.location || ""}`.toLowerCase();
    return filter.keywords.some((keyword) => searchText.includes(keyword.toLowerCase()));
  }

  // Advanced mode
  if (!filter.rules || filter.rules.length === 0) return true;

  const results = filter.rules.map((rule) => matchesRule(event, rule));

  if (filter.logic === "AND") {
    return results.every((r) => r);
  } else {
    // OR (default)
    return results.some((r) => r);
  }
}

/**
 * Sprawdza pojedynczą regułę
 */
function matchesRule(
  event: {
    summary: string;
    description?: string;
    location?: string;
    categories?: string[];
  },
  rule: FilterRule
): boolean {
  let fieldValue = "";

  switch (rule.field) {
    case "title":
      fieldValue = event.summary;
      break;
    case "description":
      fieldValue = event.description || "";
      break;
    case "location":
      fieldValue = event.location || "";
      break;
    case "category":
      fieldValue = event.categories?.join(" ") || "";
      break;
  }

  const compareValue = rule.caseSensitive ? fieldValue : fieldValue.toLowerCase();
  const ruleValue = rule.caseSensitive ? rule.value : rule.value.toLowerCase();

  switch (rule.operator) {
    case "contains":
      return compareValue.includes(ruleValue);
    case "equals":
      return compareValue === ruleValue;
    case "startsWith":
      return compareValue.startsWith(ruleValue);
    case "endsWith":
      return compareValue.endsWith(ruleValue);
    case "regex":
      try {
        const regex = new RegExp(ruleValue, rule.caseSensitive ? "" : "i");
        return regex.test(fieldValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Serializuje konfigurację filtra do stringa
 */
export function serializeEventFilter(filter: EventFilterConfig): string {
  if (filter.mode === "simple") {
    return filter.keywords?.join(", ") || "";
  }

  return JSON.stringify(filter);
}

