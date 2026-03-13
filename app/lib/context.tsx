'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppData, Transaction, Investment, Card, Debt, Subscription, Reminder, Category, AppSettings } from '../types';
import { loadData, saveData, syncToGAS, loadFromGAS } from '../lib/storage';
import { generateId, processRecurringReminders } from '../lib/utils';

interface AppContextType {
  data: AppData;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addInvestment: (i: Omit<Investment, 'id'>) => void;
  updateInvestment: (i: Investment) => void;
  deleteInvestment: (id: string) => void;
  addCard: (c: Omit<Card, 'id'>) => void;
  updateCard: (c: Card) => void;
  deleteCard: (id: string) => void;
  addDebt: (d: Omit<Debt, 'id'>) => void;
  updateDebt: (d: Debt) => void;
  deleteDebt: (id: string) => void;
  addSubscription: (s: Omit<Subscription, 'id'>) => void;
  updateSubscription: (s: Subscription) => void;
  deleteSubscription: (id: string) => void;
  addReminder: (r: Omit<Reminder, 'id'>) => void;
  updateReminder: (r: Reminder) => void;
  deleteReminder: (id: string) => void;
  completeReminder: (id: string) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  setData: (d: AppData) => void;
  syncCloud: (overrideData?: AppData) => Promise<boolean>;
  pullCloud: () => Promise<boolean>;
  isSyncing: boolean;
  isPulling: boolean;
  isBooting: boolean;       // true while initial pull from Drive is in progress
  lastSynced: Date | null;
  lastPulled: Date | null;
}

const AppContext = createContext<AppContextType | null>(null);

