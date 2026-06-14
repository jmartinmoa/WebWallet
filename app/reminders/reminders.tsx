'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Bell, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState } from '../../components/ui/page';
import { Reminder, ReminderStatus } from '../types';
import { formatDate, getOverdueReminders } from '../lib/utils';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') Chart.register(...registerables);

const EMPTY: Omit<Reminder, 'id'> = {
  title: '', description: '', date: new Date().toISOString().split('T')[0],
  status: 'pending', recurring: false,
};

export default function Reminders() {
  const { data, addReminder, updateReminder, deleteReminder, completeReminder, updateSettings } = useApp();
  const [tab, setTab]           = useState<'active' | 'archived'>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Reminder | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<Reminder, 'id'>>(EMPTY);
  const [threshold, setThreshold] = useState(data.settings.reminderThresholdDays);
  const [showStats, setShowStats] = useState(false);

  const chartRef      = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const now              = new Date();
  const activeReminders  = data.reminders.filter((r) => r.status === 'pending');
  const archivedReminders = data.reminders.filter((r) => r.status === 'completed' || r.status === 'expired');
  const overdue          = getOverdueReminders(data.reminders);
  const displayed        = tab === 'active' ? activeReminders : archivedReminders;

  const completed = data.reminders.filter((r) => r.status === 'completed').length;
  const pending   = data.reminders.filter((r) => r.status === 'pending').length;
  const expired   = data.reminders.filter((r) => r.status === 'expired').length;

  useEffect(() => {
    if (!chartRef.current || !showStats) return;
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Expired'],
        datasets: [{ data: [completed, pending, expired], backgroundColor: ['#10b981','#f59e0b','#ef4444'], borderWidth: 0, hoverOffset: 6 }],
      },
      options: {
        responsive: true, cutout: '60%',
        plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#64748b', padding: 10 } } },
      },
    });
  }, [completed, pending, expired, showStats]);

  function openAdd()     { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(r: Reminder) {
    setEditing(r);
    setForm({ title: r.title, description: r.description, date: r.date, status: r.status, recurring: r.recurring, completedDate: r.completedDate });
    setModalOpen(true);
  }
  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }
  function handleSave() {
    if (!form.title || !form.date) return;
    if (editing) updateReminder({ ...form, id: editing.id });
    else addReminder(form);
    setModalOpen(false);
  }

  function isOverdue(r: Reminder)  { return r.status === 'pending' && new Date(r.date) < now; }
  function isUpcoming(r: Reminder) {
    const d = new Date(r.date);
    const limit = new Date(now.getTime() + threshold * 86400000);
    return r.status === 'pending' && d >= now && d <= limit;
  }

  // Status color for left border
  function borderColor(r: Reminder) {
    if (isOverdue(r))  return 'var(--danger)';
    if (isUpcoming(r)) return '#f59e0b';
    if (r.status === 'completed') return 'var(--success)';
    return 'var(--border)';
  }

  return (
    <div>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="page-header">
        <h2 className="page-title">Reminders</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Reminder</button>
      </div>

      {/* ── Stats toggle (collapsed by default on mobile) ─────────────────── */}
      <div className="card" style={{ marginBottom: '1rem', padding: 0, overflow: 'hidden' }}>
        {/* Clickable header row */}
        <button
          onClick={() => setShowStats((v) => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Quick stat pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Pending',   val: pending,   color: '#f59e0b' },
              { label: 'Done',      val: completed, color: 'var(--success)' },
              { label: 'Expired',   val: expired,   color: 'var(--danger)' },
              { label: 'Overdue',   val: overdue.length, color: 'var(--danger)' },
            ].map((s) => (
              <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: 20, background: 'var(--surface2)', fontSize: '0.78rem', fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text2)' }}>{s.label}</span>
                <span style={{ color: s.val > 0 ? s.color : 'var(--text3)', fontWeight: 800 }}>{s.val}</span>
              </span>
            ))}
          </div>
          <span style={{ color: 'var(--text3)', flexShrink: 0, marginLeft: '0.5rem' }}>
            {showStats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {/* Expanded stats */}
        {showStats && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Chart */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text2)' }}>Distribution</div>
                {(completed + pending + expired) === 0
                  ? <p style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>No data yet.</p>
                  : <canvas ref={chartRef} style={{ maxHeight: 180 }} />}
              </div>
              {/* Threshold setting */}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text2)' }}>Upcoming Window</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    className="input" type="number" inputMode="numeric" min={1} max={90}
                    value={threshold}
                    onChange={(e) => setThreshold(+e.target.value)}
                    style={{ width: 70 }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>days</span>
                  <button className="btn btn-primary btn-sm" onClick={() => updateSettings({ reminderThresholdDays: threshold })}>Save</button>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text3)', margin: '0.4rem 0 0', lineHeight: 1.4 }}>
                  Reminders within {threshold} days show as "upcoming"
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Pending
          {activeReminders.length > 0 && (
            <span style={{ background: overdue.length > 0 ? 'var(--danger)' : 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: '0.65rem', padding: '0.1rem 0.45rem', marginLeft: 5, fontWeight: 700 }}>
              {activeReminders.length}
            </span>
          )}
        </button>
        <button className={`tab ${tab === 'archived' ? 'active' : ''}`} onClick={() => setTab('archived')}>
          Archived
          {archivedReminders.length > 0 && (
            <span style={{ background: 'var(--surface2)', color: 'var(--text2)', borderRadius: 999, fontSize: '0.65rem', padding: '0.1rem 0.45rem', marginLeft: 5, fontWeight: 700 }}>
              {archivedReminders.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Reminder list ─────────────────────────────────────────────────── */}
      {displayed.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} message={tab === 'active' ? 'No pending reminders!' : 'No archived reminders.'} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {displayed.map((r) => (
            <div key={r.id} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderColor(r)}`,
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem 1rem',
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              boxShadow: 'var(--shadow)',
            }}>
              {/* Left icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isOverdue(r) ? 'rgba(239,68,68,0.1)' : isUpcoming(r) ? 'rgba(245,158,11,0.1)' : r.status === 'completed' ? 'rgba(16,185,129,0.1)' : 'var(--surface2)',
              }}>
                <Bell size={16} style={{ color: isOverdue(r) ? 'var(--danger)' : isUpcoming(r) ? '#f59e0b' : r.status === 'completed' ? 'var(--success)' : 'var(--text3)' }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{r.title}</span>
                  {isOverdue(r)  && <span className="badge badge-expired">Overdue</span>}
                  {isUpcoming(r) && !isOverdue(r) && <span className="badge badge-pending">Upcoming</span>}
                  {r.recurring   && <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>Recurring</span>}
                  {r.status === 'completed' && <span className="badge badge-completed">Done</span>}
                </div>
                {r.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0 0 0.3rem', lineHeight: 1.4 }}>{r.description}</p>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>
                  📅 {formatDate(r.date)}
                  {r.completedDate && <span style={{ marginLeft: 6 }}>· ✓ {formatDate(r.completedDate)}</span>}
                </div>
              </div>

              {/* Actions — stacked on mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
                {r.status === 'pending' && (
                  <button className="btn btn-secondary btn-sm" title="Mark complete"
                    onClick={() => completeReminder(r.id)}
                    style={{ color: 'var(--success)', borderColor: 'var(--success)', minWidth: 36 }}>
                    <Check size={13} />
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)} style={{ minWidth: 36 }}>
                  <Edit2 size={13} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)} style={{ minWidth: 36 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Reminder' : 'Add Reminder'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </>}
      >
        <div className="form-group">
          <label>Title</label>
          <input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Pay electricity bill" />
        </div>
        <div className="form-group">
          <label>Description (optional)</label>
          <textarea className="input" value={form.description || ''} onChange={(e) => setField('description', e.target.value)}
            placeholder="Additional notes..." rows={2} style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="input select" value={form.status} onChange={(e) => setField('status', e.target.value as ReminderStatus)}>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', textTransform: 'none', fontWeight: 500, fontSize: '0.9rem', color: 'var(--text)' }}>
            <input type="checkbox" checked={form.recurring} onChange={(e) => setField('recurring', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent)' }} />
            Recurring monthly reminder
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteReminder(deleteId)}
        title="Delete Reminder" message="Remove this reminder?" />
    </div>
  );
}