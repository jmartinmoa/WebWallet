'use client';
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './lib/context';
import Login from './login/login';
import Sidebar, { TopBar } from '../components/sidebar/page';
import Dashboard from './dashboard/dashboard';
import Transactions from './transactions/transactions';
import Investments from './investments/investments';
import Cards from './cards/cards';
import Categories from './categories/categories';
import Debts from './debts/debts';
import Subscriptions from './subscriptions/subscriptions';
import Reminders from './reminders/reminders';
import Settings from './settings/settings';
import { CloudDownload, DollarSign } from 'lucide-react';


const PAGE_MAP: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  transactions: Transactions,
  investments: Investments,
  cards: Cards,
  categories: Categories,
  debts: Debts,
  subscriptions: Subscriptions,
  reminders: Reminders,
  settings: Settings,
};

// ── Boot screen — shown while pulling from Drive on startup ───────────────────
function BootScreen() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      {/* Logo */}
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
      }}>
        <DollarSign size={32} color="#fff" />
      </div>

      <div style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.5rem', margin: '0 0 0.4rem', color: 'var(--text)' }}>
          FinTracker
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', color: 'var(--text2)', fontSize: '0.9rem' }}>
          <CloudDownload size={16} style={{ color: 'var(--accent)' }} />
          <span>Syncing from Drive{dots}</span>
        </div>
      </div>

      {/* Animated bar */}
      <div style={{ width: 180, height: 3, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: '40%',
          background: 'var(--accent)',
          borderRadius: 99,
          animation: 'bootSlide 1.2s ease-in-out infinite',
        }} />
      </div>

      <style>{`
        @keyframes bootSlide {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(350%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

// ── Push indicator toast ──────────────────────────────────────────────────────
function SyncToast() {
  const { isSyncing, lastSynced } = useApp();
  const [visible, setVisible] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isSyncing) {
      setVisible(true);
      setJustSynced(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  }, [isSyncing]);

  useEffect(() => {
    if (lastSynced && !isSyncing) {
      setJustSynced(true);
      timerRef.current = setTimeout(() => setVisible(false), 2000);
    }
  }, [lastSynced, isSyncing]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '1.25rem', right: '1.25rem',
      zIndex: 999,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '0.6rem 1rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      boxShadow: 'var(--shadow-lg)',
      fontSize: '0.82rem', fontWeight: 600,
      animation: 'fadeIn 0.2s ease',
    }}>
      {isSyncing ? (
        <>
          <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ color: 'var(--text2)' }}>Saving to Drive…</span>
        </>
      ) : justSynced ? (
        <>
          <span style={{ color: 'var(--success)', fontSize: '1rem' }}>✓</span>
          <span style={{ color: 'var(--text2)' }}>Saved to Drive</span>
        </>
      ) : null}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
function AppShell() {
  const { isBooting } = useApp();
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const PageComponent = PAGE_MAP[page] || Dashboard;

  if (isBooting) return <BootScreen />;

  return (
    <div>
      <Sidebar page={page} onNavigate={setPage} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="main-content">
        <TopBar onMenuClick={() => setSidebarOpen(true)} page={page} />
        <PageComponent />
      </main>
      <SyncToast />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ft_auth') === 'true') setIsLoggedIn(true);
  }, []);

  function handleLogin() {
    sessionStorage.setItem('ft_auth', 'true');
    setIsLoggedIn(true);
  }

  if (!isLoggedIn) return <Login onLogin={handleLogin} />;

  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}