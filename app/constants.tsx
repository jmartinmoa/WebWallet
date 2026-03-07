import { AppData, Category } from "./types";


export const DEFAULT_PASSWORD = 'admin';

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'inc-1', name: 'Salary', color: '#10b981', type: 'income' },
  { id: 'inc-2', name: 'Freelance', color: '#06b6d4', type: 'income' },
  { id: 'inc-3', name: 'Investment Returns', color: '#8b5cf6', type: 'income' },
  { id: 'inc-4', name: 'Other Income', color: '#f59e0b', type: 'income' },
  // Expense
  { id: 'exp-1', name: 'Food & Dining', color: '#ef4444', type: 'expense' },
  { id: 'exp-2', name: 'Transport', color: '#f97316', type: 'expense' },
  { id: 'exp-3', name: 'Housing', color: '#eab308', type: 'expense' },
  { id: 'exp-4', name: 'Healthcare', color: '#ec4899', type: 'expense' },
  { id: 'exp-5', name: 'Entertainment', color: '#a855f7', type: 'expense' },
  { id: 'exp-6', name: 'Shopping', color: '#14b8a6', type: 'expense' },
  { id: 'exp-7', name: 'Utilities', color: '#6366f1', type: 'expense' },
  { id: 'exp-8', name: 'Education', color: '#0ea5e9', type: 'expense' },
  // Investment
  { id: 'inv-1', name: 'Stocks', color: '#10b981', type: 'investment' },
  { id: 'inv-2', name: 'Crypto', color: '#f59e0b', type: 'investment' },
  { id: 'inv-3', name: 'Real Estate', color: '#8b5cf6', type: 'investment' },
  { id: 'inv-4', name: 'Bonds', color: '#06b6d4', type: 'investment' },
  { id: 'inv-5', name: 'ETF', color: '#ec4899', type: 'investment' },
  // Shop/Source
  { id: 'shop-1', name: 'Amazon', color: '#f97316', type: 'shop' },
  { id: 'shop-2', name: 'Supermarket', color: '#10b981', type: 'shop' },
  { id: 'shop-3', name: 'Online', color: '#6366f1', type: 'shop' },
];

export const DEFAULT_DATA: AppData = {
  transactions: [],
  investments: [],
  cards: [],
  debts: [],
  subscriptions: [],
  reminders: [],
  categories: DEFAULT_CATEGORIES,
  settings: {
    gasApiUrl: '',
    reminderThresholdDays: 7,
    hideAmounts: false,
    theme: 'light',
  },
};

export const CARD_COLORS = [
  '#1e293b', '#0f172a', '#1e3a5f', '#134e4a',
  '#4a1d96', '#7c2d12', '#064e3b', '#1e1b4b',
  '#831843', '#78350f',
];

export const CHART_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#f97316',
  '#14b8a6', '#a855f7',
];