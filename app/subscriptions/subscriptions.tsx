'use client';
import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, PauseCircle, XCircle, CheckCircle, Clock } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState, Pagination } from '../../components/ui/page';
import { Subscription, SubscriptionFrequency, SubscriptionStatus } from '../types';

const EMPTY: Omit<Subscription, 'id'> = {
  name: '', category: '', amount: 0, frequency: 'monthly',
  startDate: new Date().toISOString().split('T')[0], status: 'active',
};

const PAGE_SIZE = 10;

const FREQ_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly',
};

const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:   { label: 'Active',   color: 'var(--success)', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle size={12} /> },
  trial:    { label: 'Trial',    color: '#f59e0b',        bg: 'rgba(245,158,11,0.1)',  icon: <Clock size={12} /> },
  paused:   { label: 'Paused',   color: 'var(--text2)',   bg: 'var(--surface2)',        icon: <PauseCircle size={12} /> },
  canceled: { label: 'Canceled', color: 'var(--danger)',  bg: 'rgba(239,68,68,0.08)',  icon: <XCircle size={12} /> },
};

function toMonthly(sub: Subscription) {
  if (sub.frequency === 'monthly') return sub.amount;
  if (sub.frequency === 'yearly')  return sub.amount / 12;
  return sub.amount * 4.33;
}

export default function Subscriptions() {
  const { data, addSubscription, updateSubscription, deleteSubscription } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Subscription | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<Subscription, 'id'>>(EMPTY);
  const [page, setPage]           = useState(1);
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | ''>('');

  // safeguard: backfill missing status on old records
  const subs = useMemo(() =>
    data.subscriptions.map((s) => ({ ...s, status: s.status ?? 'active' })),
    [data.subscriptions]
  );

  const filtered = useMemo(() =>
    filterStatus ? subs.filter((s) => s.status === filterStatus) : subs,
    [subs, filterStatus]
  );
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Only active + trial count toward cost
  const activeSubs    = subs.filter((s) => s.status === 'active' || s.status === 'trial');
  const totalMonthly  = activeSubs.reduce((s, sub) => s + toMonthly(sub), 0);
  const countByStatus = (st: SubscriptionStatus) => subs.filter((s) => s.status === st).length;

  const expenseCategories = data.categories.filter((c) => c.type === 'expense');

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(s: Subscription) {
    setEditing(s);
    setForm({ name: s.name, category: s.category, amount: s.amount,
              frequency: s.frequency, startDate: s.startDate, status: s.status ?? 'active' });
    setModalOpen(true);
  }
  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  function handleSave() {
    if (!form.name || !form.amount) return;
    if (editing) updateSubscription({ ...form, id: editing.id });
    else addSubscription(form);
    setModalOpen(false);
  }

  // Quick status toggle from the table (cycle: active → paused → canceled → active)
  function cycleStatus(sub: Subscription) {
    const cycle: SubscriptionStatus[] = ['active', 'paused', 'canceled', 'trial'];
    const next = cycle[(cycle.indexOf(sub.status ?? 'active') + 1) % cycle.length];
    updateSubscription({ ...sub, status: next });
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Subscriptions</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Subscription</button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, marginBottom: '0.3rem' }}>MONTHLY COST</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)' }}>
            {hide ? '••••' : `$${totalMonthly.toFixed(2)}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>active & trial only</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, marginBottom: '0.3rem' }}>YEARLY COST</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
            {hide ? '••••' : `$${(totalMonthly * 12).toFixed(2)}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>projected</div>
        </div>

        {/* Status breakdown chips — also act as filters */}
        {(['active','trial','paused','canceled'] as SubscriptionStatus[]).map((st) => {
          const cfg   = STATUS_CONFIG[st];
          const count = countByStatus(st);
          const active = filterStatus === st;
          return (
            <div key={st} className="card" onClick={() => { setFilterStatus(active ? '' : st); setPage(1); }}
              style={{ cursor: 'pointer', border: active ? `1.5px solid ${cfg.color}` : '1px solid var(--border)', transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600 }}>{st.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: count > 0 ? cfg.color : 'var(--text3)' }}>{count}</div>
              {active && <div style={{ fontSize: '0.68rem', color: cfg.color, marginTop: 2 }}>filtered ✕</div>}
            </div>
          );
        })}
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      {subs.length === 0 ? (
        <EmptyState icon={<RefreshCw size={48} />} message="No subscriptions tracked yet." />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {filterStatus && (
            <div style={{ padding: '0.6rem 1.25rem', background: `${STATUS_CONFIG[filterStatus].bg}`, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: STATUS_CONFIG[filterStatus].color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {STATUS_CONFIG[filterStatus].icon} Showing {STATUS_CONFIG[filterStatus].label} subscriptions ({filtered.length})
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilterStatus(''); setPage(1); }}>Clear filter</button>
            </div>
          )}
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Name</th><th>Status</th><th>Category</th>
                <th>Amount</th><th>Frequency</th><th>Monthly</th><th>Start Date</th><th></th>
              </tr></thead>
              <tbody>
                {paginated.map((sub) => {
                  const cat     = expenseCategories.find((c) => c.id === sub.category);
                  const monthly = toMonthly(sub);
                  const cfg     = STATUS_CONFIG[sub.status];
                  const dimmed  = sub.status === 'canceled' || sub.status === 'paused';
                  return (
                    <tr key={sub.id} style={{ opacity: dimmed ? 0.6 : 1 }}>
                      <td style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <RefreshCw size={13} style={{ color: dimmed ? 'var(--text3)' : 'var(--accent)', flexShrink: 0 }} />
                          {sub.name}
                        </div>
                      </td>
                      <td>
                        {/* Clickable status badge — quick toggle */}
                        <button
                          onClick={() => cycleStatus(sub)}
                          title="Click to change status"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 20, border: `1px solid ${cfg.color}`, background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          {cfg.icon} {cfg.label}
                        </button>
                      </td>
                      <td>
                        {cat && (
                          <span className="chip" style={{ borderColor: cat.color, color: cat.color, background: `${cat.color}12` }}>
                            <span className="color-dot" style={{ background: cat.color }} />{cat.name}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>{hide ? '••' : `$${sub.amount.toFixed(2)}`}</td>
                      <td><span className="badge" style={{ background: 'var(--surface2)', color: 'var(--text2)' }}>{FREQ_LABELS[sub.frequency]}</span></td>
                      <td style={{ color: dimmed ? 'var(--text3)' : 'var(--danger)', fontWeight: 500 }}>
                        {dimmed ? '—' : hide ? '••' : `$${monthly.toFixed(2)}`}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{sub.startDate}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(sub)}><Edit2 size={13} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(sub.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage} />
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Subscription' : 'Add Subscription'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </>}
      >
        <div className="form-group">
          <label>Name</label>
          <input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Netflix" />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Status</label>
            <select className="input select" value={form.status} onChange={(e) => setField('status', e.target.value as SubscriptionStatus)}>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="paused">Paused</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select className="input select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
              <option value="">Select category</option>
              {expenseCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Frequency</label>
            <select className="input select" value={form.frequency} onChange={(e) => setField('frequency', e.target.value as SubscriptionFrequency)}>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input className="input" type="number" min={0} step={0.01} value={form.amount || ''} onChange={(e) => setField('amount', +e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Start Date</label>
          <input className="input" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteSubscription(deleteId)}
        title="Delete Subscription" message="Remove this subscription?" />
    </div>
  );
}