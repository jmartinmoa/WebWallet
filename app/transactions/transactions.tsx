'use client';
import React, { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Copy, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState, Pagination } from '../../components/ui/page';
import { groupTransactionsByWeek, formatDate, parseLocalDate } from '../lib/utils';
import { Transaction } from '../types';

const TODAY = new Date().toISOString().split('T')[0];

const EMPTY: Omit<Transaction, 'id'> = {
  type: 'expense', category: '', description: '', amount: 0,
  date: TODAY, cardId: '', shopId: '',
};

const PAGE_SIZE = 40;
type ModalMode = 'add' | 'edit' | 'duplicate';

function fmt(n: number, hide: boolean) {
  if (hide) return '••••';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

// Build per-week summary from a list of transactions
function buildWeekSummary(transactions: Transaction[]) {
  const map = new Map<string, { income: number; expense: number; count: number }>();
  for (const t of transactions) {
    const d     = parseLocalDate(t.date);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const cur = map.get(label) ?? { income: 0, expense: 0, count: 0 };
    cur.count++;
    if (t.type === 'income')  cur.income  += t.amount;
    else                       cur.expense += t.amount;
    map.set(label, cur);
  }
  // Sort by the actual start date descending
  return Array.from(map.entries())
    .sort((a, b) => {
      // parse first date in label e.g. "Jan 1"
      const parseLabel = (l: string) => new Date(l.split(' – ')[0] + ' ' + new Date().getFullYear());
      return parseLabel(b[0]).getTime() - parseLabel(a[0]).getTime();
    })
    .map(([week, s]) => ({ week, ...s, net: s.income - s.expense }));
}

export default function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen]   = useState(false);
  const [modalMode, setModalMode]   = useState<ModalMode>('add');
  const [editing, setEditing]       = useState<Transaction | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState<Omit<Transaction, 'id'>>(EMPTY);
  const [page, setPage]             = useState(1);
  const [showSummary, setShowSummary] = useState(true);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years  = Array.from(new Set(data.transactions.map((t) => parseLocalDate(t.date).getFullYear()))).sort((a, b) => b - a);

  const filtered = useMemo(() => data.transactions.filter((t) => {
    const d = parseLocalDate(t.date);
    if (search      && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType  && t.type !== filterType) return false;
    if (filterCat   && t.category !== filterCat) return false;
    if (filterMonth && d.getMonth() !== +filterMonth) return false;
    if (filterYear  && d.getFullYear() !== +filterYear) return false;
    return true;
  }), [data.transactions, search, filterType, filterCat, filterMonth, filterYear]);

  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const grouped     = groupTransactionsByWeek(paginated);
  const weekSummary = useMemo(() => buildWeekSummary(filtered), [filtered]);

  // Totals over the filtered set
  const totalIncome   = useMemo(() => filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalExpense  = useMemo(() => filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [filtered]);
  const totalNet      = totalIncome - totalExpense;

  const incomeCategories  = data.categories.filter((c) => c.type === 'income');
  const expenseCategories = data.categories.filter((c) => c.type === 'expense');
  const currentCategories = form.type === 'income' ? incomeCategories : expenseCategories;

  // ── open helpers ─────────────────────────────────────────────────────────
  function openAdd() { setEditing(null); setModalMode('add'); setForm(EMPTY); setModalOpen(true); }

  function openEdit(t: Transaction) {
    setEditing(t); setModalMode('edit');
    setForm({ type: t.type, category: t.category, description: t.description,
              amount: t.amount, date: t.date, cardId: t.cardId, shopId: t.shopId });
    setModalOpen(true);
  }

  function openDuplicate(t: Transaction) {
    setEditing(null); setModalMode('duplicate');
    setForm({ type: t.type, category: t.category, description: t.description,
              amount: t.amount, date: TODAY, cardId: t.cardId, shopId: t.shopId });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.description || !form.amount || !form.date) return;
    if (modalMode === 'edit' && editing) updateTransaction({ ...form, id: editing.id });
    else addTransaction(form);
    setModalOpen(false);
  }

  function setField(k: keyof typeof form, v: any) { setForm((f) => ({ ...f, [k]: v })); }

  const isFiltered = !!(search || filterType || filterCat || filterMonth || filterYear);
  const modalTitle = modalMode === 'edit' ? 'Edit Transaction' : modalMode === 'duplicate' ? 'Add from Selected' : 'Add Transaction';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Transactions</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowSummary((s) => !s)}>
            {showSummary ? 'Hide Summary' : 'Show Summary'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Transaction</button>
        </div>
      </div>

      {/* ── Summary panel ──────────────────────────────────────────────────── */}
      {showSummary && (
        <div style={{ marginBottom: '1.5rem' }}>

          {/* Total cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Income */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowUpRight size={18} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>
                  {isFiltered ? 'FILTERED INCOME' : 'TOTAL INCOME'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>{fmt(totalIncome, hide)}</div>
              </div>
            </div>

            {/* Expense */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ArrowDownRight size={18} style={{ color: 'var(--danger)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>
                  {isFiltered ? 'FILTERED EXPENSES' : 'TOTAL EXPENSES'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger)' }}>{fmt(totalExpense, hide)}</div>
              </div>
            </div>

            {/* Net */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: totalNet >= 0 ? 'rgba(99,102,241,0.12)' : 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={18} style={{ color: totalNet >= 0 ? 'var(--accent)' : 'var(--danger)' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>NET BALANCE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: totalNet >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                  {totalNet >= 0 ? '+' : ''}{fmt(totalNet, hide)}
                </div>
              </div>
            </div>

            {/* Count */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.9rem 1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(100,116,139,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text2)' }}>#</span>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 2 }}>TRANSACTIONS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{filtered.length}</div>
              </div>
            </div>
          </div>

          {/* Weekly breakdown table */}
          {weekSummary.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Weekly Breakdown</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>{isFiltered ? 'filtered results' : 'all transactions'}</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th style={{ color: 'var(--success)' }}>Income</th>
                      <th style={{ color: 'var(--danger)' }}>Expenses</th>
                      <th>Net</th>
                      <th style={{ textAlign: 'right' }}>Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weekSummary.map(({ week, income, expense, net, count }) => (
                      <tr key={week}>
                        <td style={{ fontWeight: 500, fontSize: '0.82rem', color: 'var(--text2)' }}>{week}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                          {income > 0 ? fmt(income, hide) : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          {expense > 0 ? fmt(expense, hide) : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {net >= 0 ? '+' : ''}{fmt(net, hide)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text3)', background: 'var(--surface2)', padding: '0.15rem 0.5rem', borderRadius: 20 }}>
                            {count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface2)' }}>
                      <td style={{ fontWeight: 700, fontSize: '0.82rem' }}>Total</td>
                      <td style={{ fontWeight: 800, color: 'var(--success)' }}>{fmt(totalIncome, hide)}</td>
                      <td style={{ fontWeight: 800, color: 'var(--danger)' }}>{fmt(totalExpense, hide)}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: totalNet >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {totalNet >= 0 ? '+' : ''}{fmt(totalNet, hide)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.82rem' }}>{filtered.length}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="search-bar" style={{ flex: '1 1 200px', minWidth: 160 }}>
          <Search size={14} />
          <input placeholder="Search..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input select" value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 110 }}>
          <option value="">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className="input select" value={filterCat}
          onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 130 }}>
          <option value="">All Categories</option>
          {data.categories.filter((c) => c.type === 'income' || c.type === 'expense').map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input select" value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 100 }}>
          <option value="">All Months</option>
          {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select className="input select" value={filterYear}
          onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: 90 }}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {isFiltered && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterType(''); setFilterCat(''); setFilterMonth(''); setFilterYear(''); setPage(1); }}>
            Clear
          </button>
        )}
      </div>

      {/* ── Grouped list ───────────────────────────────────────────────────── */}
      {Object.keys(grouped).length === 0 ? (
        <EmptyState message="No transactions found." />
      ) : (
        Object.entries(grouped).map(([week, txns]) => {
          const wIncome  = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const wExpense = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
          const wNet     = wIncome - wExpense;
          return (
            <div key={week} style={{ marginBottom: '1.5rem' }}>
              {/* Week header with inline mini-summary */}
              <div className="week-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span>{week}</span>
                {!hide && (
                  <span style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {wIncome  > 0 && <span style={{ color: 'var(--success)' }}>+{fmt(wIncome, false)}</span>}
                    {wExpense > 0 && <span style={{ color: 'var(--danger)' }}>−{fmt(wExpense, false)}</span>}
                    <span style={{ color: wNet >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                      net {wNet >= 0 ? '+' : ''}{fmt(wNet, false)}
                    </span>
                  </span>
                )}
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {txns.map((t) => {
                  const cat  = data.categories.find((c) => c.id === t.category);
                  const card = data.cards.find((c) => c.id === t.cardId);
                  return (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 9,
                        background: `${cat?.color || '#64748b'}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat?.color || '#64748b' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.description}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text2)',
                          display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span>{cat?.name || 'Uncategorized'}</span>
                          {card && <span>· ••••{card.last4}</span>}
                          <span>· {formatDate(t.date)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700,
                          color: t.type === 'income' ? 'var(--success)' : 'var(--danger)',
                          fontSize: '0.9rem' }}>
                          {t.type === 'income' ? '+' : '-'}
                          {hide ? '••' : `$${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                        </div>
                        <span className={`badge badge-${t.type}`}>{t.type}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openDuplicate(t)} title="Add from this"><Copy size={13} /></button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(t)} title="Edit"><Edit2 size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(t.id)} title="Delete"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage} />

      {/* ── Add / Edit / Duplicate Modal ───────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {modalMode === 'duplicate' ? <><Copy size={13} /> Save as New</> : 'Save'}
          </button>
        </>}
      >
        {modalMode === 'duplicate' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.9rem', marginBottom: '1rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--accent)' }}>
            <Copy size={13} /> Fields copied from the selected transaction. Adjust as needed and save as a new record.
          </div>
        )}
        <div className="form-group">
          <label>Type</label>
          <div className="tabs">
            <button className={`tab ${form.type === 'income' ? 'active' : ''}`} onClick={() => setField('type', 'income')}>Income</button>
            <button className={`tab ${form.type === 'expense' ? 'active' : ''}`} onClick={() => setField('type', 'expense')}>Expense</button>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Description</label>
            <input className="input" value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="e.g. Grocery shopping" />
          </div>
          <div className="form-group">
            <label>Amount ($)</label>
            <input className="input" type="number" min={0} step={0.01} value={form.amount || ''} onChange={(e) => setField('amount', +e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Category</label>
            <select className="input select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
              <option value="">Select category</option>
              {currentCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} />
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Card (optional)</label>
            <select className="input select" value={form.cardId || ''} onChange={(e) => setField('cardId', e.target.value)}>
              <option value="">None</option>
              {data.cards.map((c) => <option key={c.id} value={c.id}>••••{c.last4} ({c.name} {c.type})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Shop/Source (optional)</label>
            <select className="input select" value={form.shopId || ''} onChange={(e) => setField('shopId', e.target.value)}>
              <option value="">None</option>
              {data.categories.filter((c) => c.type === 'shop').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTransaction(deleteId)}
        title="Delete Transaction" message="Are you sure you want to delete this transaction? This action cannot be undone." />
    </div>
  );
}