'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Copy, Search } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState, Pagination } from '../../components/ui/page';
import { Investment } from '../types';
import { parseLocalDate } from '../lib/utils';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') Chart.register(...registerables);

const TODAY = new Date().toISOString().split('T')[0];
const EMPTY: Omit<Investment, 'id'> = { name: '', type: '', amountInvested: 0, currentValue: 0, date: TODAY };
const PAGE_SIZE = 10;
type ModalMode = 'add' | 'edit' | 'duplicate';

// ── helpers ───────────────────────────────────────────────────────────────────

// For each unique asset name, return the most recent entry
function latestPerAsset(investments: Investment[]): Investment[] {
  const map = new Map<string, Investment>();
  for (const inv of investments) {
    const key     = inv.name.trim().toLowerCase();
    const current = map.get(key);
    if (!current || parseLocalDate(inv.date) > parseLocalDate(current.date)) {
      map.set(key, inv);
    }
  }
  return Array.from(map.values());
}

// For each unique asset name, return the most recent entry BEFORE a given date
function latestPerAssetBefore(investments: Investment[], before: Date): Investment[] {
  const map = new Map<string, Investment>();
  for (const inv of investments) {
    const d = parseLocalDate(inv.date);
    if (d >= before) continue;
    const key     = inv.name.trim().toLowerCase();
    const current = map.get(key);
    if (!current || d > parseLocalDate(current.date)) {
      map.set(key, inv);
    }
  }
  return Array.from(map.values());
}

