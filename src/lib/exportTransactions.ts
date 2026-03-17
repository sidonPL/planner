import { Transaction } from "@prisma/client";

type TransactionWithDetails = Transaction & {
  user?: { name: string | null };
  account?: { name: string; type: string };
};

/**
 * Eksportuje transakcje do formatu CSV
 */
export function exportTransactionsToCSV(
  transactions: TransactionWithDetails[],
  filename: string = "transakcje.csv"
): void {
  // Nagłówki CSV
  const headers = [
    "Data",
    "Typ",
    "Kategoria",
    "Kwota",
    "Waluta",
    "Konto",
    "Typ konta",
    "Opis",
    "Użytkownik",
  ];

  // Konwersja transakcji do wierszy CSV
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("pl-PL"),
    t.type === "INCOME" ? "Przychód" : "Wydatek",
    t.category || "",
    t.amount.toFixed(2),
    t.account?.name ? "PLN" : "", // Domyślnie PLN jeśli jest konto
    t.account?.name || "Brak konta",
    t.account?.type || "",
    t.description || "",
    t.user?.name || "",
  ]);

  // Łączenie nagłówków i wierszy
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Dodanie BOM dla poprawnego kodowania UTF-8 w Excel
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Pobranie pliku
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Eksportuje transakcje pogrupowane według kont do oddzielnych sekcji CSV
 */
export function exportTransactionsByAccount(
  transactions: TransactionWithDetails[],
  filename: string = "transakcje-po-kontach.csv"
): void {
  // Grupowanie transakcji według konta
  const transactionsByAccount = transactions.reduce((acc, t) => {
    const accountName = t.account?.name || "Bez konta";
    if (!acc[accountName]) {
      acc[accountName] = [];
    }
    acc[accountName].push(t);
    return {};
  }, {} as Record<string, TransactionWithDetails[]>);

  // Tworzenie sekcji dla każdego konta
  const sections: string[] = [];

  Object.entries(transactionsByAccount).forEach(([accountName, accountTransactions]) => {
    // Nagłówek sekcji
    sections.push(`\n"${accountName}"`);
    sections.push("");

    // Nagłówki kolumn
    const headers = ["Data", "Typ", "Kategoria", "Kwota", "Opis", "Użytkownik"];
    sections.push(headers.join(","));

    // Wiersze transakcji
    accountTransactions.forEach((t) => {
      const row = [
        new Date(t.date).toLocaleDateString("pl-PL"),
        t.type === "INCOME" ? "Przychód" : "Wydatek",
        t.category || "",
        t.amount.toFixed(2),
        t.description || "",
        t.user?.name || "",
      ];
      sections.push(
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      );
    });

    // Podsumowanie dla konta
    const totalIncome = accountTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = accountTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    sections.push("");
    sections.push(`"Suma przychodów:",${totalIncome.toFixed(2)}`);
    sections.push(`"Suma wydatków:",${totalExpense.toFixed(2)}`);
    sections.push(`"Bilans:",${(totalIncome - totalExpense).toFixed(2)}`);
  });

  // Dodanie podsumowania globalnego
  sections.push("\n\"PODSUMOWANIE OGÓLNE\"");
  sections.push("");
  const globalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);
  const globalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);
  sections.push(`"Wszystkie przychody:",${globalIncome.toFixed(2)}`);
  sections.push(`"Wszystkie wydatki:",${globalExpense.toFixed(2)}`);
  sections.push(`"Bilans ogólny:",${(globalIncome - globalExpense).toFixed(2)}`);

  // Tworzenie pliku
  const csvContent = sections.join("\n");
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Pobranie pliku
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

