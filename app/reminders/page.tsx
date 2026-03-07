'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, Bell, Check, Archive } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState } from '../components/ui/page';
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
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Reminder, 'id'>>(EMPTY);
  const [threshold, setThreshold] = useState(data.settings.reminderThresholdDays);

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const now = new Date();
  const activeReminders = data.reminders.filter((r) => r.status === 'pending');
  const overdue = getOverdueReminders(data.reminders);
  const archivedReminders = data.reminders.filter((r) => r.status === 'completed' || r.status === 'expired');
  const displayed = tab === 'active' ? activeReminders : archivedReminders;

  const completed = data.reminders.filter((r) => r.status === 'completed').length;
  const pending = data.reminders.filter((r) => r.status === 'pending').length;
  const expired = data.reminders.filter((r) => r.status === 'expired').length;

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending', 'Expired'],
        datasets: [{ data: [completed, pending, expired], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 6 }],
      },
      options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'right', labels: { font: { size: 11 }, color: '#64748b' } } } },
    });
  }, [completed, pending, expired]);

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(r: Reminder) { setEditing(r); setForm({ title: r.title, description: r.description, date: r.date, status: r.status, recurring: r.recurring, completedDate: r.completedDate }); setModalOpen(true); }
  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    if (!form.title || !form.date) return;
    if (editing) updateReminder({ ...form, id: editing.id });
    else addReminder(form);
    setModalOpen(false);
  }

  function handleThresholdSave() {
    updateSettings({ reminderThresholdDays: threshold });
  }

  function isOverdue(r: Reminder) {
    return r.status === 'pending' && new Date(r.date) < now;
  }

  function isUpcoming(r: Reminder) {
    const d = new Date(r.date);
    const limit = new Date(now.getTime() + threshold * 86400000);
    return r.status === 'pending' && d >= now && d <= limit;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Reminders</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Reminder</button>
      </div>

      {/* Threshold + chart row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Reminder Distribution</h3>
          <canvas ref={chartRef} style={{ maxHeight: 160 }} />
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Settings</h3>
          <div className="form-group">
            <label>Upcoming threshold (days)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" type="number" min={1} max={90} value={threshold} onChange={(e) => setThreshold(+e.target.value)} style={{ maxWidth: 100 }} />
              <button className="btn btn-primary btn-sm" onClick={handleThresholdSave}>Save</button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)', margin: '0.4rem 0 0' }}>
              Reminders within {threshold} days will appear as "upcoming"
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
            {[{ label: 'Pending', val: pending, color: 'var(--warning)' }, { label: 'Done', val: completed, color: 'var(--success)' }, { label: 'Expired', val: expired, color: 'var(--danger)' }].map((s) => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem', background: 'var(--surface2)', borderRadius: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Pending/Overdue {activeReminders.length > 0 && <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: '999px', fontSize: '0.65rem', padding: '0.1rem 0.4rem', marginLeft: 4 }}>{overdue.length || activeReminders.length}</span>}
        </button>
        <button className={`tab ${tab === 'archived' ? 'active' : ''}`} onClick={() => setTab('archived')}>
          Archived ({archivedReminders.length})
        </button>
      </div>

      {displayed.length === 0 ? (
        <EmptyState icon={<Bell size={40} />} message={tab === 'active' ? 'No pending reminders!' : 'No archived reminders.'} />
      ) : (
        displayed.map((r) => (
          <div key={r.id} className="reminder-item" style={{ borderLeft: `3px solid ${isOverdue(r) ? 'var(--danger)' : isUpcoming(r) ? 'var(--warning)' : 'var(--border)'}` }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</span>
                {isOverdue(r) && <span className="badge badge-expired">Overdue</span>}
                {isUpcoming(r) && !isOverdue(r) && <span className="badge badge-pending">Upcoming</span>}
                {r.recurring && <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}>Recurring</span>}
                {r.status === 'completed' && <span className="badge badge-completed">Completed</span>}
              </div>
              {r.description && <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0.2rem 0 0' }}>{r.description}</p>}
              <div style={{ fontSize: '0.75rem', color: 'var(--text3)', marginTop: '0.25rem' }}>
                {formatDate(r.date)}
                {r.completedDate && ` · Completed ${formatDate(r.completedDate)}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, alignItems: 'flex-start' }}>
              {r.status === 'pending' && (
                <button className="btn btn-secondary btn-sm" title="Mark complete" onClick={() => completeReminder(r.id)} style={{ color: 'var(--success)' }}>
                  <Check size={13} />
                </button>
              )}
              <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}><Edit2 size={13} /></button>
              <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Reminder' : 'Add Reminder'}
        footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-group"><label>Title</label><input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Pay electricity bill" autoFocus /></div>
        <div className="form-group"><label>Description (optional)</label><textarea className="input" value={form.description || ''} onChange={(e) => setField('description', e.target.value)} placeholder="Additional notes..." rows={2} style={{ resize: 'vertical' }} /></div>
        <div className="form-grid">
          <div className="form-group"><label>Date</label><input className="input" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} /></div>
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
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', color: 'var(--text)' }}>
            <input type="checkbox" checked={form.recurring} onChange={(e) => setField('recurring', e.target.checked)} style={{ width: 16, height: 16 }} />
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