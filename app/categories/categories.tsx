'use client';
import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, ColorPicker, EmptyState } from '../../components/ui/page';
import { Category } from '../types';
import { CHART_COLORS } from '../constants';

const TABS = [
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'investment', label: 'Investment' },
  { id: 'shop', label: 'Shops/Sources' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Categories() {
  const { data, addCategory, updateCategory, deleteCategory } = useApp();
  const [tab, setTab] = useState<TabId>('income');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CHART_COLORS[0]);

  const filtered = data.categories.filter((c) => c.type === tab);

  function openAdd() { setEditing(null); setName(''); setColor(CHART_COLORS[0]); setModalOpen(true); }
  function openEdit(c: Category) { setEditing(c); setName(c.name); setColor(c.color); setModalOpen(true); }

  function handleSave() {
    if (!name.trim()) return;
    if (editing) updateCategory({ ...editing, name: name.trim(), color });
    else addCategory({ name: name.trim(), color, type: tab });
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Categories</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Category</button>
      </div>

      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={`No ${tab} categories yet.`} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {filtered.map((cat) => (
            <div key={cat.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: cat.color }} />
              </div>
              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem' }}>{cat.name}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)} style={{ padding: '0.3rem' }}><Edit2 size={13} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(cat.id)} style={{ padding: '0.3rem' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Category' : `Add ${tab} Category`}
        footer={<><button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
        <div className="form-group">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" autoFocus />
        </div>
        <div className="form-group">
          <label>Color</label>
          <ColorPicker value={color} onChange={setColor} colors={CHART_COLORS} />
          <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: color }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{color}</span>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteCategory(deleteId)}
        title="Delete Category" message="Delete this category? Existing transactions will keep their category ID." />
    </div>
  );
}