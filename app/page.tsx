'use client';
import React, { useState, useEffect } from 'react';
import { AppProvider } from './lib/context';
import Login from './login/page';
import Sidebar, { TopBar } from './components/sidebar/page';
import Dashboard from './dashboard/page';
import Transactions from './transactions/page';
import Investments from './investments/page';
import Cards from './cards/page';
import Categories from './categories/page';
import Debts from './debts/page';
import Subscriptions from './subscriptions/page';
import Reminders from './reminders/page';
import Settings from './settings/page';

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