'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart,
  Eye, EyeOff, Bell, CreditCard, ArrowUpRight, ArrowDownRight,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { useApp } from '../lib/context';
import { calcTotals, formatDate, getUpcomingReminders, parseLocalDate } from '../lib/utils';
import { CHART_COLORS } from '../constants';
import { Amount } from '../../components/ui/page';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') Chart.register(...registerables);

// Returns only the most recent entry per unique asset name
function latestPerAsset(investments: any[]) {
  const map = new Map<string, any>();
  for (const inv of investments) {
    const key = inv.name.trim().toLowerCase();
    const cur = map.get(key);
    if (!cur || parseLocalDate(inv.date) > parseLocalDate(cur.date)) map.set(key, inv);
  }
  return Array.from(map.values());
}

// ── Month navigator ──────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function MonthNav({
  month, year, allTime, onPrev, onNext, onAllTime, hide, onToggleHide,
}: {
  month: number; year: number; allTime: boolean;
  onPrev: () => void; onNext: () => void; onAllTime: () => void;
  hide: boolean; onToggleHide: () => void;
}) {
  const isCurrentMonth = !allTime &&
    month === new Date().getMonth() && year === new Date().getFullYear();

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
      marginBottom: '1.75rem',
      padding: '0.9rem 1.25rem',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      boxShadow: 'var(--shadow)',
    }}>
      {/* Arrow nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onPrev}
          disabled={allTime}
          style={{ padding: '0.4rem 0.55rem', opacity: allTime ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{
          minWidth: 170, textAlign: 'center',
          padding: '0.35rem 1rem',
          borderRadius: 8,
          background: allTime ? 'rgba(99,102,241,0.1)' : 'var(--surface2)',
          border: `1px solid ${allTime ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
        }}>
          {allTime ? (
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)' }}>
              All Time
            </span>
          ) : (
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {MONTH_NAMES[month]} <span style={{ color: 'var(--text2)' }}>{year}</span>
            </span>
          )}
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onNext}
          disabled={allTime || isCurrentMonth}
          style={{ padding: '0.4rem 0.55rem', opacity: (allTime || isCurrentMonth) ? 0.4 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* All Time toggle */}
      <button
        className={`btn btn-sm ${allTime ? 'btn-primary' : 'btn-secondary'}`}
        onClick={onAllTime}
        style={{ gap: '0.35rem' }}
      >
        <Calendar size={13} />
        {allTime ? 'Showing All Time' : 'All Time'}
      </button>

      {/* Jump to today */}
      {!allTime && !isCurrentMonth && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            // handled by parent via today click - we emit through onNext trick
          }}
          style={{ fontSize: '0.78rem', color: 'var(--accent)' }}
        >
          Today
        </button>
      )}

      {/* Hide amounts */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={onToggleHide}
        style={{ marginLeft: 'auto' }}
      >
        {hide ? <Eye size={14} /> : <EyeOff size={14} />}
        {hide ? 'Show' : 'Hide'}
      </button>
    </div>
  );
}

// ── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ title, value, sub, icon, color, positive, hide }: {
  title: string; value: number; sub?: string; icon: React.ReactNode;
  color: string; positive?: boolean; hide: boolean;
}) {
  const isPositive = positive ?? value >= 0;
  return (
    <div className="summary-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 90, height: 90, borderRadius: '50%',
        background: `${color}10`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{
          fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em',
          color: 'var(--text3)', textTransform: 'uppercase',
        }}>
          {title}
        </span>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginBottom: '0.3rem' }}>
        <Amount value={value} hide={hide} />
      </div>
      {sub && !hide && (
        <div style={{ fontSize: '0.75rem', color: isPositive ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>
          {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Chart hook ────────────────────────────────────────────────────────────────
function useChart(canvasRef: React.RefObject<HTMLCanvasElement | null>, getConfig: () => any, deps: any[]) {
  const inst = useRef<Chart | null>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    inst.current?.destroy();
    inst.current = new Chart(canvasRef.current, getConfig());
    return () => { inst.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { data, updateSettings } = useApp();
  const hide = data.settings.hideAmounts;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [allTime, setAllTime] = useState(false);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  // Totals
  const allIncome = data.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const allExpenses = data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const { income, expenses } = allTime
    ? { income: allIncome, expenses: allExpenses }
    : calcTotals(data.transactions, month, year);
  const net = income - expenses;
  const portfolioLatest = latestPerAsset(data.investments ?? []);
  const totalInvestments = portfolioLatest.reduce((s: number, i: any) => s + i.currentValue, 0);
  const savings = income > 0 ? ((net / income) * 100).toFixed(1) : '0';

  const upcoming = getUpcomingReminders(data.reminders ?? [], data.settings.reminderThresholdDays);

  const tc = '#64748b'; // chart text color fallback

  // ── Chart refs ──
  const incVsExpRef = useRef<HTMLCanvasElement>(null);
  const expByCatRef = useRef<HTMLCanvasElement>(null);
  const invAllocRef = useRef<HTMLCanvasElement>(null);
  const monthlyTrendRef = useRef<HTMLCanvasElement>(null);
  const subsRef = useRef<HTMLCanvasElement>(null);
  const debtRef = useRef<HTMLCanvasElement>(null);

  // Income vs Expenses
  useChart(incVsExpRef, () => ({
    type: 'bar',
    data: {
      labels: ['Income', 'Expenses'],
      datasets: [{
        data: [income, expenses],
        backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)'],
        borderRadius: 8, borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => ` $${ctx.raw.toLocaleString()}` } } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: tc, callback: (v: any) => `$${(v/1000).toFixed(0)}k` } },
        x: { ticks: { color: tc, font: { weight: '600' } } },
      },
    },
  }), [income, expenses]);

  // Expenses by category
  const expCategories = (data.categories ?? []).filter((c) => c.type === 'expense');
  const expByCategory = expCategories.map((cat) => ({
    name: cat.name, color: cat.color,
    total: (data.transactions ?? []).filter((t) =>
      t.type === 'expense' && t.category === cat.id &&
      (allTime || (new Date(t.date).getMonth() === month && new Date(t.date).getFullYear() === year))
    ).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.total > 0);

  useChart(expByCatRef, () => ({
    type: 'doughnut',
    data: {
      labels: expByCategory.map((c) => c.name),
      datasets: [{ data: expByCategory.map((c) => c.total), backgroundColor: expByCategory.map((c) => c.color), borderWidth: 2, borderColor: 'var(--surface)', hoverOffset: 8 }],
    },
    options: { responsive: true, cutout: '68%', plugins: { legend: { position: 'right', labels: { color: tc, padding: 10, font: { size: 11 } } } } },
  }), [JSON.stringify(expByCategory)]);

  // Investment allocation
  const invTypes = (data.categories ?? []).filter((c) => c.type === 'investment');
  const invByType = invTypes.map((t) => ({
    name: t.name, color: t.color,
    total: portfolioLatest.filter((i: any) => i.type === t.id).reduce((s: number, i: any) => s + i.currentValue, 0),
  })).filter((t) => t.total > 0);

  useChart(invAllocRef, () => ({
    type: 'doughnut',
    data: {
      labels: invByType.map((t) => t.name),
      datasets: [{ data: invByType.map((t) => t.total), backgroundColor: invByType.map((t) => t.color), borderWidth: 2, borderColor: 'var(--surface)', hoverOffset: 8 }],
    },
    options: { responsive: true, cutout: '68%', plugins: { legend: { position: 'right', labels: { color: tc, padding: 10, font: { size: 11 } } } } },
  }), [JSON.stringify(invByType)]);

  // Monthly trend (last 8 months)
  const trendMonths: { label: string; income: number; expense: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const tot = calcTotals(data.transactions ?? [], m, y);
    trendMonths.push({ label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }), income: tot.income, expense: tot.expenses });
  }

  useChart(monthlyTrendRef, () => ({
    type: 'line',
    data: {
      labels: trendMonths.map((m) => m.label),
      datasets: [
        { label: 'Income', data: trendMonths.map((m) => m.income), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.08)', fill: true, tension: 0.45, pointRadius: 5, pointHoverRadius: 7, pointBackgroundColor: '#10b981' },
        { label: 'Expenses', data: trendMonths.map((m) => m.expense), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.45, pointRadius: 5, pointHoverRadius: 7, pointBackgroundColor: '#ef4444' },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: tc, font: { size: 11 } } } },
      scales: {
        y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: tc, callback: (v: any) => `$${(v/1000).toFixed(0)}k` } },
        x: { ticks: { color: tc } },
      },
    },
  }), [month, year, JSON.stringify(data.transactions)]);

  // Subscriptions by category
  const subsByCategory = expCategories.map((cat) => ({
    name: cat.name, color: cat.color,
    total: (data.subscriptions ?? []).filter((s) => s.category === cat.id).reduce((s, sub) => s + sub.amount, 0),
  })).filter((c) => c.total > 0);

  useChart(subsRef, () => ({
    type: 'bar',
    data: {
      labels: subsByCategory.map((c) => c.name),
      datasets: [{ data: subsByCategory.map((c) => c.total), backgroundColor: subsByCategory.map((c) => c.color), borderRadius: 6 }],
    },
    options: {
      responsive: true, indexAxis: 'y' as const,
      plugins: { legend: { display: false } },
      scales: { x: { ticks: { color: tc } }, y: { ticks: { color: tc } } },
    },
  }), [JSON.stringify(data.subscriptions)]);

  // Debts
  useChart(debtRef, () => ({
    type: 'bar',
    data: {
      labels: (data.debts ?? []).map((d) => d.name),
      datasets: [
        { label: 'Paid', data: (data.debts ?? []).map((d) => (d.paidInstallments / d.installments) * d.totalAmount), backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 4 },
        { label: 'Remaining', data: (data.debts ?? []).map((d) => ((d.installments - d.paidInstallments) / d.installments) * d.totalAmount), backgroundColor: 'rgba(239,68,68,0.45)', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, indexAxis: 'y' as const,
      plugins: { legend: { labels: { color: tc, font: { size: 11 } } } },
      scales: { x: { stacked: true, ticks: { color: tc } }, y: { stacked: true, ticks: { color: tc } } },
    },
  }), [JSON.stringify(data.debts)]);

  const totalMonthlySubscriptions = (data.subscriptions ?? []).reduce((s, sub) => {
    if (sub.frequency === 'monthly') return s + sub.amount;
    if (sub.frequency === 'yearly') return s + sub.amount / 12;
    if (sub.frequency === 'weekly') return s + sub.amount * 4.33;
    return s;
  }, 0);

  const activeDebts = (data.debts ?? []).filter((d) => d.status === 'active').length;

  return (
    <div>
      {/* Month Navigator */}
      <MonthNav
        month={month} year={year} allTime={allTime}
        onPrev={prevMonth} onNext={nextMonth}
        onAllTime={() => setAllTime((a) => !a)}
        hide={hide} onToggleHide={() => updateSettings({ hideAmounts: !hide })}
      />

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <SummaryCard
          title="Income" value={income}
          sub={allTime ? `${data.transactions.filter((t) => t.type === 'income').length} transactions` : undefined}
          icon={<TrendingUp size={18} />} color="#10b981" positive hide={hide}
        />
        <SummaryCard
          title="Expenses" value={expenses}
          sub={allTime ? `${data.transactions.filter((t) => t.type === 'expense').length} transactions` : undefined}
          icon={<TrendingDown size={18} />} color="#ef4444" positive={false} hide={hide}
        />
        <SummaryCard
          title="Net Balance" value={net}
          sub={income > 0 ? `${savings}% savings rate` : undefined}
          icon={<DollarSign size={18} />} color="#6366f1" hide={hide}
        />
        <SummaryCard
          title="Investments" value={totalInvestments}
          sub={`${portfolioLatest.length} assets`}
          icon={<PieChart size={18} />} color="#f59e0b" positive hide={hide}
        />
      </div>

      {/* Quick stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.75rem', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Cards', value: `${data.cards.length}`, icon: '💳', color: 'var(--accent)' },
          { label: 'Active Debts', value: `${activeDebts}`, icon: '💼', color: activeDebts > 0 ? 'var(--danger)' : 'var(--success)' },
          { label: 'Subscriptions', value: hide ? '••' : `$${totalMonthlySubscriptions.toFixed(0)}/mo`, icon: '🔄', color: 'var(--warning)' },
          { label: 'Reminders', value: `${upcoming.length} upcoming`, icon: '🔔', color: upcoming.length > 0 ? 'var(--warning)' : 'var(--text2)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: s.color }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Upcoming Reminders */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={14} style={{ color: '#f59e0b' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Upcoming Reminders</span>
            {upcoming.length > 0 && <span className="badge badge-pending" style={{ marginLeft: 'auto' }}>{upcoming.length}</span>}
          </div>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.83rem', textAlign: 'center', padding: '0.75rem 0', margin: 0 }}>All clear! No upcoming reminders.</p>
          ) : (
            upcoming.slice(0, 4).map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{r.title}</span>
                <span style={{ color: 'var(--text2)', fontSize: '0.75rem', flexShrink: 0 }}>{formatDate(r.date)}</span>
              </div>
            ))
          )}
        </div>

        {/* My Cards */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={14} style={{ color: 'var(--accent)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>My Cards</span>
          </div>
          {data.cards.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.83rem', textAlign: 'center', padding: '0.75rem 0', margin: 0 }}>No cards added yet.</p>
          ) : (
            data.cards.slice(0, 3).map((card) => {
              const util = card.type === 'credit' && card.limit ? (card.balance / card.limit) * 100 : null;
              return (
                <div key={card.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: 30, height: 19, borderRadius: 4, background: card.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>••••{card.last4} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{card.name}</span></div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{hide ? '••' : `$${card.balance.toLocaleString()}`}</span>
                  </div>
                  {util !== null && (
                    <div style={{ marginTop: '0.3rem' }}>
                      <div className="progress-bar" style={{ height: 3 }}>
                        <div className="progress-fill" style={{ width: `${Math.min(util, 100)}%`, background: util > 70 ? 'var(--danger)' : util > 30 ? 'var(--warning)' : 'var(--success)' }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Recent Transactions</span>
          </div>
          {data.transactions.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '0.83rem', textAlign: 'center', padding: '0.75rem 0', margin: 0 }}>No transactions yet.</p>
          ) : (
            [...data.transactions]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((t) => {
                const cat = (data.categories ?? []).find((c) => c.id === t.category);
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.83rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `${cat?.color || '#64748b'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat?.color || '#94a3b8' }} />
                    </div>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>
                    <span style={{ color: t.type === 'income' ? 'var(--success)' : 'var(--danger)', fontWeight: 700, flexShrink: 0 }}>
                      {t.type === 'income' ? '+' : '-'}{hide ? '••' : `$${t.amount.toLocaleString()}`}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>
        {/* Income vs Expenses — 5 cols */}
        <div className="card" style={{ gridColumn: 'span 5' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Income vs Expenses</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{allTime ? 'All time' : MONTH_NAMES[month]}</span>
          </div>
          <canvas ref={incVsExpRef} style={{ maxHeight: 200 }} />
        </div>

        {/* Expenses by Category — 7 cols */}
        <div className="card" style={{ gridColumn: 'span 7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Expenses by Category</span>
            {expByCategory.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>
                ${expenses.toLocaleString()} total
              </span>
            )}
          </div>
          {expByCategory.length === 0
            ? <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '2rem 0', margin: 0, fontSize: '0.85rem' }}>No expense data</p>
            : <canvas ref={expByCatRef} style={{ maxHeight: 200 }} />}
        </div>

        {/* Monthly Trend — full width */}
        <div className="card" style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Monthly Trend</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Last 8 months</span>
          </div>
          <canvas ref={monthlyTrendRef} style={{ maxHeight: 210 }} />
        </div>

        {/* Investment Allocation — 6 cols */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Investment Allocation</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>By type</span>
          </div>
          {invByType.length === 0
            ? <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '2rem 0', margin: 0, fontSize: '0.85rem' }}>No investment data</p>
            : <canvas ref={invAllocRef} style={{ maxHeight: 200 }} />}
        </div>

        {/* Subscriptions by Category — 6 cols */}
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Subscriptions by Category</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Monthly</span>
          </div>
          {subsByCategory.length === 0
            ? <p style={{ color: 'var(--text3)', textAlign: 'center', padding: '2rem 0', margin: 0, fontSize: '0.85rem' }}>No subscriptions</p>
            : <canvas ref={subsRef} style={{ maxHeight: 200 }} />}
        </div>

        {/* Debts Progress — full width, only if debts exist */}
        {(data.debts ?? []).length > 0 && (
          <div className="card" style={{ gridColumn: 'span 12' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Debts Progress</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{activeDebts} active</span>
            </div>
            <canvas ref={debtRef} style={{ maxHeight: 200 }} />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          [style*="gridColumn: span 5"],
          [style*="gridColumn: span 7"],
          [style*="gridColumn: span 6"],
          [style*="gridColumn: span 12"] {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </div>
  );
}