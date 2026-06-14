'use client';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Copy, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../lib/context';
import { Modal, ConfirmDialog, EmptyState, Pagination } from '../../components/ui/page';
import { Investment } from '../types';
import { parseLocalDate } from '../lib/utils';
import { Chart, registerables } from 'chart.js';

if (typeof window !== 'undefined') Chart.register(...registerables);

const TODAY = new Date().toISOString().split('T')[0];
const EMPTY: Omit<Investment, 'id'> = { name: '', type: '', amountInvested: 0, value: 0, date: TODAY };
const PAGE_SIZE = 10;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
type ModalMode = 'add' | 'edit' | 'duplicate';

function latestPerAsset(investments: Investment[]): Investment[] {
  const map = new Map<string, Investment>();
  for (const inv of investments) {
    const key = inv.name.trim().toLowerCase();
    const cur = map.get(key);
    if (!cur || parseLocalDate(inv.date) > parseLocalDate(cur.date)) map.set(key, inv);
  }
  return Array.from(map.values());
}
function latestPerAssetBefore(investments: Investment[], before: Date): Investment[] {
  const map = new Map<string, Investment>();
  for (const inv of investments) {
    const d = parseLocalDate(inv.date);
    if (d >= before) continue;
    const key = inv.name.trim().toLowerCase();
    const cur = map.get(key);
    if (!cur || d > parseLocalDate(cur.date)) map.set(key, inv);
  }
  return Array.from(map.values());
}

function fmt(n: number, hide: boolean) {
  if (hide) return '••••';
  // Si n es null o undefined, usamos 0
  const value = n ?? 0; 
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2 });
}

export default function Investments() {
  const { data, addInvestment, updateInvestment, deleteInvestment } = useApp();
  const hide = data.settings.hideAmounts;

  const [modalOpen, setModalOpen]   = useState(false);
  const [modalMode, setModalMode]   = useState<ModalMode>('add');
  const [editing, setEditing]       = useState<Investment | null>(null);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm]             = useState<Omit<Investment, 'id'>>(EMPTY);
  const [page, setPage]             = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear]   = useState('');

  const chartRef      = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  const invTypes = data.categories.filter((c) => c.type === 'investment');
  const years    = Array.from(new Set(data.investments.map((i) => parseLocalDate(i.date).getFullYear()))).sort((a, b) => b - a);

  const now              = new Date();
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const currentPortfolio = useMemo(() => latestPerAsset(data.investments), [data.investments]);
  const prevPortfolio    = useMemo(() => latestPerAssetBefore(data.investments, firstOfThisMonth), [data.investments]);

  const totalInvested = currentPortfolio.reduce((s, i) => s + i.amountInvested, 0);
  const totalValue    = currentPortfolio.reduce((s, i) => s + i.value, 0);
  const totalGain     = totalValue - totalInvested;
  const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  const prevValue     = prevPortfolio.reduce((s, i) => s + i.value, 0);
  const momChange = (prevValue && prevValue > 0) 
  ? ((totalValue - prevValue) / prevValue) * 100 
  : 0;



  const isFiltered = !!(search || filterType || filterMonth || filterYear);

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

  const byType = useMemo(() => {
  return invTypes.map((t) => ({
    name: t.name,
    color: t.color,
    total: currentPortfolio
      .filter((i) => i.type === t.id)
      .reduce((s, i) => s + (i.value || 0), 0),
  })).filter((t) => t.total > 0);
}, [currentPortfolio, invTypes]);

