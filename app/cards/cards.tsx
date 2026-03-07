'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, ColorPicker, EmptyState } from '../../components/ui/page';
import { Card } from '../types';
import { CARD_COLORS } from '../constants';

const EMPTY: Omit<Card, 'id'> = {
  name: '', type: 'credit', last4: '', limit: undefined,
  balance: 0, dueDate: undefined, color: CARD_COLORS[0],
};

export default function Cards() {
  const { data, addCard, updateCard, deleteCard } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Card, 'id'>>(EMPTY);

  function openAdd() { setEditing(null); setForm(EMPTY); setModalOpen(true); }
  function openEdit(c: Card) { setEditing(c); setForm({ name: c.name, type: c.type, last4: c.last4, limit: c.limit, balance: c.balance, dueDate: c.dueDate, color: c.color }); setModalOpen(true); }
  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  function handleSave() {
    if (!form.name || !form.last4) return;
    if (editing) updateCard({ ...form, id: editing.id });
    else addCard(form);
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Cards</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Card</button>
      </div>

      {data.cards.length === 0 ? (
        <EmptyState icon={<CreditCard size={48} />} message="No cards yet. Add your first card!" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {data.cards.map((card) => {
            const utilization = card.type === 'credit' && card.limit ? (card.balance / card.limit) * 100 : null;
            const cardTxns = data.transactions.filter((t) => t.cardId === card.id);
            const totalSpent = cardTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

            return (
              <div key={card.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Card Visual */}
                <div className="credit-card-visual" style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.type}</div>
                      <div style={{ fontWeight: 600, fontSize: '1rem' }}>{card.name}</div>
                    </div>
                    <CreditCard size={24} style={{ opacity: 0.5 }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'monospace', letterSpacing: '0.15em', fontSize: '1rem' }}>
                      •••• •••• •••• {card.last4}
                    </div>
                    {card.dueDate && (
                      <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: 2 }}>Due: {card.dueDate}th of month</div>
                    )}
                  </div>
                </div>

                {/* Card Info */}
                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600 }}>BALANCE</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                        {hide ? '••••' : `$${card.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      </div>
                    </div>
                    {card.type === 'credit' && card.limit && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600 }}>LIMIT</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)' }}>
                          {hide ? '••••' : `$${card.limit.toLocaleString()}`}
                        </div>
                      </div>
                    )}
                  </div>

                  {utilization !== null && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text2)', marginBottom: '0.3rem' }}>
                        <span>Utilization</span>
                        <span style={{ color: utilization > 70 ? 'var(--danger)' : utilization > 30 ? 'var(--warning)' : 'var(--success)' }}>
                          {utilization.toFixed(1)}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{
                          width: `${Math.min(utilization, 100)}%`,
                          background: utilization > 70 ? 'var(--danger)' : utilization > 30 ? 'var(--warning)' : 'var(--success)',
                        }} />
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '0.75rem' }}>
                    {cardTxns.length} transactions · {hide ? '••' : `$${totalSpent.toLocaleString()}`} spent
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(card)} style={{ flex: 1, justifyContent: 'center' }}>
                      <Edit2 size={13} /> Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(card.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Card' : 'Add Card'}
        footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-grid">
          <div className="form-group"><label>Card Name</label><input className="input" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="e.g. Chase Sapphire" /></div>
          <div className="form-group">
            <label>Type</label>
            <select className="input select" value={form.type} onChange={(e) => setField('type', e.target.value)}>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group"><label>Last 4 Digits</label><input className="input" value={form.last4} maxLength={4} onChange={(e) => setField('last4', e.target.value.replace(/\D/g, ''))} placeholder="1234" /></div>
          <div className="form-group"><label>Balance ($)</label><input className="input" type="number" min={0} step={0.01} value={form.balance || ''} onChange={(e) => setField('balance', +e.target.value)} /></div>
        </div>
        {form.type === 'credit' && (
          <div className="form-grid">
            <div className="form-group"><label>Credit Limit ($)</label><input className="input" type="number" min={0} value={form.limit || ''} onChange={(e) => setField('limit', +e.target.value)} /></div>
            <div className="form-group"><label>Due Date (day of month)</label><input className="input" type="number" min={1} max={31} value={form.dueDate || ''} onChange={(e) => setField('dueDate', +e.target.value)} placeholder="e.g. 15" /></div>
          </div>
        )}
        <div className="form-group">
          <label>Card Color</label>
          <ColorPicker value={form.color} onChange={(c) => setField('color', c)} colors={CARD_COLORS} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteCard(deleteId)}
        title="Remove Card" message="Remove this card? This won't delete related transactions." />
    </div>
  );
}