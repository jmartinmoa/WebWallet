'use client';
import React from 'react';
import { useApp } from '@/app/lib/context';
import {
  LayoutDashboard, ArrowLeftRight, TrendingUp, CreditCard,
  Tags, Layers, RefreshCw, Bell, Settings, X, Menu,
  DollarSign, Cloud, CloudOff, Sun, Moon, LogOut,
} from 'lucide-react';


const NAV_ITEMS = [
  { id: 'dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'transactions',  label: 'Transactions',  icon: ArrowLeftRight  },
  { id: 'investments',   label: 'Investments',   icon: TrendingUp      },
  { id: 'cards',         label: 'Cards',         icon: CreditCard      },
  { id: 'categories',    label: 'Categories',    icon: Tags            },
  { id: 'debts',         label: 'Debts',         icon: Layers          },
  { id: 'subscriptions', label: 'Subscriptions', icon: RefreshCw       },
  { id: 'reminders',     label: 'Reminders',     icon: Bell            },
  { id: 'settings',      label: 'Settings',      icon: Settings        },
];

function initialsColor(initials: string): string {
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6','#0ea5e9'];
  let hash = 0;
  for (let i = 0; i < initials.length; i++) hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = getInitials(name || 'User');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: initialsColor(initials), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.36,
      flexShrink: 0, letterSpacing: '0.02em',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {initials}
    </div>
  );
}

interface SidebarProps {
  page: string;
  onNavigate: (page: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ page, onNavigate, open, onClose }: SidebarProps) {
  const { data, isSyncing, toggleTheme, signOut } = useApp();
  const isDark = data.settings.theme === 'dark';
  const userName = data.settings.userName || 'User';
  const pendingReminders = (data?.reminders ?? []).filter(
    (r) => r.status === 'pending' && new Date(r.date) < new Date()
  ).length;

  function navigate(id: string) { onNavigate(id); onClose(); }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo — no border, minimal */}
        <div style={{ padding: '1.4rem 1rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#fff" />
            </div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem' }}>
              WebWallet
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.25rem 0.75rem', overflowY: 'auto' }}>
          {/* Section label */}
          <div style={{ fontSize: '0.63rem', fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', padding: '0.5rem 0.25rem 0.3rem', textTransform: 'uppercase' }}>
            Menu
          </div>

          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${page === id ? 'active' : ''}`} onClick={() => { onNavigate(id); }}>
              <Icon size={16} />
              <span style={{ flex: 1 }}>{label}</span>
              {id === 'reminders' && pendingReminders > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 999, fontSize: '0.6rem', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                  {pendingReminders}
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div style={{ margin: '0.5rem 0.25rem', height: 1, background: 'var(--border)', opacity: 0.6 }} />

          {/* Theme toggle */}
          <button className="nav-link" onClick={toggleTheme}>
            {isDark ? <Sun size={16} style={{ color: '#f59e0b' }} /> : <Moon size={16} />}
            <span style={{ flex: 1 }}>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Sign out */}
          <button className="nav-link" onClick={signOut} style={{ color: 'var(--danger)' }}>
            <LogOut size={16} style={{ color: 'var(--danger)' }} />
            <span style={{ flex: 1 }}>Sign Out</span>
          </button>
        </nav>

        {/* User profile — no border */}
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Avatar name={userName} size={30} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userName}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {isSyncing ? (
                <span style={{ color: 'var(--accent)' }}>Syncing…</span>
              ) : data.settings.gasApiUrl ? (
                <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 3 }}><Cloud size={9} /> Cloud</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><CloudOff size={9} /> Local</span>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile full-screen grid panel ────────────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem 0.75rem', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={16} color="#fff" />
              </div>
              <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '1rem' }}>WebWallet</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '0.5rem', WebkitTapHighlightColor: 'transparent' }}>
              <X size={20} />
            </button>
          </div>

          {/* 3-col grid — nav items + theme + signout */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '0.5rem 1rem 1rem',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.65rem', alignContent: 'start',
          }}>
            {/* Regular nav items */}
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = page === id;
              return (
                <button key={id} onClick={() => navigate(id)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '0.45rem',
                  padding: '0.9rem 0.5rem', borderRadius: 14,
                  border: 'none',
                  background: isActive ? 'rgba(99,102,241,0.08)' : 'var(--surface)',
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  cursor: 'pointer', position: 'relative',
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  boxShadow: isActive ? '0 0 0 1.5px var(--accent)' : 'var(--shadow)',
                }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'var(--accent)' : 'var(--surface2)' }}>
                    <Icon size={19} color={isActive ? '#fff' : 'var(--text2)'} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                  {id === 'reminders' && pendingReminders > 0 && (
                    <span style={{ position: 'absolute', top: 7, right: 7, background: 'var(--danger)', color: '#fff', borderRadius: 999, fontSize: '0.58rem', padding: '0.1rem 0.35rem', fontWeight: 700 }}>
                      {pendingReminders}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Theme toggle tile */}
            <button onClick={toggleTheme} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '0.45rem',
              padding: '0.9rem 0.5rem', borderRadius: 14,
              border: 'none', background: 'var(--surface)',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(245,158,11,0.1)' }}>
                {isDark ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#f59e0b" />}
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--text)' }}>
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Sign out tile */}
            <button onClick={signOut} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '0.45rem',
              padding: '0.9rem 0.5rem', borderRadius: 14,
              border: 'none', background: 'var(--surface)',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.08)' }}>
                <LogOut size={19} color="var(--danger)" />
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', lineHeight: 1.2, color: 'var(--danger)' }}>
                Sign Out
              </span>
            </button>
          </div>

          {/* User profile bottom — no border */}
          <div style={{ padding: '0.75rem 1.25rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}>
            <Avatar name={userName} size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
              <div style={{ fontSize: '0.7rem', color: data.settings.gasApiUrl ? 'var(--success)' : 'var(--text3)' }}>
                {data.settings.gasApiUrl ? 'Cloud enabled' : 'Local only'}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TopBar({ onMenuClick, page }: { onMenuClick: () => void; page: string }) {
  const { data, syncCloud, isSyncing, lastSynced } = useApp();
  const title = NAV_ITEMS.find((n) => n.id === page)?.label || page;
  const userName = data.settings.userName || 'User';

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      background: 'var(--bg)', borderBottom: '1px solid var(--border)',
      padding: '0.65rem 1.25rem',
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      marginBottom: '1.5rem',
    }}>
      <button className="btn btn-secondary btn-sm" onClick={onMenuClick}
        id="menu-btn" style={{ display: 'none', padding: '0.4rem', flexShrink: 0 }}>
        <Menu size={18} />
      </button>

      <h1 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Playfair Display, serif', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {title}
      </h1>

      {data.settings.gasApiUrl && (
        <button className="btn btn-secondary btn-sm" onClick={() => syncCloud()} disabled={isSyncing}
          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
          <Cloud size={13} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
          <span id="sync-label">{isSyncing ? '…' : lastSynced ? lastSynced.toLocaleTimeString() : 'Sync'}</span>
        </button>
      )}

      <div id="topbar-avatar">
        <Avatar name={userName} size={28} />
      </div>

      <style>{`
        @media (max-width: 768px) {
          #menu-btn { display: flex !important; }
          #sync-label { display: none; }
        }
        @media (min-width: 769px) {
          #topbar-avatar { display: none; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}