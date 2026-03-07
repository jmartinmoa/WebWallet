import { Transaction, Reminder, AppData } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number, hide = false): string {
  if (hide) return '••••••';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// ── Timezone-safe date parsing ────────────────────────────────────────────────
// new Date('2024-01-15')           → UTC midnight → shows Jan 14 in UTC-6  ❌
// new Date('2024-01-15T00:00:00')  → local midnight → always correct        ✓
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('T')) return new Date(dateStr); // already has time, use as-is
  return new Date(`${dateStr}T00:00:00`);
}

export function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function getWeekLabel(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

export function groupTransactionsByWeek(transactions: Transaction[]): Record<string, Transaction[]> {
  const sorted = [...transactions].sort(
    (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );
  return sorted.reduce((acc, tx) => {
    const label = getWeekLabel(tx.date);
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);
}

export function getMonthTransactions(transactions: Transaction[], month: number, year: number): Transaction[] {
  return transactions.filter((t) => {
    const d = parseLocalDate(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

export function calcTotals(transactions: Transaction[], month: number, year: number) {
  const monthly = getMonthTransactions(transactions, month, year);
  const income   = monthly.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = monthly.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expenses, net: income - expenses };
}

export function getUpcomingReminders(reminders: Reminder[], thresholdDays: number): Reminder[] {
  const now       = new Date();
  const threshold = new Date(now.getTime() + thresholdDays * 86400000);
  return reminders.filter((r) => {
    if (r.status !== 'pending') return false;
    const d = parseLocalDate(r.date);
    return d >= now && d <= threshold;
  });
}

export function getOverdueReminders(reminders: Reminder[]): Reminder[] {
  const now = new Date();
  return reminders.filter((r) => r.status === 'pending' && parseLocalDate(r.date) < now);
}

export function calcDebtProgress(debt: { totalAmount: number; installments: number; paidInstallments: number }) {
  const installmentAmount = debt.totalAmount / debt.installments;
  const paid      = installmentAmount * debt.paidInstallments;
  const remaining = debt.totalAmount - paid;
  const pct       = debt.installments > 0 ? (debt.paidInstallments / debt.installments) * 100 : 0;
  return { paid, remaining, pct, installmentAmount };
}

export function getMonthName(month: number): string {
  return new Date(2000, month, 1).toLocaleString('en-US', { month: 'long' });
}

export function getLast12Months(): { month: number; year: number; label: string }[] {
  const result = [];
  const now    = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: d.getMonth(), year: d.getFullYear(),
      label: `${getMonthName(d.getMonth())} ${d.getFullYear()}` });
  }
  return result;
}

export function processRecurringReminders(data: AppData): AppData {
  const now     = new Date();
  const updated = data.reminders.map((r) => {
    if (!r.recurring || r.status !== 'completed') return r;
    const completed = r.completedDate ? parseLocalDate(r.completedDate) : null;
    if (!completed) return r;
    const nextDate = parseLocalDate(r.date);
    while (nextDate <= now) nextDate.setMonth(nextDate.getMonth() + 1);
    return { ...r, date: nextDate.toISOString().split('T')[0],
      status: 'pending' as const, completedDate: undefined };
  });
  return { ...data, reminders: updated };
}

