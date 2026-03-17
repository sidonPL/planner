/**
 * Settlement Calculator - algorytm optymalizacji rozliczeń
 *
 * Problem: W grupie N osób, każda osoba zapłaciła różne kwoty.
 * Cel: Znaleźć minimalną liczbę transakcji aby wszyscy byli "kwita".
 *
 * Algorytm: Greedy approach
 * 1. Oblicz balance każdej osoby (ile dała - ile powinna dać)
 * 2. Posortuj: najwięksi dłużnicy i najwięksi kredytorzy
 * 3. Dopasuj największego dłużnika z największym kredytorem
 * 4. Powtarzaj aż wszyscy są na zero
 */

export interface Balance {
  userId: string;
  userName: string;
  balance: number; // + = dostaje, - = płaci
  color?: string;
}

export interface Settlement {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

/**
 * Oblicz rozliczenia z wydatków i splitów
 */
export function calculateSettlements(
  expenses: Array<{
    id: string;
    amount: number;
    currency: string;
    paidById: string | null;
    splits: Array<{
      userId: string;
      amount: number;
    }>;
  }>,
  participants: Array<{
    id: string;
    name: string | null;
    color?: string;
  }>
): { balances: Balance[]; settlements: Settlement[] } {
  // 1. Oblicz balance dla każdego uczestnika
  const balanceMap = new Map<string, number>();

  // Inicjalizuj wszystkich uczestników
  participants.forEach((p) => {
    balanceMap.set(p.id, 0);
  });

  // Przetwórz każdy wydatek
  expenses.forEach((expense) => {
    const paidById = expense.paidById;
    if (!paidById) return;

    // Kto zapłacił? Dostaje + amount
    const currentBalance = balanceMap.get(paidById) || 0;
    balanceMap.set(paidById, currentBalance + expense.amount);

    // Kto powinien zapłacić? Daje - amount
    expense.splits.forEach((split) => {
      const currentSplitBalance = balanceMap.get(split.userId) || 0;
      balanceMap.set(split.userId, currentSplitBalance - split.amount);
    });
  });

  // 2. Przekształć do array i zaokrąglij
  const balances: Balance[] = Array.from(balanceMap.entries())
    .map(([userId, balance]) => {
      const participant = participants.find((p) => p.id === userId);
      return {
        userId,
        userName: participant?.name || 'Nieznany',
        balance: Math.round(balance * 100) / 100, // Zaokrąglij do 2 miejsc
        color: participant?.color,
      };
    })
    .filter((b) => Math.abs(b.balance) > 0.01); // Ignoruj różnice < 1 grosz

  // 3. Oblicz optymalne rozliczenia
  const settlements: Settlement[] = [];

  // Kopiuj balances do manipulacji
  const creditors = balances.filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter((b) => b.balance < 0).sort((a, b) => a.balance - b.balance);

  let i = 0; // index creditors
  let j = 0; // index debtors

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Ile można rozliczyć?
    const settleAmount = Math.min(creditor.balance, Math.abs(debtor.balance));

    if (settleAmount > 0.01) {
      settlements.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: Math.round(settleAmount * 100) / 100,
        currency: 'PLN', // TODO: multi-currency support
      });

      creditor.balance -= settleAmount;
      debtor.balance += settleAmount;
    }

    // Move to next
    if (Math.abs(creditor.balance) < 0.01) i++;
    if (Math.abs(debtor.balance) < 0.01) j++;
  }

  return {
    balances: balances.sort((a, b) => b.balance - a.balance),
    settlements,
  };
}

/**
 * Automatycznie podziel wydatek równo między uczestników
 */
export function dividEvenly(
  totalAmount: number,
  participantIds: string[]
): Array<{ userId: string; amount: number }> {
  if (participantIds.length === 0) return [];

  const amountPerPerson = totalAmount / participantIds.length;
  const roundedAmount = Math.round(amountPerPerson * 100) / 100;

  // Rozłóż resztę na pierwszych N osób
  const remainder = Math.round((totalAmount - roundedAmount * participantIds.length) * 100) / 100;
  const remainderPerPerson = Math.round((remainder / participantIds.length) * 100) / 100;

  return participantIds.map((userId, index) => ({
    userId,
    amount: index === 0 ? roundedAmount + remainder : roundedAmount,
  }));
}

/**
 * Oblicz ile każdy wydał vs ile powinien wydać
 */
export function calculateExpenseStats(
  expenses: Array<{
    amount: number;
    currency: string;
    paidById: string | null;
    splits: Array<{
      userId: string;
      amount: number;
    }>;
  }>,
  userId: string
): {
  totalPaid: number;
  totalOwed: number;
  balance: number;
} {
  let totalPaid = 0;
  let totalOwed = 0;

  expenses.forEach((expense) => {
    // Ile zapłaciłem?
    if (expense.paidById === userId) {
      totalPaid += expense.amount;
    }

    // Ile powinienem zapłacić?
    const mySplit = expense.splits.find((s) => s.userId === userId);
    if (mySplit) {
      totalOwed += mySplit.amount;
    }
  });

  return {
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    balance: Math.round((totalPaid - totalOwed) * 100) / 100,
  };
}
