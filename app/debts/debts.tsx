'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState, Pagination } from '../../components/ui/page';
import { Debt } from '../types';
import { calcDebtProgress } from '../lib/utils';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') Chart.register(...registerables);

const EMPTY: Omit<Debt, 'id'> = {
  name: '', totalAmount: 0, installments: 12, paidInstallments: 0,
  cardId: '', startDate: new Date().toISOString().split('T')[0], status: 'active',
};

const PAGE_SIZE = 8;

export default function Debts() {
  const { data, addDebt, updateDebt, deleteDebt } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Debt, 'id'>>(EMPTY);
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);

  const progressRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<Chart[]>([]);

  useEffect(() => {
    chartInstances.current.forEach((c) => c.destroy());
    chartInstances.current = [];

    if (progressRef.current && data.debts.length > 0) {
      const prog = data.debts.map((d) => calcDebtProgress(d));
      const c1 = new Chart(progressRef.current, {
        type: 'bar',
        data: {
          labels: data.debts.map((d) => d.name),
          datasets: [
            { label: 'Paid', data: prog.map((p) => p.paid), backgroundColor: 'rgba(16,185,129,0.8)', borderRadius: 4 },
            { label: 'Remaining', data: prog.map((p) => p.remaining), backgroundColor: 'rgba(239,68,68,0.5)', borderRadius: 4 },
          ],
        },
        options: {
          responsive: true, indexAxis: 'y',
          scales: { x: { stacked: true }, y: { stacked: true } },
          plugins: { legend: { labels: { font: { size: 11 } } } },
        },
      });
      chartInstances.current.push(c1);
    }

    if (timelineRef.current && data.debts.length > 0) {
      const c2 = new Chart(timelineRef.current, {
        type: 'bar',
        data: {
          labels: data.debts.map((d) => d.name),
          datasets: [{
            label: 'Months to Pay Off',
            data: data.debts.map((d) => d.installments - d.paidInstallments),
            backgroundColor: 'rgba(99,102,241,0.7)',
            borderRadius: 4,
          }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } },
        },
      });
      chartInstances.current.push(c2);
    }

    return () => chartInstances.current.forEach((c) => c.destroy());
  }, [data.debts]);

  const filtered = data.debts.filter((d) => !filterStatus || d.status === filterStatus);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(d: Debt) { setEditing(d); setForm({ name: d.name, totalAmount: d.totalAmount, installments: d.installments, paidInstallments: d.paidInstallments, cardId: d.cardId, startDate: d.startDate, status: d.status }); setModalOpen(true); }
  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    if (!form.name || !form.totalAmount) return;
    if (editing) updateDebt({ ...form, id: editing.id });
    else addDebt(form);
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Debts</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Debt</button>
      </div>

      {/* Charts */}
      {data.debts.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Debts Progress</h3>
            <canvas ref={progressRef} />
          </div>
          <div className="card">
            <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Time to Pay Off (months)</h3>
            <canvas ref={timelineRef} />
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select className="input select" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} style={{ width: 'auto', minWidth: 130 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No debts found. Great financial health!" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {paginated.map((debt) => {
            const prog = calcDebtProgress(debt);
            const card = data.cards.find((c) => c.id === debt.cardId);
            return (
              <div key={debt.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600 }}>{debt.name}</span>
                      <span className={`badge ${debt.status === 'paid' ? 'badge-completed' : 'badge-pending'}`}>{debt.status}</span>
                    </div>
                    {card && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '0.5rem' }}>Card: ••••{card.last4}</div>}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '0.75rem' }}>
                      Started: {debt.startDate} · {debt.paidInstallments}/{debt.installments} installments
                    </div>
                    <div className="progress-bar" style={{ marginBottom: '0.4rem' }}>
                      <div className="progress-fill" style={{ width: `${prog.pct}%`, background: prog.pct >= 100 ? 'var(--success)' : 'var(--accent)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text2)' }}>
                      <span>Paid: {hide ? '••' : `$${prog.paid.toFixed(2)}`}</span>
                      <span>{prog.pct.toFixed(1)}%</span>
                      <span>Remaining: {hide ? '••' : `$${prog.remaining.toFixed(2)}`}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{hide ? '••' : `$${debt.totalAmount.toLocaleString()}`}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginBottom: '0.75rem' }}>
                      {hide ? '••' : `$${prog.installmentAmount.toFixed(2)}`}/mo
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary btn-sm" title="Increment paid" onClick={() => updateDebt({ ...debt, paidInstallments: Math.min(debt.paidInstallments + 1, debt.installments), status: debt.paidInstallments + 1 >= debt.installments ? 'paid' : 'active' })}>
                        <ChevronUp size={13} />
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Decrement paid" onClick={() => updateDebt({ ...debt, paidInstallments: Math.max(debt.paidInstallments - 1, 0), status: 'active' })}>
                        <ChevronDown size={13} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(debt)}><Edit2 size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(debt.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Debt' : 'Add Debt'}
        footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-group"><label>Name</label><input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Car Loan" /></div>
        <div className="form-grid">
          <div className="form-group"><label>Total Amount ($)</label><input className="input" type="number" min={0} step={0.01} value={form.totalAmount || ''} onChange={(e) => setField('totalAmount', +e.target.value)} /></div>
          <div className="form-group"><label>Total Installments</label><input className="input" type="number" min={1} value={form.installments || ''} onChange={(e) => setField('installments', +e.target.value)} /></div>
        </div>
        <div className="form-grid">
          <div className="form-group"><label>Paid Installments</label><input className="input" type="number" min={0} value={form.paidInstallments} onChange={(e) => setField('paidInstallments', +e.target.value)} /></div>
          <div className="form-group"><label>Start Date</label><input className="input" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Related Card (optional)</label>
            <select className="input select" value={form.cardId || ''} onChange={(e) => setField('cardId', e.target.value)}>
              <option value="">None</option>
              {data.cards.map((c) => <option key={c.id} value={c.id}>••••{c.last4} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="input select" value={form.status} onChange={(e) => setField('status', e.target.value as any)}>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteDebt(deleteId)}
        title="Delete Debt" message="Remove this debt record?" />
    </div>
  );
}