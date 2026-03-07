export type TransactionType = 'income' | 'expense';
export type CardType = 'credit' | 'debit';
export type DebtStatus = 'active' | 'paid';
export type ReminderStatus = 'pending' | 'completed' | 'expired';
export type SubscriptionFrequency = 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'paused' | 'canceled' | 'trial';

export interface Category {
  id: string;
  name: string;
  color: string;
  type: 'income' | 'expense' | 'investment' | 'shop';
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  cardId?: string;
  shopId?: string;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  amountInvested: number;
  currentValue: number;
  date: string;
}

export interface Card {
  id: string;
  name: string;
  type: CardType;
  last4: string;
  limit?: number;
  balance: number;
  dueDate?: number;
  color: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  installments: number;
  paidInstallments: number;
  cardId?: string;
  startDate: string;
  status: DebtStatus;
}

export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: SubscriptionFrequency;
  startDate: string;
  status: SubscriptionStatus;
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string;
  status: ReminderStatus;
  recurring: boolean;
  completedDate?: string;
}

export interface AppData {
  transactions: Transaction[];
  investments: Investment[];
  cards: Card[];
  debts: Debt[];
  subscriptions: Subscription[];
  reminders: Reminder[];
  categories: Category[];
  settings: AppSettings;
}

export interface AppSettings {
  gasApiUrl: string;
  reminderThresholdDays: number;
  hideAmounts: boolean;
  theme: 'light' | 'dark';
}