export default function Investments() {
  const { data, addInvestment, updateInvestment, deleteInvestment } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editing, setEditing]     = useState<Investment | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState<Omit<Investment, 'id'>>(EMPTY);
  const [page, setPage]           = useState(1);

  // Filters
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');

  const chartRef      = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const invTypes = data.categories.filter((c) => c.type === 'investment');

  // ── Portfolio snapshot logic ──────────────────────────────────────────────
  // Current portfolio = latest entry per asset name (all time)
  const currentPortfolio = useMemo(() => latestPerAsset(data.investments), [data.investments]);

  const totalInvested = currentPortfolio.reduce((s, i) => s + i.amountInvested, 0);
  const totalCurrent  = currentPortfolio.reduce((s, i) => s + i.currentValue,   0);
  const totalGain     = totalCurrent - totalInvested;
  const gainPct       = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Previous month snapshot for MoM comparison
  const now      = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevPortfolio    = useMemo(
    () => latestPerAssetBefore(data.investments, firstOfThisMonth),
    [data.investments]
  );
  const prevValue = prevPortfolio.reduce((s, i) => s + i.currentValue, 0);
  const momChange = prevValue > 0 ? ((totalCurrent - prevValue) / prevValue) * 100 : null;

  // ── Filtered list (all entries, for the table) ───────────────────────────
  const years = Array.from(new Set(data.investments.map((i) => parseLocalDate(i.date).getFullYear()))).sort((a, b) => b - a);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const filtered = useMemo(() => data.investments.filter((inv) => {
    const d = parseLocalDate(inv.date);
    if (search      && !inv.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType  && inv.type !== filterType) return false;
    if (filterMonth && d.getMonth() !== +filterMonth) return false;
    if (filterYear  && d.getFullYear() !== +filterYear) return false;
    return true;
  }).sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()),
  [data.investments, search, filterType, filterMonth, filterYear]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Chart ─────────────────────────────────────────────────────────────────
  const byType = invTypes.map((t) => ({
    name: t.name, color: t.color,
    total: currentPortfolio.filter((i) => i.type === t.id).reduce((s, i) => s + i.currentValue, 0),
  })).filter((t) => t.total > 0);

  useEffect(() => {
    if (!chartRef.current || byType.length === 0) return;
    chartInstance.current?.destroy();
    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: byType.map((t) => t.name),
        datasets: [{ data: byType.map((t) => t.total),
          backgroundColor: byType.map((t) => t.color), borderWidth: 0, hoverOffset: 8 }],
      },
      options: { responsive: true, cutout: '62%',
        plugins: { legend: { position: 'right', labels: { color: '#64748b', padding: 12, font: { size: 11 } } } } },
    });
  }, [JSON.stringify(byType)]);

  // ── open helpers ──────────────────────────────────────────────────────────
  function openAdd() { setEditing(null); setModalMode('add'); setForm(EMPTY); setModalOpen(true); }
  function openEdit(i: Investment) {
    setEditing(i); setModalMode('edit');
    setForm({ name: i.name, type: i.type, amountInvested: i.amountInvested, currentValue: i.currentValue, date: i.date });
    setModalOpen(true);
  }
  function openDuplicate(i: Investment) {
    setEditing(null); setModalMode('duplicate');
    setForm({ name: i.name, type: i.type, amountInvested: i.amountInvested, currentValue: i.currentValue, date: TODAY });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name || !form.amountInvested) return;
    if (modalMode === 'edit' && editing) updateInvestment({ ...form, id: editing.id });
    else addInvestment(form);
    setModalOpen(false);
  }

  const modalTitle = modalMode === 'edit' ? 'Edit Investment' : modalMode === 'duplicate' ? 'Add from Selected' : 'Add Investment';

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Investments</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Investment</button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Invested */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, marginBottom: '0.3rem' }}>TOTAL INVESTED</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent)' }}>
            {hide ? '••••' : `$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: 2 }}>{currentPortfolio.length} assets</div>
        </div>

        {/* Current Value */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, marginBottom: '0.3rem' }}>CURRENT VALUE</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>
            {hide ? '••••' : `$${totalCurrent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          {momChange !== null && (
            <div style={{ fontSize: '0.72rem', color: momChange >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              {momChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% vs last month
            </div>
          )}
        </div>

        {/* Total Gain/Loss */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', color: 'var(--text2)', fontWeight: 600, marginBottom: '0.3rem' }}>GAIN / LOSS</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {hide ? '••••' : `${totalGain >= 0 ? '+' : ''}$${totalGain.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.72rem', color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {gainPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {gainPct.toFixed(2)}% overall
          </div>
        </div>


      </div>

      {/* ── Chart + Current Portfolio ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Portfolio Distribution</div>
          {byType.length === 0
            ? <EmptyState message="Add investments to see distribution" />
            : <canvas ref={chartRef} />}
        </div>

        {/* Current Portfolio (latest per asset) */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Current Portfolio</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>Latest snapshot per asset</span>
          </div>
          {currentPortfolio.length === 0 ? (
            <EmptyState message="No investments yet" />
          ) : (
            <div className="table-container">
              <table>
                <thead><tr>
                  <th>Asset</th><th>Type</th><th>Invested</th><th>Current</th><th>Gain/Loss</th><th>Last Updated</th>
                </tr></thead>
                <tbody>
                  {currentPortfolio.map((inv) => {
                    const gain    = inv.currentValue - inv.amountInvested;
                    const pct     = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
                    const typeCat = invTypes.find((t) => t.id === inv.type);
                    // Find previous month snapshot for this asset
                    const prevSnap = latestPerAssetBefore(
                      data.investments.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase()),
                      firstOfThisMonth
                    )[0];
                    const assetMom = prevSnap
                      ? ((inv.currentValue - prevSnap.currentValue) / prevSnap.currentValue) * 100
                      : null;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>{inv.name}</td>
                        <td>
                          {typeCat && (
                            <span className="chip" style={{ borderColor: typeCat.color, color: typeCat.color, background: `${typeCat.color}12` }}>
                              <span className="color-dot" style={{ background: typeCat.color }} />{typeCat.name}
                            </span>
                          )}
                        </td>
                        <td>{hide ? '••' : `$${inv.amountInvested.toLocaleString()}`}</td>
                        <td style={{ fontWeight: 600 }}>
                          {hide ? '••' : `$${inv.currentValue.toLocaleString()}`}
                          {assetMom !== null && !hide && (
                            <span style={{ fontSize: '0.7rem', marginLeft: 5, color: assetMom >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {assetMom >= 0 ? '▲' : '▼'}{Math.abs(assetMom).toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td style={{ color: gain >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                          {hide ? '••' : `${gain >= 0 ? '+' : ''}$${gain.toFixed(2)}`}
                          <span style={{ fontSize: '0.72rem', marginLeft: 3, opacity: 0.8 }}>({pct.toFixed(1)}%)</span>
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{inv.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── All Entries (filterable) ─────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>All Entries</span>
          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <div className="search-bar" style={{ minWidth: 140 }}>
              <Search size={13} />
              <input placeholder="Search name..." value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="input select" value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              style={{ width: 'auto', minWidth: 110, fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.65rem' }}>
              <option value="">All Types</option>
              {invTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select className="input select" value={filterMonth}
              onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
              style={{ width: 'auto', minWidth: 90, fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.65rem' }}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="input select" value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
              style={{ width: 'auto', minWidth: 80, fontSize: '0.8rem', padding: '0.4rem 2rem 0.4rem 0.65rem' }}>
              <option value="">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            {(search || filterType || filterMonth || filterYear) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterType(''); setFilterMonth(''); setFilterYear(''); setPage(1); }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="No entries match the current filters." />
        ) : (
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Name</th><th>Type</th><th>Invested</th><th>Value</th><th>vs Prev Entry</th><th>Date</th><th></th>
              </tr></thead>
              <tbody>
                {paginated.map((inv, idx) => {
                  const typeCat  = invTypes.find((t) => t.id === inv.type);
                  const isLatest = currentPortfolio.some((c) => c.id === inv.id);
                  // Previous entry for same asset (next item in sorted list with same name)
                  const sameAsset = filtered.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase());
                  const myIdx     = sameAsset.findIndex((i) => i.id === inv.id);
                  const prevEntry = sameAsset[myIdx + 1]; // list is desc by date, so next = older
                  const delta     = prevEntry ? inv.currentValue - prevEntry.currentValue : null;
                  const deltaPct  = prevEntry && prevEntry.currentValue > 0
                    ? (delta! / prevEntry.currentValue) * 100 : null;
                  return (
                    <tr key={inv.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 500 }}>{inv.name}</span>
                          {isLatest && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>
                              LATEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {typeCat && (
                          <span className="chip" style={{ borderColor: typeCat.color, color: typeCat.color, background: `${typeCat.color}12` }}>
                            <span className="color-dot" style={{ background: typeCat.color }} />{typeCat.name}
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text2)' }}>{hide ? '••' : `$${inv.amountInvested.toLocaleString()}`}</td>
                      <td style={{ fontWeight: 600 }}>{hide ? '••' : `$${inv.currentValue.toLocaleString()}`}</td>
                      <td>
                        {delta !== null && !hide ? (
                          <span style={{ color: delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                            {delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toLocaleString()}
                            <span style={{ fontSize: '0.72rem', marginLeft: 4, opacity: 0.8 }}>({deltaPct!.toFixed(1)}%)</span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text3)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{inv.date}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openDuplicate(inv)} title="Add from this"><Copy size={13} /></button>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inv)} title="Edit"><Edit2 size={13} /></button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inv.id)} title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage} />
      </div>

      {/* Modal */}
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
            <Copy size={13} /> Fields copied — adjust and save as a new entry.
          </div>
        )}
        <div className="form-group">
          <label>Asset Name</label>
          <input className="input" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Apple Stock" />
          <p style={{ fontSize: '0.72rem', color: 'var(--text3)', margin: '0.3rem 0 0' }}>
            Use the same name each month to track value over time.
          </p>
        </div>
        <div className="form-group">
          <label>Type</label>
          <select className="input select" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="">Select type</option>
            {invTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Amount Invested ($)</label>
            <input className="input" type="number" min={0} step={0.01} value={form.amountInvested || ''}
              onChange={(e) => {
                const val = +e.target.value;
                setForm((f) => ({
                  ...f,
                  amountInvested: val,
                  // Auto-fill current value only if it hasn't been manually changed
                  // (i.e. it still equals the previous invested amount or is 0)
                  currentValue: f.currentValue === f.amountInvested || f.currentValue === 0 ? val : f.currentValue,
                }));
              }} />
          </div>
          <div className="form-group">
            <label>
              Current Value ($)
            </label>
            <input className="input" type="number" min={0} step={0.01} value={form.currentValue || ''}
              onChange={(e) => setForm((f) => ({ ...f, currentValue: +e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input className="input" type="date" value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteInvestment(deleteId)}
        title="Delete Investment" message="Remove this investment entry?" />
    </div>
  );
}