useEffect(() => {
  if (!chartRef.current || byType.length === 0) {
    // Si no hay datos, destruimos el gráfico actual para que no quede basura visual
    chartInstance.current?.destroy();
    chartInstance.current = null;
    return;
  }

  const ctx = chartRef.current.getContext('2d');
  if (!ctx) return;

  chartInstance.current?.destroy();
  chartInstance.current = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: byType.map((t) => t.name),
      datasets: [{
        data: byType.map((t) => t.total || 0), // Asegurar que no sea NaN
        backgroundColor: byType.map((t) => t.color),
        borderWidth: 0,
        hoverOffset: 8
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Ayuda con el tamaño en móviles
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#64748b', padding: 10, font: { size: 11 } }
        }
      },
    },
  });

  return () => chartInstance.current?.destroy(); // Limpieza al desmontar
}, [byType]); // No es necesario el stringify si el array se genera con useMemo

  function openAdd() { setEditing(null); setModalMode('add'); setForm(EMPTY); setModalOpen(true); }
  function openEdit(i: Investment) {
    setEditing(i); setModalMode('edit');
    setForm({ name: i.name, type: i.type, amountInvested: i.amountInvested, value: i.value, date: i.date });
    setModalOpen(true);
  }
  function openDuplicate(i: Investment) {
    setEditing(null); setModalMode('duplicate');
    setForm({ name: i.name, type: i.type, amountInvested: i.amountInvested, value: i.value, date: TODAY });
    setModalOpen(true);
  }
  function handleSave() {
    if (!form.name || !form.amountInvested) return;
    if (modalMode === 'edit' && editing) updateInvestment({ ...form, id: editing.id });
    else addInvestment(form);
    setModalOpen(false);
  }
  function clearFilters() { setSearch(''); setFilterType(''); setFilterMonth(''); setFilterYear(''); setPage(1); }

  const modalTitle = modalMode === 'edit' ? 'Edit Investment' : modalMode === 'duplicate' ? 'Add from Selected' : 'Add Investment';

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <h2 className="page-title">Investments</h2>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> Add Investment</button>
      </div>

      {/* ── Summary cards ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {/* Invested */}
        <div className="card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>INVESTED</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent)' }}>{fmt(totalInvested, hide)}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 2 }}>{currentPortfolio.length} assets</div>
        </div>
        {/* Value */}
        <div className="card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>CURRENT VALUE</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>{fmt(totalValue, hide)}</div>
          {momChange !== null && (
            <div style={{ fontSize: '0.7rem', color: momChange >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              {momChange >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}% MoM
            </div>
          )}
        </div>
        {/* Gain */}
        <div className="card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>GAIN / LOSS</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {hide ? '••••' : `${totalGain >= 0 ? '+' : ''}${fmt(totalGain, false)}`}
          </div>
          <div style={{ fontSize: '0.7rem', color: totalGain >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
            {gainPct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {gainPct.toFixed(2)}% overall
          </div>
        </div>
      </div>

      {/* ── Chart + Current Portfolio — stack on mobile ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' }}>Portfolio Distribution</div>
          {byType.length === 0
            ? <EmptyState message="Add investments to see distribution" />
            : <canvas ref={chartRef} style={{ maxHeight: 220 }} />}
        </div>

        {/* Current Portfolio — card-list on mobile, table on desktop */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Current Portfolio</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)', marginLeft: '0.5rem' }}>latest per asset</span>
          </div>
          {currentPortfolio.length === 0 ? (
            <EmptyState message="No investments yet" />
          ) : (
            <>
              {/* Mobile: card rows */}
              <div className="inv-mobile-list">
                {currentPortfolio.map((inv) => {
                  const gain    = inv.value - inv.amountInvested;
                  const pct     = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
                  const typeCat = invTypes.find((t) => t.id === inv.type);
                  const prevSnap = latestPerAssetBefore(
                    data.investments.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase()),
                    firstOfThisMonth
                  )[0];
                  const assetMom = (prevSnap && prevSnap.value > 0) 
  ? ((inv.value - prevSnap.value) / prevSnap.value) * 100 
  : 0;
                  return (
                    <div key={inv.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Color dot */}
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeCat?.color || 'var(--text3)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 2 }}>
                          {typeCat?.name || '—'} · {inv.date}
                          {assetMom !== null && !hide && (
                            <span style={{ marginLeft: 6, color: assetMom >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              {assetMom >= 0 ? '▲' : '▼'}{Math.abs(assetMom).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fmt(inv.value, hide)}</div>
                        <div style={{ fontSize: '0.72rem', color: gain >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                          {hide ? '••' : `${gain >= 0 ? '+' : ''}${fmt(gain, false)} (${pct.toFixed(1)}%)`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: table (hidden on mobile via CSS) */}
              <div className="inv-desktop-table table-container">
                <table>
                  <thead><tr><th>Asset</th><th>Type</th><th>Invested</th><th>Value</th><th>Gain/Loss</th><th>Updated</th></tr></thead>
                  <tbody>
                    {currentPortfolio.map((inv) => {
                      const gain    = inv.value - inv.amountInvested;
                      const pct     = inv.amountInvested > 0 ? (gain / inv.amountInvested) * 100 : 0;
                      const typeCat = invTypes.find((t) => t.id === inv.type);
                      const prevSnap = latestPerAssetBefore(
                        data.investments.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase()),
                        firstOfThisMonth
                      )[0];
                      const assetMom = prevSnap ? ((inv.value - prevSnap.value) / prevSnap.value) * 100 : null;
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 600 }}>{inv.name}</td>
                          <td>{typeCat && <span className="chip" style={{ borderColor: typeCat.color, color: typeCat.color, background: `${typeCat.color}12` }}><span className="color-dot" style={{ background: typeCat.color }} />{typeCat.name}</span>}</td>
                          <td>{fmt(inv.amountInvested, hide)}</td>
                          <td style={{ fontWeight: 600 }}>
                            {fmt(inv.value, hide)}
                            {assetMom !== null && !hide && <span style={{ fontSize: '0.7rem', marginLeft: 4, color: assetMom >= 0 ? 'var(--success)' : 'var(--danger)' }}>{assetMom >= 0 ? '▲' : '▼'}{Math.abs(assetMom).toFixed(1)}%</span>}
                          </td>
                          <td style={{ color: gain >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            {hide ? '••' : `${gain >= 0 ? '+' : ''}${fmt(gain, false)}`}
                            <span style={{ fontSize: '0.72rem', marginLeft: 3, opacity: 0.8 }}>({pct.toFixed(1)}%)</span>
                          </td>
                          <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{inv.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── All Entries ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: showFilters ? '0.75rem' : 0 }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>All Entries</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="search-bar" style={{ minWidth: 140 }}>
                <Search size={13} />
                <input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <button className={`btn btn-sm ${showFilters || isFiltered ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setShowFilters((v) => !v)} style={{ position: 'relative', flexShrink: 0 }}>
                <SlidersHorizontal size={13} />
                {isFiltered && !showFilters && <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', border: '2px solid var(--bg)' }} />}
              </button>
              {isFiltered && <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Clear</button>}
            </div>
          </div>
          {showFilters && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <select className="input select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} style={{ flex: '1 1 100px', minWidth: 100, fontSize: '0.82rem' }}>
                <option value="">All Types</option>
                {invTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select className="input select" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }} style={{ flex: '1 1 90px', minWidth: 90, fontSize: '0.82rem' }}>
                <option value="">All Months</option>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select className="input select" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }} style={{ flex: '1 1 80px', minWidth: 80, fontSize: '0.82rem' }}>
                <option value="">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState message="No entries match the current filters." />
        ) : (
          <>
            {/* Mobile: card rows */}
            <div className="inv-mobile-list">
              {paginated.map((inv) => {
                const typeCat  = invTypes.find((t) => t.id === inv.type);
                const isLatest = currentPortfolio.some((c) => c.id === inv.id);
                const sameAsset = filtered.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase());
                const myIdx     = sameAsset.findIndex((i) => i.id === inv.id);
                const prevEntry = sameAsset[myIdx + 1];
                const delta     = prevEntry ? inv.value - prevEntry.value : null;
                const deltaPct  = prevEntry && prevEntry.value > 0 ? (delta! / prevEntry.value) * 100 : null;
                return (
                  <div key={inv.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{inv.name}</span>
                        {isLatest && <span style={{ fontSize: '0.6rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>LATEST</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>
                        {typeCat?.name || '—'} · {inv.date}
                        {delta !== null && !hide && (
                          <span style={{ marginLeft: 6, color: delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                           {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta), false)} {deltaPct !== null ? `(${deltaPct.toFixed(1)}%)` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fmt(inv.value, hide)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text3)' }}>inv: {fmt(inv.amountInvested, hide)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openDuplicate(inv)} title="Duplicate"><Copy size={12} /></button>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inv)} title="Edit"><Edit2 size={12} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inv.id)} title="Delete"><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="inv-desktop-table table-container">
              <table>
                <thead><tr><th>Name</th><th>Type</th><th>Invested</th><th>Value</th><th>vs Prev</th><th>Date</th><th></th></tr></thead>
                <tbody>
                  {paginated.map((inv) => {
                    const typeCat  = invTypes.find((t) => t.id === inv.type);
                    const isLatest = currentPortfolio.some((c) => c.id === inv.id);
                    const sameAsset = filtered.filter((i) => i.name.trim().toLowerCase() === inv.name.trim().toLowerCase());
                    const myIdx     = sameAsset.findIndex((i) => i.id === inv.id);
                    const prevEntry = sameAsset[myIdx + 1];
                    const delta     = prevEntry ? inv.value - prevEntry.value : null;
                    const deltaPct  = prevEntry && prevEntry.value > 0 ? (delta! / prevEntry.value) * 100 : null;
                    return (
                      <tr key={inv.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 500 }}>{inv.name}</span>
                            {isLatest && <span style={{ fontSize: '0.65rem', fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: 'var(--success)', padding: '0.1rem 0.4rem', borderRadius: 4 }}>LATEST</span>}
                          </div>
                        </td>
                        <td>{typeCat && <span className="chip" style={{ borderColor: typeCat.color, color: typeCat.color, background: `${typeCat.color}12` }}><span className="color-dot" style={{ background: typeCat.color }} />{typeCat.name}</span>}</td>
                        <td style={{ color: 'var(--text2)' }}>{fmt(inv.amountInvested, hide)}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(inv.value, hide)}</td>
                        <td>
                          {delta !== null && !hide
                            ? <span style={{ color: delta >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                                {delta >= 0 ? '▲' : '▼'} {fmt(Math.abs(delta), false)}
                               <span style={{ fontSize: '0.72rem', marginLeft: 3, opacity: 0.8 }}>
  ({deltaPct?.toFixed(1) ?? '0.0'}%)
</span>
                              </span>
                            : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.8rem' }}>{inv.date}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openDuplicate(inv)}><Copy size={13} /></button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(inv)}><Edit2 size={13} /></button>
                            <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inv.id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} onChange={setPage} />
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
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
            <Copy size={13} /> Copied — adjust and save as a new entry.
          </div>
        )}
        <div className="form-group">
          <label>Asset Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Apple Stock" />
          <p style={{ fontSize: '0.72rem', color: 'var(--text3)', margin: '0.3rem 0 0' }}>Use the same name each month to track over time.</p>
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
            <input className="input" type="number" inputMode="decimal" min={0} step={0.01} value={form.amountInvested || ''}
              onChange={(e) => {
                const val = +e.target.value;
                setForm((f) => ({ ...f, amountInvested: val, value: f.value === f.amountInvested || f.value === 0 ? val : f.value }));
              }} />
          </div>
          <div className="form-group">
            <label>Current Value ($)</label>
            <input className="input" type="number" inputMode="decimal" min={0} step={0.01} value={form.value || ''}
              onChange={(e) => setForm((f) => ({ ...f, value: +e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Date</label>
          <input className="input" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' }} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteInvestment(deleteId)}
        title="Delete Investment" message="Remove this investment entry?" />
    </div>
  );
}