function useDebouncedCallback(fn: (...args: any[]) => void, ms: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), ms);
  }, [fn, ms]);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setDataState]   = useState<AppData>(() => loadData());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isBooting, setIsBooting] = useState(false); // boot pull in progress
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [lastPulled, setLastPulled] = useState<Date | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;

  // ── persist locally ───────────────────────────────────────────────────────
  const persist = useCallback((newData: AppData) => {
    setDataState(newData);
    saveData(newData);
    dataRef.current = newData;
  }, []);

  // ── debounced cloud push (fires 1.5s after last change) ───────────────────
  const debouncedCloudPush = useDebouncedCallback(async (d: AppData) => {
    const url = d?.settings?.gasApiUrl;
    if (!url) return;
    setIsSyncing(true);
    try {
      await syncToGAS(url, d);
      setLastSynced(new Date());
    } catch { /* silent — user sees last synced time */ }
    setIsSyncing(false);
  }, 1500);

  const persistAndSync = useCallback((newData: AppData) => {
    persist(newData);
    debouncedCloudPush(newData);
  }, [persist, debouncedCloudPush]);

  // ── boot: pull from Drive on first load ───────────────────────────────────
  useEffect(() => {
    const local = loadData();
    const url   = local?.settings?.gasApiUrl;
    if (!url) {
      // No URL configured — just process recurring reminders and done
      const processed = processRecurringReminders(local);
      if (JSON.stringify(processed.reminders) !== JSON.stringify(local.reminders)) {
        persist(processed);
      }
      return;
    }

    // URL is configured — pull from Drive, show loading spinner
    setIsBooting(true);
    loadFromGAS(url)
      .then((cloud) => {
        if (cloud) {
          // Keep the gasApiUrl from local in case cloud copy lost it
          const merged = { ...cloud, settings: { ...cloud.settings, gasApiUrl: url } };
          const processed = processRecurringReminders(merged);
          persist(processed);
          setLastPulled(new Date());
        } else {
          // Drive empty — keep local, still process reminders
          const processed = processRecurringReminders(local);
          if (JSON.stringify(processed.reminders) !== JSON.stringify(local.reminders)) persist(processed);
        }
      })
      .catch(() => {
        // Pull failed — silently fall back to local data
        const processed = processRecurringReminders(local);
        if (JSON.stringify(processed.reminders) !== JSON.stringify(local.reminders)) persist(processed);
      })
      .finally(() => setIsBooting(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── manual push ───────────────────────────────────────────────────────────
  const syncCloud = async (overrideData?: AppData): Promise<boolean> => {
    const d   = overrideData ?? dataRef.current;
    const url = d?.settings?.gasApiUrl;
    if (!url) return false;
    setIsSyncing(true);
    const result = await syncToGAS(url, d);
    if (result) setLastSynced(new Date());
    setIsSyncing(false);
    return result;
  };

  // ── manual pull ───────────────────────────────────────────────────────────
  const pullCloud = async (): Promise<boolean> => {
    const url = dataRef.current?.settings?.gasApiUrl;
    if (!url) return false;
    setIsPulling(true);
    try {
      const cloud = await loadFromGAS(url);
      if (!cloud) { setIsPulling(false); return false; }
      const merged = { ...cloud, settings: { ...cloud.settings, gasApiUrl: url } };
      persist(merged);
      setLastPulled(new Date());
      setIsPulling(false);
      return true;
    } catch {
      setIsPulling(false);
      return false;
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addTransaction    = (t: Omit<Transaction, 'id'>) => persistAndSync({ ...data, transactions: [...data.transactions, { ...t, id: generateId() }] });
  const updateTransaction = (t: Transaction)              => persistAndSync({ ...data, transactions: data.transactions.map((x) => (x.id === t.id ? t : x)) });
  const deleteTransaction = (id: string)                  => persistAndSync({ ...data, transactions: data.transactions.filter((x) => x.id !== id) });

  const addInvestment    = (i: Omit<Investment, 'id'>) => persistAndSync({ ...data, investments: [...data.investments, { ...i, id: generateId() }] });
  const updateInvestment = (i: Investment)              => persistAndSync({ ...data, investments: data.investments.map((x) => (x.id === i.id ? i : x)) });
  const deleteInvestment = (id: string)                 => persistAndSync({ ...data, investments: data.investments.filter((x) => x.id !== id) });

  const addCard    = (c: Omit<Card, 'id'>) => persistAndSync({ ...data, cards: [...data.cards, { ...c, id: generateId() }] });
  const updateCard = (c: Card)              => persistAndSync({ ...data, cards: data.cards.map((x) => (x.id === c.id ? c : x)) });
  const deleteCard = (id: string)           => persistAndSync({ ...data, cards: data.cards.filter((x) => x.id !== id) });

  const addDebt    = (d: Omit<Debt, 'id'>) => persistAndSync({ ...data, debts: [...data.debts, { ...d, id: generateId() }] });
  const updateDebt = (d: Debt)              => persistAndSync({ ...data, debts: data.debts.map((x) => (x.id === d.id ? d : x)) });
  const deleteDebt = (id: string)           => persistAndSync({ ...data, debts: data.debts.filter((x) => x.id !== id) });

  const addSubscription    = (s: Omit<Subscription, 'id'>) => persistAndSync({ ...data, subscriptions: [...data.subscriptions, { ...s, id: generateId() }] });
  const updateSubscription = (s: Subscription)              => persistAndSync({ ...data, subscriptions: data.subscriptions.map((x) => (x.id === s.id ? s : x)) });
  const deleteSubscription = (id: string)                   => persistAndSync({ ...data, subscriptions: data.subscriptions.filter((x) => x.id !== id) });

  const addReminder    = (r: Omit<Reminder, 'id'>) => persistAndSync({ ...data, reminders: [...data.reminders, { ...r, id: generateId() }] });
  const updateReminder = (r: Reminder)              => persistAndSync({ ...data, reminders: data.reminders.map((x) => (x.id === r.id ? r : x)) });
  const deleteReminder = (id: string)               => persistAndSync({ ...data, reminders: data.reminders.filter((x) => x.id !== id) });
  const completeReminder = (id: string) => persistAndSync({
    ...data,
    reminders: data.reminders.map((r) =>
      r.id === id ? { ...r, status: 'completed', completedDate: new Date().toISOString().split('T')[0] } : r
    ),
  });

  const addCategory    = (c: Omit<Category, 'id'>) => persistAndSync({ ...data, categories: [...data.categories, { ...c, id: generateId() }] });
  const updateCategory = (c: Category)              => persistAndSync({ ...data, categories: data.categories.map((x) => (x.id === c.id ? c : x)) });
  const deleteCategory = (id: string)               => persistAndSync({ ...data, categories: data.categories.filter((x) => x.id !== id) });

  const updateSettings = (s: Partial<AppSettings>) => {
    const newData = { ...data, settings: { ...data.settings, ...s } };
    persist(newData);
    if (s.gasApiUrl) syncCloud(newData); // push immediately when URL is saved
  };

  const setData = (d: AppData) => persist(d);

  return (
    <AppContext.Provider value={{
      data,
      addTransaction, updateTransaction, deleteTransaction,
      addInvestment, updateInvestment, deleteInvestment,
      addCard, updateCard, deleteCard,
      addDebt, updateDebt, deleteDebt,
      addSubscription, updateSubscription, deleteSubscription,
      addReminder, updateReminder, deleteReminder, completeReminder,
      addCategory, updateCategory, deleteCategory,
      updateSettings, setData,
      syncCloud, pullCloud,
      isSyncing, isPulling, isBooting,
      lastSynced, lastPulled,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}