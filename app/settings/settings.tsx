'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Download, Upload, Trash2, Info, Eye, EyeOff, Moon, Sun, Save, RefreshCw, CheckCircle, AlertCircle, CloudOff } from 'lucide-react';
import { useApp } from '../lib/context';
import { exportBackup, importBackup, loadFromGAS, clearData } from '../lib/storage';
import { DEFAULT_DATA } from '../constants';
import { ConfirmDialog, Toast } from '../../components/ui/page';


type SyncStatus = 'idle' | 'pushing' | 'pulling' | 'ok' | 'error';

export default function Settings() {
  const { data, updateSettings, setData, syncCloud, isSyncing, lastSynced } = useApp();

  // Local state for the URL input — synced from data.settings.gasApiUrl
  const [gasUrl, setGasUrl]   = useState(data.settings.gasApiUrl || '');
  const [urlDirty, setUrlDirty] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncError, setSyncError]   = useState('');
  const [clearConfirm, setClearConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep local URL in sync if data changes externally (e.g. pull from cloud)
  useEffect(() => {
    setGasUrl(data.settings.gasApiUrl || '');
  }, [data.settings.gasApiUrl]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  // ── URL save ────────────────────────────────────────────────────────────────
  function handleSaveUrl() {
    const trimmed = gasUrl.trim();
    updateSettings({ gasApiUrl: trimmed }); // persists to localStorage immediately
    setUrlDirty(false);
    showToast(trimmed ? '✓ API URL saved and persisted!' : 'API URL cleared.');
  }

  // Auto-save URL when user blurs the field (convenience)
  function handleUrlBlur() {
    if (urlDirty) handleSaveUrl();
  }

  // ── Push ────────────────────────────────────────────────────────────────────
  async function handlePush() {
    if (!data.settings.gasApiUrl) {
      showToast('Save the API URL first.');
      return;
    }
    setSyncStatus('pushing');
    setSyncError('');
    const ok = await syncCloud();
    setSyncStatus(ok ? 'ok' : 'error');
    if (ok) {
      showToast('✓ Data pushed to Google Drive!');
    } else {
      setSyncError('Push failed. Check your GAS URL and re-deploy the script.');
      showToast('Push failed. See details below.');
    }
  }

  // ── Pull ────────────────────────────────────────────────────────────────────
  async function handlePull() {
    const url = data.settings.gasApiUrl;
    if (!url) {
      showToast('Save the API URL first.');
      return;
    }
    setSyncStatus('pulling');
    setSyncError('');
    try {
      const loaded = await loadFromGAS(url);
      if (!loaded) {
        setSyncStatus('error');
        setSyncError('Drive file is empty or has never been synced. Push first, then pull.');
        showToast('Nothing to pull yet — push your data first.');
        return;
      }
      // Preserve the current gasApiUrl so we don't lose it after overwrite
      const merged = { ...loaded, settings: { ...loaded.settings, gasApiUrl: url } };
      setData(merged);
      setSyncStatus('ok');
      showToast('✓ Data pulled from Google Drive!');
    } catch (err: any) {
      setSyncStatus('error');
      const msg = err?.message || String(err);
      setSyncError(`Pull failed: ${msg}. Make sure the GAS script is deployed with "Anyone" access and CORS is enabled.`);
      showToast('Pull failed. See details below.');
    }
  }

  // ── Backup ──────────────────────────────────────────────────────────────────
  function handleExport() {
    exportBackup(data);
    showToast('Backup exported!');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importBackup(file);
      setData(imported);
      showToast('Backup imported successfully!');
    } catch {
      showToast('Failed to import — invalid backup file.');
    }
    e.target.value = '';
  }

  function handleClear() {
    clearData();
    setData(DEFAULT_DATA);
    showToast('All data cleared.');
  }

  // ── Status badge ─────────────────────────────────────────────────────────────
  function StatusBadge() {
    if (syncStatus === 'pushing' || syncStatus === 'pulling') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--accent)' }}>
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
          {syncStatus === 'pushing' ? 'Pushing…' : 'Pulling…'}
        </span>
      );
    }
    if (syncStatus === 'ok') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--success)' }}>
          <CheckCircle size={13} /> Synced {lastSynced ? lastSynced.toLocaleTimeString() : ''}
        </span>
      );
    }
    if (syncStatus === 'error') {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--danger)' }}>
          <AlertCircle size={13} /> Failed
        </span>
      );
    }
    if (data.settings.gasApiUrl) {
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--success)' }}>
          <Cloud size={13} /> Connected
        </span>
      );
    }
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: 'var(--text3)' }}>
        <CloudOff size={13} /> Not configured
      </span>
    );
  }

  return (
    <div>
      <h2 className="page-title" style={{ marginBottom: '1.5rem' }}>Settings</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 660 }}>

        {/* ── Display ─────────────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Display</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Hide Amounts</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>Blur all monetary values</div>
              </div>
              <button className="btn btn-secondary" onClick={() => updateSettings({ hideAmounts: !data.settings.hideAmounts })}>
                {data.settings.hideAmounts ? <><EyeOff size={14} /> Hidden</> : <><Eye size={14} /> Visible</>}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Theme</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>Toggle dark / light mode</div>
              </div>
              <button className="btn btn-secondary" onClick={() => {
                const next = data.settings.theme === 'light' ? 'dark' : 'light';
                updateSettings({ theme: next });
                document.documentElement.classList.toggle('dark', next === 'dark');
              }}>
                {data.settings.theme === 'dark' ? <><Sun size={14} /> Light</> : <><Moon size={14} /> Dark</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Google Apps Script ──────────────────────────────────────────── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Cloud size={18} style={{ color: 'var(--accent)' }} /> Google Drive Sync
            </h3>
            <StatusBadge />
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0 0 1rem', lineHeight: 1.6 }}>
            Paste your Google Apps Script Web App URL below. Data is encrypted with a private key before being saved to Google Drive, so only this app can read it.
          </p>

          {/* URL input */}
          <div className="form-group">
            <label>Web App URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                className="input"
                value={gasUrl}
                onChange={(e) => { setGasUrl(e.target.value); setUrlDirty(true); setSyncStatus('idle'); }}
                onBlur={handleUrlBlur}
                placeholder="https://script.google.com/macros/s/…/exec"
                style={{ flex: 1 }}
              />
              <button
                className={`btn ${urlDirty ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleSaveUrl}
                title="Save URL to local storage"
              >
                <Save size={14} /> Save
              </button>
            </div>
            {urlDirty && (
              <p style={{ fontSize: '0.75rem', color: 'var(--warning)', margin: '0.3rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={11} /> Unsaved changes — click Save or leave the field
              </p>
            )}
            {data.settings.gasApiUrl && !urlDirty && (
              <p style={{ fontSize: '0.75rem', color: 'var(--success)', margin: '0.3rem 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={11} /> URL saved in local storage ✓
              </p>
            )}
          </div>

          {/* Sync buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: syncError ? '0.75rem' : 0 }}>
            <button
              className="btn btn-primary"
              onClick={handlePush}
              disabled={!data.settings.gasApiUrl || syncStatus === 'pushing' || syncStatus === 'pulling'}
            >
              <Cloud size={14} />
              {syncStatus === 'pushing' ? 'Pushing…' : 'Push to Drive'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handlePull}
              disabled={!data.settings.gasApiUrl || syncStatus === 'pushing' || syncStatus === 'pulling'}
            >
              <Download size={14} />
              {syncStatus === 'pulling' ? 'Pulling…' : 'Pull from Drive'}
            </button>
          </div>

          {/* Error detail */}
          {syncError && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--danger)', lineHeight: 1.6 }}>
              <strong>Error:</strong> {syncError}
            </div>
          )}

          {/* Setup instructions */}
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ fontSize: '0.8rem', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
              How to set up Google Apps Script →
            </summary>
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--surface2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.8 }}>
              <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                <li>Go to <strong>script.google.com</strong> → New Project</li>
                <li>Paste the contents of <code>gas-backend/Code.gs</code> from this project</li>
                <li>Click <strong>Deploy → New Deployment</strong></li>
                <li>Type: <strong>Web App</strong></li>
                <li>Execute as: <strong>Me</strong></li>
                <li>Who has access: <strong>Anyone</strong> ← required for CORS</li>
                <li>Click Deploy → authorize → copy the <code>/exec</code> URL</li>
                <li>Paste the URL above and click <strong>Save</strong></li>
              </ol>
              <p style={{ margin: '0.5rem 0 0', color: 'var(--warning)' }}>
                ⚠ If you edit the script, always create a <strong>new deployment</strong> — updating an existing one does not take effect.
              </p>
            </div>
          </details>
        </div>

        {/* ── Backup ──────────────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>Backup & Restore</h3>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export Backup</button>
            <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /> Import Backup</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text2)', margin: '0.75rem 0 0' }}>
            Export saves all your data as plain JSON. Import restores from a previously exported file.
          </p>
        </div>

        {/* ── Danger Zone ─────────────────────────────────────────────────── */}
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: 'var(--danger)' }}>Danger Zone</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0 0 1rem' }}>
            These actions are irreversible. Export a backup first.
          </p>
          <button className="btn btn-danger" onClick={() => setClearConfirm(true)}>
            <Trash2 size={14} /> Clear All Data
          </button>
        </div>

        {/* ── About ───────────────────────────────────────────────────────── */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'DM Sans, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} /> About
          </h3>
          <div style={{ fontSize: '0.875rem', color: 'var(--text2)', lineHeight: 1.7 }}>
            <p style={{ margin: '0 0 0.25rem' }}><strong>FinTracker</strong> v1.0.0</p>
            <p style={{ margin: '0 0 0.25rem' }}>Personal finance tracker built with Next.js 14. Tracks transactions, investments, debts, subscriptions, reminders — all in one place.</p>
            <p style={{ margin: 0 }}>Data lives in your browser (localStorage). Cloud sync via Google Drive is optional and encrypted.</p>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.78rem', color: 'var(--text3)' }}>
            <span>📦 {data.transactions.length} transactions</span>
            <span>📈 {data.investments.length} investments</span>
            <span>💳 {data.cards.length} cards</span>
            <span>💼 {data.debts.length} debts</span>
            <span>🔄 {data.subscriptions.length} subscriptions</span>
            <span>🔔 {data.reminders.length} reminders</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        onConfirm={handleClear}
        title="Clear All Data"
        message="This will permanently delete ALL your financial data. This cannot be undone. Are you absolutely sure?"
      />

      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}