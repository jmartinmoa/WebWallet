'use client';
import React from 'react';
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, CreditCard,
  Tags, Layers, RefreshCw, Bell, Settings, X, Menu,
  DollarSign, Cloud, CloudOff
} from 'lucide-react';
import { useApp } from '@/app/lib/context';


const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'cards', label: 'Cards', icon: CreditCard },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'debts', label: 'Debts', icon: Layers },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  page: string;
  onNavigate: (page: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ page, onNavigate, open, onClose }: SidebarProps) {
  const { data, isSyncing } = useApp();
  const pendingReminders = (data?.reminders ?? []).filter((r) => r.status === 'pending' && new Date(r.date) < new Date()).length;

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
                  FinTracker
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>
                  {isSyncing ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Cloud size={10} /> Syncing...
                    </span>
                  ) : data.settings.gasApiUrl ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--success)' }}>
                      <Cloud size={10} /> Cloud enabled
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CloudOff size={10} /> Local only
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onClose}
              style={{ display: 'none', padding: '0.3rem' }}
              id="sidebar-close-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-link ${page === id ? 'active' : ''}`}
              onClick={() => { onNavigate(id); onClose(); }}
            >
              <Icon size={17} />
              <span style={{ flex: 1 }}>{label}</span>
              {id === 'reminders' && pendingReminders > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff',
                  borderRadius: '999px', fontSize: '0.65rem',
                  padding: '0.1rem 0.45rem', fontWeight: 600,
                }}>
                  {pendingReminders}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text3)' }}>
          FinTracker v1.0 · Personal Finance
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}

export function TopBar({ onMenuClick, page }: { onMenuClick: () => void; page: string }) {
  const { data, syncCloud, isSyncing, lastSynced } = useApp();
  const title = NAV_ITEMS.find((n) => n.id === page)?.label || page;

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: '0.65rem 1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem',
      marginBottom: '1.5rem',
    }}>
      <button className="btn btn-secondary btn-sm" onClick={onMenuClick} id="menu-btn" style={{ display: 'none', padding: '0.4rem' }}>
        <Menu size={18} />
      </button>
      <h1 style={{ margin: 0, fontSize: '1.3rem', fontFamily: 'Playfair Display, serif' }}>{title}</h1>
      {data.settings.gasApiUrl && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {lastSynced && !isSyncing && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>
              Synced {lastSynced.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => syncCloud()}
            disabled={isSyncing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Cloud size={13} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) { #menu-btn { display: flex !important; } }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
