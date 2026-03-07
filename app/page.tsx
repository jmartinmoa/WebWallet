'use client';
import React, { useState, useEffect } from 'react';
import { AppProvider } from './lib/context';
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

function AppShell() {
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <div>
      <Sidebar
        page={page}
        onNavigate={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main-content">
        <TopBar onMenuClick={() => setSidebarOpen(true)} page={page} />
        <PageComponent />
      </main>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('ft_auth');
    if (session === 'true') setIsLoggedIn(true);
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